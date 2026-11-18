import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../src/state/AppState';
import { Screen } from '../src/components/Screen';
import {
  Body,
  Button,
  Chip,
  GlassCard,
  Header,
  LevelSelector,
  SectionLabel,
  SettingRow,
} from '../src/components/ui';
import { generateMockReply } from '../src/ai/engine';
import { colors, spacing, type IconName } from '../src/theme';
import type { Lang, LanguageSetting, ReplyLength, TraitKey } from '../src/types';

const TRAITS: { key: TraitKey; label: string; hint: string; icon: IconName }[] = [
  { key: 'romantic', label: 'Romantic', hint: 'Sweet, affectionate words', icon: 'heart' },
  { key: 'caring', label: 'Caring', hint: 'Checks on your food, rest and mood', icon: 'medkit' },
  { key: 'playful', label: 'Playful', hint: 'Teasing and light humour', icon: 'happy' },
  { key: 'supportive', label: 'Supportive', hint: 'Encouragement and motivation', icon: 'trophy' },
];

const LENGTHS: { id: ReplyLength; label: string }[] = [
  { id: 'short', label: 'Short' },
  { id: 'medium', label: 'Medium' },
  { id: 'long', label: 'Long' },
];

const LANGUAGES: { id: LanguageSetting; label: string }[] = [
  { id: 'auto', label: 'Auto-detect' },
  { id: 'english', label: 'English' },
  { id: 'hinglish', label: 'Hinglish' },
  { id: 'hindi', label: 'हिन्दी' },
];

const SAMPLE: Record<Lang, string> = {
  english: 'I am so tired after work today',
  hinglish: 'Aaj kaam ke baad bahut thak gaya hoon',
  hindi: 'आज काम के बाद बहुत थक गया हूँ',
};

const LEVEL_WORDS = ['Off', 'Light', 'Medium', 'Strong', 'Very strong'];

export default function PersonalityScreen() {
  const router = useRouter();
  const { data, setPersonality, setProfile } = useApp();
  const { personality, profile } = data;
  const [seed, setSeed] = useState(0);

  const previewLang: Lang = profile.language === 'auto' ? 'english' : profile.language;
  const sample = SAMPLE[previewLang];

  const preview = useMemo(
    () =>
      generateMockReply({
        text: sample,
        profile,
        personality,
        memories: [],
        history: [],
      }),
    // `seed` makes the "another example" button produce a fresh random reply.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sample, profile, personality, seed],
  );

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  return (
    <Screen scroll>
      <Header title="Personality" subtitle={`How ${profile.wifeName} talks to you`} onBack={goBack} />

      <SectionLabel>Traits</SectionLabel>
      <GlassCard>
        {TRAITS.map((t, i) => (
          <View key={t.key} style={i > 0 && { marginTop: spacing.lg }}>
            <View style={styles.traitHead}>
              <Text style={styles.traitLabel}>{t.label}</Text>
              <Text style={styles.traitValue}>{LEVEL_WORDS[personality.traits[t.key]]}</Text>
            </View>
            <Text style={styles.traitHint}>{t.hint}</Text>
            <View style={{ flexDirection: 'row' }}>
              <LevelSelector
                value={personality.traits[t.key]}
                onChange={(v) =>
                  setPersonality({ ...personality, traits: { ...personality.traits, [t.key]: v } })
                }
              />
            </View>
          </View>
        ))}
      </GlassCard>

      <SectionLabel>Reply length</SectionLabel>
      <GlassCard>
        <View style={styles.wrap}>
          {LENGTHS.map((l) => (
            <Chip
              key={l.id}
              label={l.label}
              selected={personality.replyLength === l.id}
              onPress={() => setPersonality({ ...personality, replyLength: l.id })}
            />
          ))}
        </View>
        <SettingRow
          icon="happy-outline"
          title="Use emojis"
          value={personality.useEmojis}
          onValueChange={(v) => setPersonality({ ...personality, useEmojis: v })}
        />
      </GlassCard>

      <SectionLabel>Language</SectionLabel>
      <GlassCard>
        <View style={styles.wrap}>
          {LANGUAGES.map((l) => (
            <Chip
              key={l.id}
              label={l.label}
              selected={profile.language === l.id}
              onPress={() => setProfile({ language: l.id })}
            />
          ))}
        </View>
      </GlassCard>

      <SectionLabel>Live preview</SectionLabel>
      <GlassCard>
        <Text style={styles.sampleLabel}>If you said</Text>
        <Text style={styles.sample}>“{sample}”</Text>
        <Text style={[styles.sampleLabel, { marginTop: spacing.md }]}>{profile.wifeName} might reply</Text>
        <Text style={styles.reply}>{preview}</Text>
        <Button
          label="Another example"
          icon="refresh"
          variant="ghost"
          onPress={() => setSeed((s) => s + 1)}
          style={{ marginTop: spacing.md }}
        />
      </GlassCard>
      <Body style={{ fontSize: 12, marginTop: spacing.md }}>
        Changes are saved automatically. She never pretends to be a real human, whatever the settings.
      </Body>
    </Screen>
  );
}

const styles = StyleSheet.create({
  traitHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  traitLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  traitValue: { color: colors.gold, fontSize: 13, fontWeight: '700' },
  traitHint: { color: colors.textFaint, fontSize: 12, marginTop: 2, marginBottom: 2 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  sampleLabel: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  sample: { color: colors.textDim, fontSize: 15, marginTop: 4, fontStyle: 'italic' },
  reply: { color: colors.text, fontSize: 16, lineHeight: 24, marginTop: 4 },
});
