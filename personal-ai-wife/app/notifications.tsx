import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../src/state/AppState';
import { Screen } from '../src/components/Screen';
import {
  Body,
  Button,
  Divider,
  GlassCard,
  Header,
  InlineError,
  LoadingView,
  SectionLabel,
  SettingRow,
} from '../src/components/ui';
import { notificationLanguage } from '../src/ai/engine';
import {
  getPermissionState,
  requestPermission,
  sendTest,
  syncSchedule,
  type PermissionState,
} from '../src/services/notifications';
import { colors, radius, spacing } from '../src/theme';
import type { NotificationSettings, TimeSlot } from '../src/types';
import { errorMessage, formatClock } from '../src/utils';

type SlotKey = 'morning' | 'midday' | 'night';

const SLOTS: { key: SlotKey; label: string; hint: string }[] = [
  { key: 'morning', label: 'Good morning', hint: 'A sweet start to your day' },
  { key: 'midday', label: 'Midday check-in', hint: 'Lunch and a little break' },
  { key: 'night', label: 'Good night', hint: 'Wind down before sleep' },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const { data, setNotifications } = useApp();
  const { notifications, profile, messages } = data;

  const [permission, setPermission] = useState<PermissionState | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const chain = useRef<Promise<void>>(Promise.resolve());

  const lang = notificationLanguage(profile.language, messages);

  useEffect(() => {
    let alive = true;
    getPermissionState()
      .then((p) => alive && setPermission(p))
      .catch((e) => {
        if (!alive) return;
        setPermission('undetermined');
        setError(errorMessage(e, 'Could not check notification permission.'));
      });
    return () => {
      alive = false;
    };
  }, []);

  const apply = useCallback(
    (next: NotificationSettings) => {
      setNotifications(next);
      setError(null);
      setInfo(null);
      // Run schedule updates one after another so quick taps cannot overlap.
      chain.current = chain.current.then(async () => {
        setBusy(true);
        try {
          await syncSchedule(next, profile, lang);
        } catch (e) {
          setError(errorMessage(e, 'Could not update the reminders.'));
        } finally {
          setBusy(false);
        }
      });
    },
    [lang, profile, setNotifications],
  );

  const toggleMaster = async (on: boolean) => {
    if (!on) {
      apply({ ...notifications, enabled: false });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const p = await requestPermission();
      setPermission(p);
      if (p !== 'granted') {
        setError('Notifications are blocked for this app. Allow them in your phone settings to get messages from her.');
        return;
      }
      apply({ ...notifications, enabled: true });
    } catch (e) {
      setError(errorMessage(e, 'Could not turn on notifications.'));
    } finally {
      setBusy(false);
    }
  };

  const updateSlot = (key: SlotKey, patch: Partial<TimeSlot>) => {
    apply({ ...notifications, [key]: { ...notifications[key], ...patch } });
  };

  const shiftTime = (key: SlotKey, deltaMinutes: number) => {
    const s = notifications[key];
    const total = (s.hour * 60 + s.minute + deltaMinutes + 1440) % 1440;
    updateSlot(key, { hour: Math.floor(total / 60), minute: total % 60 });
  };

  const test = async () => {
    setError(null);
    setInfo(null);
    setBusy(true);
    try {
      const p = await requestPermission();
      setPermission(p);
      if (p !== 'granted') {
        setError('Notifications are blocked for this app. Allow them in your phone settings first.');
        return;
      }
      await sendTest(profile, lang);
      setInfo('Test message on its way. It will appear in about 4 seconds.');
    } catch (e) {
      setError(errorMessage(e, 'Could not send the test message.'));
    } finally {
      setBusy(false);
    }
  };

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/settings');
  };

  if (permission === null && !error) {
    return (
      <Screen>
        <LoadingView label="Checking notification access…" />
      </Screen>
    );
  }

  const master = notifications.enabled && permission === 'granted';

  return (
    <Screen scroll>
      <Header title="Notifications" subtitle={`When ${profile.wifeName} reaches out`} onBack={goBack} />

      {error ? (
        <View style={{ marginBottom: spacing.md, gap: spacing.sm }}>
          <InlineError message={error} />
          {permission === 'denied' ? (
            <Button label="Open phone settings" icon="settings-outline" variant="ghost" onPress={() => Linking.openSettings()} />
          ) : null}
        </View>
      ) : null}
      {info ? (
        <View style={styles.info}>
          <Ionicons name="checkmark-circle" size={18} color={colors.success} />
          <Text style={styles.infoText}>{info}</Text>
        </View>
      ) : null}

      <GlassCard>
        <SettingRow
          icon="notifications"
          title="Messages from her"
          subtitle={master ? 'On · she will message you at the times below' : 'Off'}
          value={master}
          onValueChange={toggleMaster}
        />
      </GlassCard>

      <SectionLabel>Daily times</SectionLabel>
      <GlassCard style={{ paddingVertical: spacing.sm }}>
        {SLOTS.map((s, i) => {
          const slot = notifications[s.key];
          return (
            <View key={s.key}>
              {i > 0 ? <Divider /> : null}
              <SettingRow
                icon={s.key === 'night' ? 'moon' : s.key === 'morning' ? 'sunny' : 'cafe'}
                title={s.label}
                subtitle={s.hint}
                value={slot.enabled}
                onValueChange={(v) => updateSlot(s.key, { enabled: v })}
              />
              {slot.enabled ? (
                <View style={styles.timeRow}>
                  <Stepper label="Earlier hour" icon="remove" onPress={() => shiftTime(s.key, -60)} />
                  <Stepper label="Earlier 15 minutes" icon="chevron-back" onPress={() => shiftTime(s.key, -15)} />
                  <Text style={styles.time}>{formatClock(slot.hour, slot.minute)}</Text>
                  <Stepper label="Later 15 minutes" icon="chevron-forward" onPress={() => shiftTime(s.key, 15)} />
                  <Stepper label="Later hour" icon="add" onPress={() => shiftTime(s.key, 60)} />
                </View>
              ) : null}
            </View>
          );
        })}
      </GlassCard>
      {!master ? (
        <Body style={{ fontSize: 12, marginTop: spacing.sm }}>
          Turn on “Messages from her” above to start receiving these.
        </Body>
      ) : null}

      <SectionLabel>In the app</SectionLabel>
      <GlassCard>
        <SettingRow
          icon="chatbubble-ellipses"
          title="She starts the conversation"
          subtitle="When you open the chat after a few hours away, she says hello first"
          value={notifications.initiateInChat}
          onValueChange={(v) => apply({ ...notifications, initiateInChat: v })}
        />
      </GlassCard>

      <SectionLabel>Try it</SectionLabel>
      <Button
        label="Send me a test message"
        icon="paper-plane"
        variant="ghost"
        loading={busy}
        onPress={test}
      />
    </Screen>
  );
}

function Stepper({
  icon,
  label,
  onPress,
}: {
  icon: 'remove' | 'add' | 'chevron-back' | 'chevron-forward';
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={6}
      style={({ pressed }) => [styles.stepper, pressed && { opacity: 0.6 }]}
    >
      <Ionicons name={icon} size={18} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.md, paddingLeft: 48 },
  time: { color: colors.goldSoft, fontSize: 18, fontWeight: '700', minWidth: 86, textAlign: 'center' },
  stepper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.glassStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flexDirection: 'row',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(110,231,183,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(110,231,183,0.35)',
    marginBottom: spacing.md,
  },
  infoText: { flex: 1, color: colors.text, fontSize: 13, lineHeight: 19 },
});
