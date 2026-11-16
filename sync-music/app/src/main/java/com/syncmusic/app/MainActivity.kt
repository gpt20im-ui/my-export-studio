package com.syncmusic.app

import android.app.Activity
import android.content.Intent
import android.media.AudioAttributes
import android.media.MediaPlayer
import android.net.Uri
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.provider.OpenableColumns
import android.text.InputType
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.LinearLayout
import android.widget.SeekBar
import android.widget.TextView
import android.widget.Toast
import java.io.BufferedInputStream
import java.io.BufferedOutputStream
import java.io.DataInputStream
import java.io.DataOutputStream
import java.io.EOFException
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.net.Inet4Address
import java.net.InetSocketAddress
import java.net.NetworkInterface
import java.net.ServerSocket
import java.net.Socket
import java.util.Collections

/**
 * Sync Music: ek phone (Host) song chunta hai, baaki phones (Join) same Wi-Fi/hotspot par
 * connect hokar wahi song download karte hain aur Host ke play/pause/seek ke saath saath bajate hain.
 *
 * Protocol (TCP, port 8765):
 *  0 FILE  : UTF name, long length, bytes
 *  1 PLAY  : long positionMs
 *  2 PAUSE : long positionMs
 *  4 PING  : long t   (client -> host)
 *  5 PONG  : long t   (host -> client)
 */
class MainActivity : Activity() {

    private val port = 8765
    private val h = Handler(Looper.getMainLooper())

    @Volatile private var player: MediaPlayer? = null

    // ---- host state ----
    private var server: ServerSocket? = null
    private val clients = Collections.synchronizedList(mutableListOf<Conn>())
    @Volatile private var songFile: File? = null
    @Volatile private var songName = ""
    @Volatile private var songVer = 0
    @Volatile private var hostPlaying = false

    // ---- client state ----
    private var clientSock: Socket? = null
    private var clientFile: File? = null
    @Volatile private var rttMs = 0L
    @Volatile private var connGen = 0

    // ---- ui ----
    private var statusTv: TextView? = null
    private var seekBar: SeekBar? = null
    private var timeTv: TextView? = null
    private var playBtn: Button? = null
    private var dragging = false
    private var onHome = true

    inner class Conn(val s: Socket) {
        val out = DataOutputStream(BufferedOutputStream(s.getOutputStream(), 65536))

        @Synchronized
        fun send(block: (DataOutputStream) -> Unit) {
            try {
                block(out)
                out.flush()
            } catch (e: Exception) {
                close()
            }
        }

        fun close() {
            try { s.close() } catch (_: Exception) {}
            clients.remove(this)
            refreshStatus()
        }
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        showHome()
        h.post(ticker)
    }

