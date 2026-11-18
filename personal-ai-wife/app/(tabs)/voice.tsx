import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioPlayer,
  useAudioPlayerStatus,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';
import { useApp } from '../../src/state/AppState';
import { Screen } from '../../src/components/Screen';
import {
  Body,
  Button,
  Chip,
  EmptyState,
  GlassCard,
  Header,
  InlineError,
  SectionLabel,
  SettingRow,
} from '../../src/components/ui';
import { generateVoiceReply } from '../../src/ai/engine';
import { colors, gradients, spacing } from '../../src/theme';
import type { Message } from '../../src/types';
import { errorMessage, formatDuration, formatTime, sleep, uid } from '../../src/utils';

type VoiceLang = 'hi-IN' | 'en-IN' | 'en-US';
const VOICE_LANGS: { id: VoiceLang; label: string }[] = [
  { id: 'hi-IN', label: 'हिन्दी' },
  { id: 'en-IN', label: 'English (India)' },
  { id: 'en-US', label: 'English (US)' },
];

export default function VoiceScreen() {
  const { data, addMessage } = useApp();
  const { profile, personality, messages } = data;

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const rec = useAudioRecorderState(recorder);
  const player = useAudioPlayer(null);
  const playerStatus = useAudioPlayerStatus(player);

  const [error, setError] = useState<string | null>(null);
  const [permDenied, setPermDenied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [replying, setReplying] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [voiceLang, setVoiceLang] = useState<VoiceLang>('hi-IN');
  const [speaking, setSpeaking] = useState(false);

  const mounted = useRef(true);
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      Speech.stop();
    };
  }, []);

  // Stop everything when the user leaves this tab.
  useFocusEffect(
    useCallback(() => {
      return () => {
        Speech.stop();
        setSpeaking(false);
        try {
          player.pause();
        } catch {
          // player may already be released
        }
        setPlayingId(null);
        if (recorder.isRecording) {
          recorder.stop().catch(() => {});
        }
      };
    }, [player, recorder]),
  );

  useEffect(() => {
    if (playerStatus.didJustFinish) setPlayingId(null);
  }, [playerStatus.didJustFinish]);

  useEffect(() => {
    if (!rec.isRecording) {
      pulse.setValue(0);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.in(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [rec.isRecording, pulse]);

  const speak = useCallback(
    (text: string) => {
      Speech.stop();
      Speech.speak(text, {
        language: voiceLang,
        rate: 0.95,
        pitch: 1.05,
        onStart: () => mounted.current && setSpeaking(true),
        onDone: () => mounted.current && setSpeaking(false),
        onStopped: () => mounted.current && setSpeaking(false),
        onError: () => {
          if (!mounted.current) return;
          setSpeaking(false);
          setError('Your phone could not speak this reply. Check that a text-to-speech voice is installed.');
        },
      });
    },
    [voiceLang],
  );

  const replyToVoice = useCallback(async () => {
    setReplying(true);
    try {
      await sleep(1300);
      if (!mounted.current) return;
      const text = generateVoiceReply({ profile, personality, memories: [], history: messages });
      addMessage({ id: uid(), role: 'wife', text, ts: Date.now(), kind: 'text' });
      if (speakReplies) speak(text);
    } finally {
      if (mounted.current) setReplying(false);
    }
  }, [addMessage, messages, personality, profile, speak, speakReplies]);

  const startRecording = async () => {
    setError(null);
    setBusy(true);
    try {
      const perm = await AudioModule.requestRecordingPermissionsAsync();
      if (!perm.granted) {
        setPermDenied(true);
        setError('Microphone permission is needed to record voice messages.');
        return;
      }
      setPermDenied(false);
      Speech.stop();
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
    } catch (e) {
      setError(errorMessage(e, 'Could not start recording.'));
    } finally {
      setBusy(false);
    }
  };

  const stopRecording = async () => {
    setBusy(true);
    try {
      const duration = rec.durationMillis;
      await recorder.stop();
      await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true });
      const uri = recorder.uri;
      if (!uri) throw new Error('The recording could not be saved.');
      if (duration < 800) {
        setError('That was too short. Hold on a little longer and try again.');
        return;
      }
      addMessage({
        id: uid(),
        role: 'user',
        text: 'Voice message',
        ts: Date.now(),
        kind: 'voice',
        voiceUri: uri,
        durationMs: duration,
      });
      setBusy(false);
      await replyToVoice();
    } catch (e) {
      setError(errorMessage(e, 'Could not finish the recording.'));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };

  const togglePlay = (m: Message) => {
    if (!m.voiceUri) return;
    setError(null);
    try {
      if (playingId === m.id && playerStatus.playing) {
        player.pause();
        setPlayingId(null);
        return;
      }
      player.replace({ uri: m.voiceUri });
      player.play();
      setPlayingId(m.id);
    } catch {
      setPlayingId(null);
      setError('This recording could not be played. The phone may have cleared it.');
    }
  };

  const lastWife = [...messages].reverse().find((m) => m.role === 'wife');
  const voiceNotes = messages.filter((m) => m.kind === 'voice').slice(-10).reverse();

  const ringScale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] });
  const ringOpacity = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] });

  return (
    <Screen scroll tab>
      <Header title="Voice" subtitle={`Send ${profile.wifeName} a voice message`} />

      <GlassCard style={{ alignItems: 'center', paddingVertical: spacing.xl }}>
        <View style={styles.micWrap}>
          {rec.isRecording ? (
            <Animated.View style={[styles.ring, { opacity: ringOpacity, transform: [{ scale: ringScale }] }]} />
          ) : null}
          <Pressable
            onPress={rec.isRecording ? stopRecording : startRecording}
            disabled={busy || replying}
            accessibilityRole="button"
            accessibilityLabel={rec.isRecording ? 'Stop and send recording' : 'Start recording'}
            style={({ pressed }) => [{ opacity: busy || replying ? 0.6 : pressed ? 0.85 : 1 }]}
          >
            <LinearGradient
              colors={rec.isRecording ? ['#FF6B81', '#C13AA8'] : gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.micBtn}
            >
              <Ionicons name={rec.isRecording ? 'stop' : 'mic'} size={42} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>
        <Text style={styles.timer}>{formatDuration(rec.isRecording ? rec.durationMillis : 0)}</Text>
        <Text style={styles.micHint}>
          {rec.isRecording
            ? 'Recording… tap to stop and send'
            : replying
              ? `${profile.wifeName} is replying…`
              : busy
                ? 'Please wait…'
                : 'Tap the microphone to start'}
        </Text>
      </GlassCard>

      {error ? (
        <View style={{ marginTop: spacing.md, gap: spacing.sm }}>
          <InlineError message={error} />
          {permDenied ? (
            <Button label="Open phone settings" variant="ghost" icon="settings-outline" onPress={() => Linking.openSettings()} />
          ) : null}
        </View>
      ) : null}

      <GlassCard style={{ marginTop: spacing.md }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <Ionicons name="information-circle" size={20} color={colors.goldSoft} />
          <Body style={{ flex: 1, fontSize: 13, lineHeight: 19 }}>
            Prototype note: speech-to-text is not connected yet, so she can't hear the words in your
            recording. She does reply, and her replies can be spoken out loud by your phone's voice.
          </Body>
        </View>
      </GlassCard>

      <SectionLabel>Her voice</SectionLabel>
      <GlassCard>
        <SettingRow
          icon="volume-high"
          title="Speak her replies aloud"
          subtitle="Uses your phone's text-to-speech"
          value={speakReplies}
          onValueChange={(v) => {
            setSpeakReplies(v);
            if (!v) {
              Speech.stop();
              setSpeaking(false);
            }
          }}
        />
        <View style={styles.chips}>
          {VOICE_LANGS.map((l) => (
            <Chip key={l.id} label={l.label} selected={voiceLang === l.id} onPress={() => setVoiceLang(l.id)} />
          ))}
        </View>
        {lastWife ? (
          <View style={{ marginTop: spacing.lg }}>
            <Text style={styles.lastLabel}>Her latest message</Text>
            <Text style={styles.lastText} numberOfLines={4}>
              {lastWife.text}
            </Text>
            <Button
              label={speaking ? 'Stop' : 'Hear her'}
              icon={speaking ? 'stop-circle' : 'volume-high'}
              variant="ghost"
              onPress={() => {
                if (speaking) {
                  Speech.stop();
                  setSpeaking(false);
                } else {
                  setError(null);
                  speak(lastWife.text);
                }
              }}
              style={{ marginTop: spacing.md }}
            />
          </View>
        ) : null}
      </GlassCard>

      <SectionLabel>Your voice messages</SectionLabel>
      {voiceNotes.length === 0 ? (
        <GlassCard>
          <EmptyState icon="mic-outline" title="No voice messages yet" text="Record your first message above. It will also appear in your chat." />
        </GlassCard>
      ) : (
        <GlassCard style={{ paddingVertical: spacing.sm }}>
          {voiceNotes.map((m, i) => {
            const active = playingId === m.id && playerStatus.playing;
            return (
              <Pressable
                key={m.id}
                onPress={() => togglePlay(m)}
                accessibilityRole="button"
                accessibilityLabel={active ? 'Pause voice message' : 'Play voice message'}
                style={[styles.noteRow, i > 0 && styles.noteBorder]}
              >
                <Ionicons name={active ? 'pause-circle' : 'play-circle'} size={34} color={colors.pink} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.noteTitle}>Voice message</Text>
                  <Text style={styles.noteSub}>
                    {formatTime(m.ts)} · {formatDuration(m.durationMs ?? 0)}
                  </Text>
                </View>
              </Pressable>
            );
          })}
        </GlassCard>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  micWrap: { width: 150, height: 150, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: colors.pink,
  },
  micBtn: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(232,193,112,0.8)',
  },
  timer: { color: colors.text, fontSize: 30, fontWeight: '700', marginTop: spacing.md, fontVariant: ['tabular-nums'] },
  micHint: { color: colors.textDim, fontSize: 14, marginTop: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: spacing.sm },
  lastLabel: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  lastText: { color: colors.text, fontSize: 15, lineHeight: 22, marginTop: 6 },
  noteRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  noteBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.glassBorder },
  noteTitle: { color: colors.text, fontSize: 15, fontWeight: '600' },
  noteSub: { color: colors.textFaint, fontSize: 12, marginTop: 2 },
});
