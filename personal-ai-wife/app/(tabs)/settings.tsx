import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useApp } from '../../src/state/AppState';
import { Screen } from '../../src/components/Screen';
import {
  Avatar,
  Body,
  Divider,
  GlassCard,
  Header,
  InlineError,
  SectionLabel,
  SettingRow,
} from '../../src/components/ui';
import { cancelAll } from '../../src/services/notifications';
import { colors, spacing } from '../../src/theme';
import { errorMessage } from '../../src/utils';

const LANGUAGE_LABEL = {
  auto: 'Auto-detect',
  english: 'English',
  hinglish: 'Hinglish',
  hindi: 'हिन्दी',
} as const;

export default function SettingsScreen() {
  const router = useRouter();
  const { data, saveError, resetAll } = useApp();
  const { profile, memories, notifications } = data;
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const confirmReset = () => {
    Alert.alert(
      'Delete all data?',
      'This removes your profile, chat, memories, gallery and settings from this phone. It cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete everything',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            setResetError(null);
            try {
              await cancelAll().catch(() => {});
              await resetAll();
              router.replace('/');
            } catch (e) {
              setResetError(errorMessage(e, 'Could not delete the data.'));
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll tab>
      <Header title="Settings" />

      {saveError ? (
        <View style={{ marginBottom: spacing.md }}>
          <InlineError message={`${saveError} Your latest changes may not be stored.`} />
        </View>
      ) : null}

      <GlassCard>
        <View style={styles.profileRow}>
          <Avatar avatarId={profile.avatarId} size={60} />
          <View style={{ flex: 1 }}>
            <Text style={styles.profileName}>{profile.wifeName}</Text>
            <Text style={styles.profileSub}>
              Your AI companion · talking with {profile.userName || 'you'}
            </Text>
            <Text style={styles.profileSub}>Language: {LANGUAGE_LABEL[profile.language]}</Text>
          </View>
        </View>
        <Divider />
        <SettingRow
          icon="person-circle"
          title="Edit profile"
          subtitle="Names, look and language"
          onPress={() => router.push({ pathname: '/setup', params: { mode: 'edit' } })}
        />
      </GlassCard>

      <SectionLabel>Her</SectionLabel>
      <GlassCard style={{ paddingVertical: spacing.sm }}>
        <SettingRow
          icon="color-wand"
          title="Personality"
          subtitle="Romantic, caring, playful, supportive"
          onPress={() => router.push('/personality')}
        />
        <Divider />
        <SettingRow
          icon="notifications"
          title="Notifications"
          subtitle={notifications.enabled ? 'On · she can message you' : 'Off'}
          onPress={() => router.push('/notifications')}
        />
        <Divider />
        <SettingRow
          icon="bookmarks"
          title="Memory"
          subtitle={`${memories.length} saved · stays on this phone`}
          onPress={() => router.navigate('/memory')}
        />
      </GlassCard>

      <SectionLabel>Privacy & about</SectionLabel>
      <GlassCard>
        <Body style={{ fontSize: 14, lineHeight: 21 }}>
          {profile.wifeName} is an AI companion, never a real person, and she will always say so if you
          ask. Everything you share is stored only on this phone. This prototype uses a built-in mock AI,
          so no messages are sent anywhere and the app contains no API keys.
        </Body>
        <Text style={styles.version}>Personal AI Wife · version 1.0.0 · com.personal.aiwife</Text>
      </GlassCard>

      <SectionLabel>Danger zone</SectionLabel>
      <GlassCard style={{ paddingVertical: spacing.sm }}>
        <SettingRow
          icon="trash"
          title={resetting ? 'Deleting…' : 'Delete all data'}
          subtitle="Start again from the welcome screen"
          danger
          onPress={resetting ? undefined : confirmReset}
        />
      </GlassCard>
      {resetError ? (
        <View style={{ marginTop: spacing.md }}>
          <InlineError message={resetError} />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingBottom: spacing.md },
  profileName: { color: colors.text, fontSize: 22, fontWeight: '700' },
  profileSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  version: { color: colors.textFaint, fontSize: 12, marginTop: spacing.md },
});
