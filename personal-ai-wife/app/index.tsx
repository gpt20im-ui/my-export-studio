import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp } from '../src/state/AppState';
import { GradientBackground } from '../src/components/Screen';
import { Button, GlassCard } from '../src/components/ui';
import { colors, fonts, gradients, spacing } from '../src/theme';

export default function WelcomeScreen() {
  const { data } = useApp();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pulse = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 1400,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ]),
    );
    loop.start();
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
    return () => loop.stop();
  }, [pulse, fade]);

  if (data.profile.onboarded) {
    return <Redirect href="/chat" />;
  }

  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });
  const glow = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.6] });

  return (
    <GradientBackground>
      <View
        style={[
          styles.content,
          { paddingTop: insets.top + spacing.xl, paddingBottom: insets.bottom + spacing.lg },
        ]}
      >
        <Animated.View style={[styles.hero, { opacity: fade }]}>
          <Animated.View style={[styles.halo, { opacity: glow, transform: [{ scale }] }]} />
          <Animated.View style={{ transform: [{ scale }] }}>
            <LinearGradient
              colors={gradients.accent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.heart}
            >
              <Ionicons name="heart" size={64} color="#fff" />
            </LinearGradient>
          </Animated.View>
          <Text style={styles.title}>Personal AI Wife</Text>
          <Text style={styles.tagline}>A caring, romantic AI companion who talks with you in English, हिन्दी and Hinglish.</Text>
        </Animated.View>

        <View style={styles.pills}>
          {(
            [
              ['chatbubbles', 'Chat & voice'],
              ['sparkles', 'Her own personality'],
              ['lock-closed', 'Private on your phone'],
            ] as const
          ).map(([icon, label]) => (
            <View key={label} style={styles.pill}>
              <Ionicons name={icon} size={14} color={colors.gold} />
              <Text style={styles.pillText}>{label}</Text>
            </View>
          ))}
        </View>

        <GlassCard style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
            <Ionicons name="information-circle" size={20} color={colors.goldSoft} />
            <Text style={styles.notice}>
              She is an AI companion, not a real person. This prototype uses a built-in mock AI and
              keeps everything on your phone.
            </Text>
          </View>
        </GlassCard>

        <Button label="Get started" icon="arrow-forward" onPress={() => router.push('/setup')} />
      </View>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, paddingHorizontal: spacing.lg, justifyContent: 'space-between' },
  hero: { alignItems: 'center', marginTop: spacing.xl },
  halo: {
    position: 'absolute',
    top: -20,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.pink,
  },
  heart: {
    width: 128,
    height: 128,
    borderRadius: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(232,193,112,0.8)',
  },
  title: {
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 36,
    fontWeight: '700',
    marginTop: spacing.xl,
    letterSpacing: 0.5,
  },
  tagline: {
    color: colors.textDim,
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  pillText: { color: colors.text, fontSize: 13, fontWeight: '600' },
  notice: { flex: 1, color: colors.textDim, fontSize: 13, lineHeight: 19 },
});
