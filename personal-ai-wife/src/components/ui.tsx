import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, fonts, getAvatar, gradients, radius, spacing, type IconName } from '../theme';

/* ------------------------------- GlassCard -------------------------------- */

export function GlassCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.glass, style]}>{children}</View>;
}

/* ---------------------------------- Text ---------------------------------- */

export function Title({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: React.ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function SectionLabel({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionLabel}>{children}</Text>;
}

/* --------------------------------- Button --------------------------------- */

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger' | 'gold';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading = false,
  disabled = false,
  style,
}: ButtonProps) {
  const inactive = disabled || loading;
  const content = (
    <View style={styles.buttonInner}>
      {loading ? (
        <ActivityIndicator color={variant === 'gold' ? colors.bg0 : colors.text} size="small" />
      ) : icon ? (
        <Ionicons
          name={icon}
          size={18}
          color={variant === 'gold' ? colors.bg0 : variant === 'danger' ? colors.danger : colors.text}
        />
      ) : null}
      <Text
        style={[
          styles.buttonLabel,
          variant === 'gold' && { color: colors.bg0 },
          variant === 'danger' && { color: colors.danger },
        ]}
      >
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive }}
      style={({ pressed }) => [
        styles.buttonBase,
        { opacity: inactive ? 0.5 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
        style,
      ]}
    >
      {variant === 'primary' || variant === 'gold' ? (
        <LinearGradient
          colors={variant === 'gold' ? gradients.gold : gradients.accent}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.buttonFill}
        >
          {content}
        </LinearGradient>
      ) : (
        <View
          style={[
            styles.buttonFill,
            styles.buttonOutline,
            variant === 'danger' && { borderColor: 'rgba(255,107,129,0.5)' },
          ]}
        >
          {content}
        </View>
      )}
    </Pressable>
  );
}

/* ---------------------------------- Chip ---------------------------------- */

export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.8 },
      ]}
    >
      {icon ? (
        <Ionicons name={icon} size={14} color={selected ? colors.goldSoft : colors.textDim} />
      ) : null}
      <Text style={[styles.chipLabel, selected && { color: colors.text }]}>{label}</Text>
    </Pressable>
  );
}

/* ------------------------------- LevelSelector ----------------------------- */

export function LevelSelector({
  value,
  onChange,
  max = 4,
}: {
  value: number;
  onChange: (v: number) => void;
  max?: number;
}) {
  const steps = Array.from({ length: max + 1 }, (_, i) => i);
  return (
    <View style={styles.levelRow}>
      {steps.map((i) => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          accessibilityRole="button"
          accessibilityLabel={`Level ${i} of ${max}`}
          style={styles.levelHit}
        >
          <View
            style={[
              styles.levelBar,
              i <= value && i > 0 && { backgroundColor: colors.pink },
              i === 0 && value === 0 && { backgroundColor: colors.textFaint },
            ]}
          />
        </Pressable>
      ))}
    </View>
  );
}

/* --------------------------------- Setting row ----------------------------- */

export function SettingRow({
  icon,
  title,
  subtitle,
  onPress,
  value,
  onValueChange,
  danger = false,
}: {
  icon: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  value?: boolean;
  onValueChange?: (v: boolean) => void;
  danger?: boolean;
}) {
  const isSwitch = typeof value === 'boolean' && onValueChange;
  const body = (
    <View style={styles.row}>
      <View style={[styles.rowIcon, danger && { backgroundColor: 'rgba(255,107,129,0.15)' }]}>
        <Ionicons name={icon} size={18} color={danger ? colors.danger : colors.pinkSoft} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.rowTitle, danger && { color: colors.danger }]}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub}>{subtitle}</Text> : null}
      </View>
      {isSwitch ? (
        <Switch
          value={value}
          onValueChange={onValueChange}
          trackColor={{ false: 'rgba(255,255,255,0.18)', true: colors.pink }}
          thumbColor={value ? colors.goldSoft : '#d8cde6'}
        />
      ) : onPress ? (
        <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
      ) : null}
    </View>
  );
  if (onPress && !isSwitch) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={title}
        style={({ pressed }) => pressed && { opacity: 0.75 }}
      >
        {body}
      </Pressable>
    );
  }
  return body;
}

