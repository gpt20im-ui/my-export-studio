# Personal AI Wife

A romantic, caring **AI companion app for Android**. She chats in **English, हिन्दी and Hinglish**, remembers things only when you allow it, can send you messages at times you choose, and always says clearly that she is an AI and not a real person.

Package name: `com.personal.aiwife` · Built with React Native, Expo, TypeScript and Expo Router.

> **Status: first working prototype.** Everything on screen works and is saved on your phone, but the AI replies come from a built-in **mock AI** (simple rules, no internet needed). Real AI is prepared for later (see below). The code was written and checked without access to a phone or an Android build machine, so **the first APK build is the first real test**. If anything fails, copy the error to Claude and it will be fixed.

---

## 1. Get the app on your phone (no computer needed)

The APK is built automatically by GitHub, for free.

1. Open this repository on GitHub (phone browser or the GitHub app).
2. Tap **Actions** → **Build Personal AI Wife APK**.
3. It starts **by itself** whenever files in `personal-ai-wife/` change. To start it by hand, tap **Run workflow** → **Run workflow** (this button appears once the project is on the `main` branch).
4. Wait about **10 to 20 minutes** until you see a green tick.
5. Go to the repository's **Releases** section and open the newest release named **Personal AI Wife build N**.
6. Tap **PersonalAIWife.apk** to download it, then open the downloaded file.
7. Android may ask you to allow installing from your browser or file manager. Allow it for this one install.

Every new build makes a new release, so the newest number is always the latest version.

**If the build shows a red cross:** open the failed run, copy the red error lines and send them to Claude.
**If you see a yellow "TypeScript" warning:** the APK is still built, but send the warning to Claude so it can be fixed.

## 2. Using the app

| Screen | What it does |
| --- | --- |
| **Welcome** | Introduces the app and says clearly she is an AI companion. |
| **Profile setup** | Your name, her name, her look, language (Auto, English, Hinglish, हिन्दी), a personality preset, and a tick box confirming you understand she is an AI. |
| **Chat** | Bubbles with times, typing indicator, saved history, quick-start chips, and a "Remember this?" card when you share a preference. She may say hello first after a long break. |
| **Voice** | Record a voice message, play it back, and let your phone speak her replies out loud. |
| **Gallery** | Styled artwork cards she "imagines", plus photos you add from your phone. Favourites and delete. |
| **Memory** | See, add and delete what she remembers. A master switch turns memory off completely. |
| **Personality** | Four trait sliders (romantic, caring, playful, supportive), reply length, emojis, language, and a live preview. |
| **Notifications** | Morning, midday and night messages at times you pick, "she starts the chat" switch, and a test button. |
| **Settings** | Edit profile, links to the screens above, privacy note, and delete all data. |

Honest limits of the prototype:

- **Voice:** she cannot understand the words in a recording yet (speech-to-text needs a real service). She replies to the fact you sent a voice note.
- **Gallery art:** "Create art" makes a styled card on the phone. Real AI image generation comes later.
- **Voice notes and picked photos** live in your phone's temporary storage, so Android may clear them after a long time.
- **Replies** come from a rule-based mock, so conversations are simple. This is what the real AI will replace.

## 3. Privacy and safety

- Everything (chat, memories, settings) is stored **only on your phone**.
- **No API keys or secrets are in the app.** Never add any.
- She **never claims to be human**. Asking "are you real?" in any language gets an honest answer.
- She **only remembers with consent**: the app suggests a memory and nothing is saved until you tap **Save**.
- If a message sounds like a crisis (for example about ending one's life), she steps out of the romantic tone and points to emergency help (112 in India, Tele-MANAS 14416) instead.

## 4. Connecting a real AI later

A real AI key must stay on a **server you control**, never inside the app. The app is already ready for that:

1. Build a small backend (for example a Firebase Cloud Function) that holds your AI key.
2. Make it accept a `POST` with JSON like:
   ```json
   { "message": "...", "history": [{"role":"user","text":"..."}], "persona": {"wifeName":"...", "traits":{}}, "memories": ["Likes chai"] }
   ```
   and answer with `{ "reply": "text" }`.
3. Put the server address in `EXPO_PUBLIC_AI_BACKEND_URL` (copy `.env.example` to `.env`, and for cloud builds add a GitHub repository variable with the same name under Settings → Secrets and variables → Actions → Variables).
4. Rebuild. With the URL set, chat uses your server; errors show a Retry button.

The server should also add its own safety rules (honesty about being an AI, no pretending to be human, care around crisis topics).

## 5. Connecting Firebase later

Firebase is **prepared, not connected**, so the app works fully offline today.

1. Create a Firebase project and a web app, then copy its config values into `.env` (see `.env.example`). These are not secrets, but keep them out of git.
2. Add the package with `npm install firebase`.
3. Fill in `src/services/firebase.ts` (`cloudSync.backup` and `cloudSync.restore`). Add a button for it only once it works.

Never put Firebase admin keys or service-account files in this app.

## 6. Project map

```
personal-ai-wife/
  app/                 Screens (Expo Router)
    index.tsx            Welcome
    setup.tsx            Profile setup / edit profile
    personality.tsx      Personality settings
    notifications.tsx    Notification settings
    (tabs)/              Chat, Voice, Gallery, Memory, Settings
  src/
    ai/                  Mock AI engine, memory suggestions, provider (mock or your server)
    components/          Glass cards, buttons, chat bubbles, loading and error views
    services/            Notifications, Firebase placeholder
    state/               App data and saving
    storage/             Phone storage helper
    theme.ts             Colours (purple, black, pink, gold)
  app.json             App name, package name, permissions, plugins
  eas.json             Optional Expo cloud build profiles
```

The APK is built by `.github/workflows/personal-ai-wife-apk.yml` in the repository root.

## 7. For later, on a computer

```bash
cd personal-ai-wife
npm install
npx expo install --fix
npm run typecheck      # check TypeScript
npx expo start         # run with Expo
```

Optional: `eas build -p android --profile preview` builds an APK on Expo's servers (needs a free Expo account).

## 8. Troubleshooting

- **"App not installed":** uninstall any older copy of Personal AI Wife and install again.
- **No notifications:** open Notifications, switch on "Messages from her", allow the permission, and press the test button. Some phone brands also need "battery optimisation" turned off for the app.
- **No sound from her replies:** your phone needs a text-to-speech voice for the chosen language (Settings → Languages → Text-to-speech).
- **Microphone blocked:** allow it in your phone's app settings. The Voice screen has a button that opens them.
