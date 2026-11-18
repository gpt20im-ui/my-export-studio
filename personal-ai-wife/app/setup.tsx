import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../src/state/AppState';
import { Screen } from '../src/components/Screen';
import { Avatar, Button, Chip, GlassCard, Header, SectionLabel } from '../src/components/ui';
import { AVATARS, colors, radius, spacing } from '../src/theme';
import type { LanguageSetting, Personality } from '../src/types';

const LANGUAGES: { id: LanguageSetting; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'english', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'hindi', label: 'हिन्दी' },
];

const PRESETS: { id: string; label: string; traits: Personality['traits'] }[] = [
  { id: 'romantic', label: 'Romantic', traits: { romantic: 4, caring: 3, playful: 2, supportive: 2 } },
  { id: 'caring', label: 'Caring', traits: { romantic: 2, caring: 4, playful: 1, supportive: 4 } },
  { id: 'playful', label: 'Playful', traits: { romantic: 2, caring: 2, playful: 4, supportive: 2 } },
  { id: 'balanced', label: 'Balanced', traits: { romantic: 3, caring: 4, playful: 2, supportive: 3 } },
];

export default function SetupScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const editing = mode === 'edit';
  const router = useRouter();
  const { data, setProfile, setPersonality } = useApp();
  const { profile, personality } = data;

  const [userName, setUserName] = useState(profile.userName);
  const [wifeName, setWifeName] = useState(profile.wifeName);
  const [avatarId, setAvatarId] = useState(profile.avatarId);
  const [language, setLanguage] = useState<LanguageSetting>(profile.language);
  const [preset, setPreset] = useState<string | null>(editing ? null : 'balanced');
  const [accepted, setAccepted] = useState(editing ? profile.acceptedAiNotice : false);
  const [submitted, setSubmitted] = useState(false);

  const userNameError = userName.trim().length < 2 ? 'Please enter your name (at least 2 letters).' : null;
  const wifeNameError = wifeName.trim().length < 2 ? 'Please give her a name (at least 2 letters).' : null;
  const acceptError = !accepted ? 'Please confirm that you understand she is an AI.' : null;
  const hasError = Boolean(userNameError || wifeNameError || acceptError);

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  };

  const save = () => {
    setSubmitted(true);
    if (hasError) return;
    setProfile({
      userName: userName.trim(),
      wifeName: wifeName.trim(),
      avatarId,
      language,
      acceptedAiNotice: true,
      onboarded: true,
    });
    const chosen = PRESETS.find((p) => p.id === preset);
    if (chosen) setPersonality({ ...personality, traits: chosen.traits });
    if (editing) goBack();
    else router.replace('/chat');
  };

  return (
    <Screen scroll>
      <Header
        title={editing ? 'Edit profile' : 'Set up your companion'}
        subtitle={editing ? undefined : 'Step 1 of 1 · takes a minute'}
        onBack={goBack}
      />

      <SectionLabel>About you</SectionLabel>
      <GlassCard>
        <Text style={styles.label}>Your name</Text>
        <TextInput
          value={userName}
          onChangeText={setUserName}
          placeholder="e.g. Ayush"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={30}
          autoCapitalize="words"
          accessibilityLabel="Your name"
        />
        {submitted && userNameError ? <Text style={styles.error}>{userNameError}</Text> : null}
      </GlassCard>

      <SectionLabel>Her</SectionLabel>
      <GlassCard>
        <Text style={styles.label}>Her name</Text>
        <TextInput
          value={wifeName}
          onChangeText={setWifeName}
          placeholder="e.g. Meera"
          placeholderTextColor={colors.textFaint}
          style={styles.input}
          maxLength={30}
          autoCapitalize="words"
          accessibilityLabel="Her name"
        />
        {submitted && wifeNameError ? <Text style={styles.error}>{wifeNameError}</Text> : null}

        <Text style={[styles.label, { marginTop: spacing.lg }]}>Pick her look</Text>
        <View style={styles.avatarRow}>
          {AVATARS.map((a) => {
            const selected = a.id === avatarId;
            return (
              <Pressable
                key={a.id}
                onPress={() => setAvatarId(a.id)}
                accessibilityRole="button"
                accessibilityLabel={`${a.label} avatar`}
                accessibilityState={{ selected }}
                style={[styles.avatarHit, selected && styles.avatarSelected]}
              >
                <Avatar avatarId={a.id} size={46} />
              </Pressable>
            );
          })}
        </View>
      </GlassCard>

      <SectionLabel>Language</SectionLabel>
      <GlassCard>
        <View style={styles.wrap}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l.id}
              label={l.label}
              selected={language === l.id}
              onPress={() => setLanguage(l.id)}
            />
          ))}
        </View>
        <Text style={styles.hint}>
          Auto-detect follows the language you write in. You can change this any time.
        </Text>
      </GlassCard>

      <SectionLabel>{editing ? 'Reset personality to a preset (optional)' : 'Her personality'}</SectionLabel>
      <GlassCard>
        <View style={styles.wrap}>
          {PRESETS.map((p) => (
            <Chip
              key={p.id}
              label={p.label}
              selected={preset === p.id}
              onPress={() => setPreset(preset === p.id ? null : p.id)}
            />
          ))}
        </View>
        <Text style={styles.hint}>Fine-tune every detail later in Personality settings.</Text>
      </GlassCard>

      <Pressable
        onPress={() => setAccepted(!accepted)}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: accepted }}
        style={styles.consent}
      >
        <LinearGradient
          colors={accepted ? ['#FF5D9E', '#B83AD6'] : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.08)']}
          style={styles.checkbox}
        >
          {accepted ? <Ionicons name="checkmark" size={16} color="#fff" /> : null}
        </LinearGradient>
        <Text style={styles.consentText}>
          I understand that my companion is an AI, not a real person, and that she only remembers
          things I agree to save.
        </Text>
      </Pressable>
      {submitted && acceptError ? <Text style={styles.error}>{acceptError}</Text> : null}

      <Button
        label={editing ? 'Save changes' : 'Meet her'}
        icon={editing ? 'checkmark' : 'heart'}
        onPress={save}
        style={{ marginTop: spacing.lg }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.textDim, fontSize: 13, fontWeight: '600', marginBottom: 8 },
  input: {
    color: colors.text,
    fontSize: 17,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  error: { color: colors.danger, fontSize: 13, marginTop: 8 },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: spacing.md, lineHeight: 18 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  avatarRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  avatarHit: { padding: 3, borderRadius: 30, borderWidth: 2, borderColor: 'transparent' },
  avatarSelected: { borderColor: colors.pink },
  consent: { flexDirection: 'row', gap: 12, alignItems: 'center', marginTop: spacing.lg },
  checkbox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  consentText: { flex: 1, color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
