import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, gradients, radius, spacing } from '../theme';
import type { Message } from '../types';
import { formatDuration, formatTime } from '../utils';

export function ChatBubble({
  message,
  onPlayVoice,
  playing = false,
}: {
  message: Message;
  onPlayVoice?: () => void;
  playing?: boolean;
}) {
  const isUser = message.role === 'user';
  const opacity = useRef(new Animated.Value(0)).current;
  const translate = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 260, useNativeDriver: true }),
      Animated.timing(translate, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  }, [opacity, translate]);

  const content =
    message.kind === 'voice' ? (
      <Pressable
        onPress={onPlayVoice}
        disabled={!onPlayVoice}
        accessibilityRole="button"
        accessibilityLabel="Play voice message"
        style={styles.voiceRow}
      >
        <Ionicons name={playing ? 'pause-circle' : 'play-circle'} size={30} color="#fff" />
        <View style={styles.voiceWave}>
          {[6, 14, 9, 18, 8, 15, 10, 5].map((h, i) => (
            <View key={i} style={[styles.voiceBar, { height: h }]} />
          ))}
        </View>
        <Text style={styles.voiceTime}>{formatDuration(message.durationMs ?? 0)}</Text>
      </Pressable>
    ) : (
      <Text style={styles.text} selectable>
        {message.text}
      </Text>
    );

  return (
    <Animated.View
      style={[
        styles.wrap,
        isUser ? styles.wrapUser : styles.wrapWife,
        { opacity, transform: [{ translateY: translate }] },
      ]}
    >
      {isUser ? (
        <LinearGradient
          colors={gradients.bubbleUser}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.bubble, styles.bubbleUser]}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={[styles.bubble, styles.bubbleWife]}>{content}</View>
      )}
      <Text style={[styles.time, isUser && { textAlign: 'right' }]}>{formatTime(message.ts)}</Text>
    </Animated.View>
  );
}

export function TypingIndicator({ name }: { name: string }) {
  const dots = useRef([new Animated.Value(0), new Animated.Value(0), new Animated.Value(0)]).current;

  useEffect(() => {
    const loops = dots.map((v, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 160),
          Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(v, { toValue: 0, duration: 300, useNativeDriver: true }),
          Animated.delay(480 - i * 160),
        ]),
      ),
    );
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [dots]);

  return (
    <View
      style={[styles.wrap, styles.wrapWife]}
      accessibilityLabel={`${name} is typing`}
      accessibilityLiveRegion="polite"
    >
      <View style={[styles.bubble, styles.bubbleWife, styles.typingBubble]}>
        {dots.map((v, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
                transform: [
                  { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, -4] }) },
                ],
              },
            ]}
          />
        ))}
      </View>
      <Text style={styles.time}>{name} is typing…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { maxWidth: '82%', marginBottom: spacing.md },
  wrapUser: { alignSelf: 'flex-end' },
  wrapWife: { alignSelf: 'flex-start' },
  bubble: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20 },
  bubbleUser: { borderBottomRightRadius: 6 },
  bubbleWife: {
    backgroundColor: colors.glassStrong,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    borderBottomLeftRadius: 6,
  },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  time: { color: colors.textFaint, fontSize: 11, marginTop: 4, marginHorizontal: 6 },
  typingBubble: { flexDirection: 'row', gap: 6, alignItems: 'center', paddingVertical: 14 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.pinkSoft },
  voiceRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 170 },
  voiceWave: { flexDirection: 'row', alignItems: 'center', gap: 3, flex: 1 },
  voiceBar: { width: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.8)' },
  voiceTime: { color: '#fff', fontSize: 13, fontWeight: '600', borderRadius: radius.sm },
});