    override fun onDestroy() {
        stopAll()
        h.removeCallbacksAndMessages(null)
        super.onDestroy()
    }

    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        if (!onHome) showHome() else super.onBackPressed()
    }

    // ------------------------------------------------------------------ helpers

    private fun ui(r: () -> Unit) {
        h.post(Runnable { r() })
    }

    private fun dp(v: Int): Int = (v * resources.displayMetrics.density).toInt()

    private fun column(): LinearLayout = LinearLayout(this).apply {
        orientation = LinearLayout.VERTICAL
        setPadding(dp(20), dp(40), dp(20), dp(20))
    }

    private fun tv(t: String, size: Float = 16f): TextView = TextView(this).apply {
        text = t
        textSize = size
        setPadding(0, dp(8), 0, dp(8))
    }

    private fun btn(t: String, onClick: () -> Unit): Button = Button(this).apply {
        text = t
        setOnClickListener { onClick() }
    }

    private fun fmt(ms: Int): String = "%d:%02d".format(ms / 60000, (ms / 1000) % 60)

    private fun newPlayer(path: String): MediaPlayer = MediaPlayer().apply {
        setAudioAttributes(
            AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_MUSIC)
                .setUsage(AudioAttributes.USAGE_MEDIA)
                .build()
        )
        setDataSource(path)
        prepare()
    }

    private fun localIps(): List<String> = try {
        Collections.list(NetworkInterface.getNetworkInterfaces())
            .filter { it.isUp && !it.isLoopback }
            .flatMap { Collections.list(it.inetAddresses) }
            .filter { it is Inet4Address && it.isSiteLocalAddress }
            .map { it.hostAddress ?: "" }
            .filter { it.isNotEmpty() }
    } catch (e: Exception) {
        emptyList()
    }

    private val ticker = object : Runnable {
        override fun run() {
            try {
                val p = player
                val sb = seekBar
                if (p != null && sb != null) {
                    val d = p.duration
                    val c = p.currentPosition
                    if (d > 0) {
                        sb.max = d
                        if (!dragging) sb.progress = c
                        timeTv?.text = fmt(c) + " / " + fmt(d)
                    }
                }
            } catch (_: Exception) {
            }
            h.postDelayed(this, 500)
        }
    }

    private fun stopAll() {
        val ss = server
        server = null
        try { ss?.close() } catch (_: Exception) {}
        val cs = clientSock
        clientSock = null
        try { cs?.close() } catch (_: Exception) {}
        synchronized(clients) { clients.toList() }.forEach { try { it.s.close() } catch (_: Exception) {} }
        clients.clear()
        try { player?.release() } catch (_: Exception) {}
        player = null
        hostPlaying = false
        songFile = null
        songName = ""
        songVer++
        rttMs = 0
        connGen++
        seekBar = null
        timeTv = null
        playBtn = null
        statusTv = null
    }

    // ------------------------------------------------------------------ screens

    private fun showHome() {
        stopAll()
        onHome = true
        val col = column()
        col.addView(tv("Sync Music", 30f))
        col.addView(tv("Ek phone se song chalao, sab phones par saath mein bajega. Sab phones ek hi Wi-Fi ya hotspot par hone chahiye."))
        col.addView(btn("HOST: main song chalaunga") { hostScreen() })
        col.addView(btn("JOIN: mujhe sunna hai") { joinScreen() })
        setContentView(col)
    }

    private fun hostScreen() {
        stopAll()
        onHome = false
        val ips = localIps()
        val col = column()
        col.addView(tv("HOST", 26f))
        col.addView(
            tv(
                if (ips.isEmpty()) "IP nahi mila. Wi-Fi ya hotspot on karo, phir Back karke dobara aao."
                else "Dusre phones mein ye IP daalo:\n" + ips.joinToString("\n"),
                20f
            )
        )
        val st = tv("Server chalu ho raha hai...")
        statusTv = st
        col.addView(st)
        col.addView(btn("Song chuno") { pickSong() })
        val pb = btn("Play") { togglePlay() }
        playBtn = pb
        col.addView(pb)
        val sb = SeekBar(this)
        sb.setOnSeekBarChangeListener(object : SeekBar.OnSeekBarChangeListener {
            override fun onProgressChanged(s: SeekBar?, p: Int, fromUser: Boolean) {}
            override fun onStartTrackingTouch(s: SeekBar?) {
                dragging = true
            }

            override fun onStopTrackingTouch(s: SeekBar?) {
                dragging = false
                val pl = player
                if (pl != null && s != null) {
                    try { pl.seekTo(s.progress) } catch (_: Exception) {}
                    broadcastState()
                }
            }
        })
        seekBar = sb
        col.addView(sb)
        val tt = tv("0:00 / 0:00")
        timeTv = tt
        col.addView(tt)
        col.addView(btn("Back") { showHome() })
        setContentView(col)
        startServer()
    }

    private fun joinScreen() {
        stopAll()
        onHome = false
        val col = column()
        col.addView(tv("JOIN", 26f))
        col.addView(tv("Host phone par jo IP dikh raha hai wo yahan daalo:"))
        val prefs = getSharedPreferences("sync", MODE_PRIVATE)
        val ipInput = EditText(this).apply {
            hint = "jaise 192.168.43.1"
            inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_VARIATION_URI
            setText(prefs.getString("ip", ""))
        }
        col.addView(ipInput)
        val st = tv("")
        statusTv = st
        col.addView(btn("Connect") {
            val ip = ipInput.text.toString().trim()
            if (!Regex("""\d{1,3}(\.\d{1,3}){3}""").matches(ip)) {
                Toast.makeText(this, "IP galat hai. Aisa daalo: 192.168.43.1", Toast.LENGTH_LONG).show()
            } else {
                prefs.edit().putString("ip", ip).apply()
                connect(ip)
            }
        })
        col.addView(st)
        val sb = SeekBar(this)
        sb.isEnabled = false
        seekBar = sb
        col.addView(sb)
        val tt = tv("0:00 / 0:00")
        timeTv = tt
        col.addView(tt)
        col.addView(btn("Back") { showHome() })
        setContentView(col)
    }

    // ------------------------------------------------------------------ host logic

    private fun refreshStatus() {
        ui {
            statusTv?.text = (if (songName.isEmpty()) "Song nahi chuna" else "Song: $songName") +
                "\nConnected phones: " + clients.size
        }
    }

    private fun startServer() {
        Thread {
            var ss: ServerSocket? = null
            try {
                ss = ServerSocket(port)
                server = ss
                refreshStatus()
                while (true) {
                    val s = ss.accept()
                    s.tcpNoDelay = true
                    val c = Conn(s)
                    clients.add(c)
                    refreshStatus()
                    Thread { serveClient(c) }.start()
                }
            } catch (e: Exception) {
                if (server === ss) ui { statusTv?.text = "Server error: " + e.message }
            }
        }.start()
    }

    private fun serveClient(c: Conn) {
        try {
            if (songFile != null) {
                sendSong(c, songVer)
                sendState(c)
            }
            val inp = DataInputStream(BufferedInputStream(c.s.getInputStream()))
            while (true) {
                val t = inp.readByte().toInt()
                if (t == 4) {
                    val v = inp.readLong()
                    c.send {
                        it.writeByte(5)
                        it.writeLong(v)
                    }
                }
            }
        } catch (_: Exception) {
        } finally {
            c.close()
        }
    }

    private fun sendSong(c: Conn, ver: Int) {
        c.send { out ->
            val f = songFile
            if (f != null && ver == songVer) {
                out.writeByte(0)
                out.writeUTF(songName)
                out.writeLong(f.length())
                FileInputStream(f).use { it.copyTo(out, 65536) }
            }
        }
    }

    private fun sendState(c: Conn) {
        c.send { out ->
            val p = player
            if (p != null && songFile != null) {
                val pos = try { p.currentPosition } catch (_: Exception) { 0 }
                out.writeByte(if (hostPlaying) 1 else 2)
                out.writeLong(pos.toLong())
            }
        }
    }

    private fun broadcastState() {
        synchronized(clients) { clients.toList() }.forEach { c -> Thread { sendState(c) }.start() }
    }

    private fun pickSong() {
        val i = Intent(Intent.ACTION_GET_CONTENT).apply {
            type = "audio/*"
            addCategory(Intent.CATEGORY_OPENABLE)
        }
        startActivityForResult(i, 1)
    }

    @Deprecated("Deprecated in Java")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        super.onActivityResult(requestCode, resultCode, data)
        val uri = data?.data
        if (requestCode == 1 && resultCode == RESULT_OK && uri != null) loadSong(uri)
    }

    private fun togglePlay() {
        val p = player
        if (p == null) {
            Toast.makeText(this, "Pehle song chuno", Toast.LENGTH_SHORT).show()
            return
        }
        try {
            if (hostPlaying) {
                p.pause()
                hostPlaying = false
            } else {
                p.start()
                hostPlaying = true
            }
        } catch (_: Exception) {
        }
        playBtn?.text = if (hostPlaying) "Pause" else "Play"
        broadcastState()
    }

    private fun loadSong(uri: Uri) {
        statusTv?.text = "Song load ho raha hai..."
        Thread {
            try {
                var name = "song"
                contentResolver.query(uri, null, null, null, null)?.use { c ->
                    val i = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (i >= 0 && c.moveToFirst()) name = c.getString(i) ?: name
                }
                val f = File(cacheDir, "host_" + System.currentTimeMillis() + ".audio")
                contentResolver.openInputStream(uri)!!.use { ins ->
                    FileOutputStream(f).use { ins.copyTo(it) }
                }
                val old = songFile
                val np = newPlayer(f.path)
                np.setOnErrorListener { _, what, extra ->
                    ui { statusTv?.text = "Player error: $what / $extra" }
                    true
                }
                np.setOnCompletionListener {
                    hostPlaying = false
                    ui { playBtn?.text = "Play" }
                    broadcastState()
                }
                try { player?.release() } catch (_: Exception) {}
                player = np
                hostPlaying = false
                songName = name
                songFile = f
                songVer++
                val v = songVer
                try { old?.delete() } catch (_: Exception) {}
                ui { playBtn?.text = "Play" }
                refreshStatus()
                synchronized(clients) { clients.toList() }.forEach { c ->
                    Thread {
                        sendSong(c, v)
                        sendState(c)
                    }.start()
                }
            } catch (e: Exception) {
                ui { statusTv?.text = "Song load fail: " + e.message }
            }
        }.start()
    }

    // ------------------------------------------------------------------ client logic

    private fun connect(ip: String) {
        statusTv?.text = "Connect ho raha hai..."
        val gen = ++connGen
        val oldSock = clientSock
        clientSock = null
        try { oldSock?.close() } catch (_: Exception) {}
        try { player?.release() } catch (_: Exception) {}
        player = null
        Thread {
            var s: Socket? = null
            try {
                s = Socket()
                s.tcpNoDelay = true
                s.connect(InetSocketAddress(ip, port), 5000)
                if (gen != connGen) {
                    s.close()
                    return@Thread
                }
                clientSock = s
                ui { statusTv?.text = "Connected. Host ke song ka wait..." }
                val inp = DataInputStream(BufferedInputStream(s.getInputStream(), 65536))
                val out = DataOutputStream(BufferedOutputStream(s.getOutputStream()))
                rttMs = 0
                var pinging = false
                while (gen == connGen) {
                    when (inp.readByte().toInt()) {
                        0 -> {
                            receiveSong(inp, gen)
                            if (!pinging) {
                                pinging = true
                                val sock = s
                                Thread {
                                    try {
                                        repeat(5) {
                                            synchronized(out) {
                                                out.writeByte(4)
                                                out.writeLong(System.nanoTime())
                                                out.flush()
                                            }
                                            Thread.sleep(100)
                                        }
                                    } catch (_: Exception) {
                                        try { sock.close() } catch (_: Exception) {}
                                    }
                                }.start()
                            }
                        }
                        1 -> {
                            val pos = inp.readLong()
                            startAt(pos)
                        }
                        2 -> {
                            val pos = inp.readLong()
                            try {
                                player?.pause()
                                player?.seekTo(pos.toInt())
                            } catch (_: Exception) {
                            }
                            ui { statusTv?.text = "Paused" }
                        }
                        5 -> {
                            val t = inp.readLong()
                            val r = (System.nanoTime() - t) / 1_000_000
                            if (rttMs == 0L || r < rttMs) rttMs = r
                        }
                    }
                }
            } catch (e: Exception) {
                if (gen == connGen) ui { statusTv?.text = "Disconnect: " + e.message }
            }
        }.start()
    }

    private fun receiveSong(inp: DataInputStream, gen: Int) {
        val name = inp.readUTF()
        val len = inp.readLong()
        val f = File(cacheDir, "client_" + System.currentTimeMillis() + ".audio")
        FileOutputStream(f).use { fo ->
            val buf = ByteArray(65536)
            var left = len
            var lastPct = -1
            while (left > 0) {
                val n = inp.read(buf, 0, minOf(buf.size.toLong(), left).toInt())
                if (n < 0) throw EOFException()
                fo.write(buf, 0, n)
                left -= n
                val pct = if (len > 0) (((len - left) * 100) / len).toInt() else 100
                if (pct != lastPct) {
                    lastPct = pct
                    ui { statusTv?.text = "Song aa raha hai: $pct%" }
                }
            }
        }
        if (gen != connGen) {
            try { f.delete() } catch (_: Exception) {}
            return
        }
        val np = newPlayer(f.path)
        np.setOnErrorListener { _, what, extra ->
            ui { statusTv?.text = "Player error: $what / $extra" }
            true
        }
        np.setOnCompletionListener { ui { statusTv?.text = "Song khatam" } }
        try { player?.release() } catch (_: Exception) {}
        player = np
        val oldFile = clientFile
        clientFile = f
        try { oldFile?.delete() } catch (_: Exception) {}
        ui { statusTv?.text = "Ready: $name\nHost ke Play ka wait..." }
    }

    private fun startAt(pos: Long) {
        val p = player ?: return
        try {
            val target = (pos + rttMs / 2).toInt()
            val drift = Math.abs(p.currentPosition - target)
            if (!p.isPlaying || drift > 50) p.seekTo(target)
            if (!p.isPlaying) p.start()
            ui { statusTv?.text = "Playing (sync, delay ~" + rttMs + "ms)" }
        } catch (_: Exception) {
        }
    }
}
