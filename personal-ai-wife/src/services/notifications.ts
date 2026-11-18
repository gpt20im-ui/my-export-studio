import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { slotMessage, type DaySlot } from '../ai/engine';
import type { Lang, NotificationSettings, Profile, TimeSlot } from '../types';

const CHANNEL_ID = 'companion-messages';

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

async function ensureChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
    name: 'Messages from your companion',
    importance: Notifications.AndroidImportance.DEFAULT,
    lightColor: '#FF5D9E',
  });
}

export async function getPermissionState(): Promise<PermissionState> {
  const res = await Notifications.getPermissionsAsync();
  if (res.granted) return 'granted';
  return res.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  await ensureChannel();
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  const res = await Notifications.requestPermissionsAsync();
  if (res.granted) return 'granted';
  return res.canAskAgain ? 'undetermined' : 'denied';
}

async function scheduleSlot(
  slot: TimeSlot,
  daySlot: DaySlot,
  profile: Profile,
  lang: Lang,
): Promise<void> {
  if (!slot.enabled) return;
  await Notifications.scheduleNotificationAsync({
    content: {
      title: profile.wifeName,
      body: slotMessage(daySlot, profile, lang),
      data: { route: '/chat' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: slot.hour,
      minute: slot.minute,
      channelId: CHANNEL_ID,
    },
  });
}

/** Replaces all scheduled messages so they match the current settings. */
export async function syncSchedule(
  settings: NotificationSettings,
  profile: Profile,
  lang: Lang,
): Promise<void> {
  await ensureChannel();
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!settings.enabled) return;
  await scheduleSlot(settings.morning, 'morning', profile, lang);
  await scheduleSlot(settings.midday, 'afternoon', profile, lang);
  await scheduleSlot(settings.night, 'night', profile, lang);
}

export async function cancelAll(): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

/** Shows a notification a few seconds from now so the user can see how it looks. */
export async function sendTest(profile: Profile, lang: Lang): Promise<void> {
  await ensureChannel();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: profile.wifeName,
      body: slotMessage('evening', profile, lang),
      data: { route: '/chat' },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 4,
      repeats: false,
      channelId: CHANNEL_ID,
    },
  });
}
