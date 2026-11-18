import React from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, gradients, spacing } from '../theme';

export function GradientBackground({ children }: { children?: React.ReactNode }) {
  return (
    <View style={styles.root}>
      <LinearGradient
        colors={gradients.background}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View pointerEvents="none" style={[styles.orb, styles.orbTop]} />
      <View pointerEvents="none" style={[styles.orb, styles.orbBottom]} />
      {children}
    </View>
  );
}

interface ScreenProps {
  children: React.ReactNode;
  /** Wrap content in a ScrollView. */
  scroll?: boolean;
  /** True for screens shown inside the bottom tabs (the tab bar already handles the bottom edge). */
  tab?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

export function Screen({ children, scroll = false, tab = false, contentStyle }: ScreenProps) {
  const insets = useSafeAreaInsets();
  const bottom = tab ? spacing.lg : insets.bottom + spacing.lg;

  return (
    <GradientBackground>
      {scroll ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            { paddingHorizontal: spacing.lg, paddingTop: insets.top + spacing.md, paddingBottom: bottom },
            contentStyle,
          ]}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1, paddingTop: insets.top }, contentStyle]}>{children}</View>
      )}
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg0 },
  orb: { position: 'absolute', borderRadius: 999 },
  orbTop: {
    width: 320,
    height: 320,
    top: -120,
    right: -100,
    backgroundColor: colors.purple,
    opacity: 0.22,
  },
  orbBottom: {
    width: 280,
    height: 280,
    bottom: -100,
    left: -110,
    backgroundColor: colors.pink,
    opacity: 0.12,
  },
});