export function Divider() {
  return <View style={styles.divider} />;
}

/* ---------------------------------- Header --------------------------------- */

export function Header({
  title,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={10}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={styles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

export function IconButton({
  icon,
  onPress,
  label,
  color = colors.text,
}: {
  icon: IconName;
  onPress: () => void;
  label: string;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [styles.iconBtn, pressed && { opacity: 0.7 }]}
    >
      <Ionicons name={icon} size={20} color={color} />
    </Pressable>
  );
}

/* ---------------------------------- Avatar --------------------------------- */

export function Avatar({ avatarId, size = 48 }: { avatarId: string; size?: number }) {
  const a = getAvatar(avatarId);
  return (
    <LinearGradient
      colors={a.colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: 'rgba(232,193,112,0.7)',
      }}
    >
      <Ionicons name={a.icon} size={size * 0.46} color="#fff" />
    </LinearGradient>
  );
}

/* ------------------------------ Loading / Error ---------------------------- */

export function LoadingView({ label = 'Loading…' }: { label?: string }) {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.pink} size="large" />
      <Text style={[styles.body, { marginTop: spacing.md }]}>{label}</Text>
    </View>
  );
}

export function ErrorView({
  message,
  onRetry,
  retryLabel = 'Try again',
}: {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <View style={styles.center}>
      <Ionicons name="alert-circle" size={44} color={colors.danger} />
      <Text style={[styles.title, { marginTop: spacing.md, fontSize: 20 }]}>Something went wrong</Text>
      <Text style={[styles.body, { textAlign: 'center', marginVertical: spacing.md }]}>{message}</Text>
      {onRetry ? <Button label={retryLabel} icon="refresh" onPress={onRetry} /> : null}
    </View>
  );
}

export function InlineError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <View style={styles.inlineError}>
      <Ionicons name="alert-circle" size={18} color={colors.danger} />
      <Text style={styles.inlineErrorText}>{message}</Text>
      {onRetry ? (
        <Pressable onPress={onRetry} accessibilityRole="button" accessibilityLabel="Retry" hitSlop={8}>
          <Text style={styles.inlineErrorAction}>Retry</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  text,
}: {
  icon: IconName;
  title: string;
  text: string;
}) {
  return (
    <View style={[styles.center, { paddingVertical: spacing.xl }]}>
      <Ionicons name={icon} size={40} color={colors.pinkSoft} />
      <Text style={[styles.title, { marginTop: spacing.md, fontSize: 20 }]}>{title}</Text>
      <Text style={[styles.body, { textAlign: 'center', marginTop: spacing.sm }]}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glass: {
    backgroundColor: colors.glass,
    borderColor: colors.glassBorder,
    borderWidth: 1,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  title: {
    color: colors.text,
    fontFamily: fonts.title,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  body: { color: colors.textDim, fontSize: 15, lineHeight: 22 },
  sectionLabel: {
    color: colors.gold,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  buttonBase: { borderRadius: radius.pill, overflow: 'hidden' },
  buttonFill: {
    minHeight: 50,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
  },
  buttonOutline: {
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonLabel: { color: colors.text, fontSize: 16, fontWeight: '700' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: radius.pill,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
  },
  chipSelected: { backgroundColor: 'rgba(255,93,158,0.25)', borderColor: colors.pink },
  chipLabel: { color: colors.textDim, fontSize: 14, fontWeight: '600' },
  levelRow: { flexDirection: 'row', gap: 6, flex: 1 },
  levelHit: { flex: 1, height: 36, justifyContent: 'center' },
  levelBar: { height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.14)' },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: 12 },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,93,158,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  rowSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: colors.glassBorder },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { color: colors.text, fontFamily: fonts.title, fontSize: 26, fontWeight: '700' },
  headerSub: { color: colors.textFaint, fontSize: 13, marginTop: 2 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.glass,
    borderWidth: 1,
    borderColor: colors.glassBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  inlineError: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255,107,129,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255,107,129,0.4)',
  },
  inlineErrorText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 20 },
  inlineErrorAction: { color: colors.goldSoft, fontWeight: '700', fontSize: 14 },
});
