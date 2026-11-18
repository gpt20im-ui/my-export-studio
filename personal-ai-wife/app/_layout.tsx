import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { AppProvider, useApp } from '../src/state/AppState';
import { GradientBackground } from '../src/components/Screen';
import { ErrorView, LoadingView } from '../src/components/ui';
import { notificationLanguage } from '../src/ai/engine';
import { configureNotificationHandler, syncSchedule } from '../src/services/notifications';
import { colors } from '../src/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});
configureNotificationHandler();

function Gate() {
  const { status, error, reload, data } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  // Tapping one of her notifications opens the chat.
  useEffect(() => {
    if (status !== 'ready' || !data.profile.onboarded) return;
    const sub = Notifications.addNotificationResponseReceivedListener(() => {
      router.navigate('/chat');
    });
    return () => sub.remove();
  }, [status, data.profile.onboarded, router]);

  // Keep scheduled messages in step with the current names and language.
  const { enabled } = data.notifications;
  useEffect(() => {
    if (status !== 'ready' || !enabled) return;
    const lang = notificationLanguage(data.profile.language, data.messages);
    syncSchedule(data.notifications, data.profile, lang).catch(() => {});
    // Only re-run when the schedule itself or the profile changes, not on every chat message.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, enabled, data.notifications, data.profile]);

  if (status === 'loading') {
    return (
      <GradientBackground>
        <LoadingView label="Opening your space…" />
      </GradientBackground>
    );
  }
  if (status === 'error') {
    return (
      <GradientBackground>
        <ErrorView message={error ?? 'Could not open the app data.'} onRetry={reload} />
      </GradientBackground>
    );
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.bg0 },
      }}
    />
  );
}

export default function RootLayout() {
  return (
    <AppProvider>
      <StatusBar style="light" />
      <Gate />
    </AppProvider>
  );
}
