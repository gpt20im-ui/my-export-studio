import { Platform } from 'react-native';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

export type IconName = ComponentProps<typeof Ionicons>['name'];

export const colors = {
  bg0: '#07030D',
  bg1: '#120824',
  bg2: '#241040',
  purple: '#7C3AED',
  purpleDeep: '#3B1470',
  pink: '#FF5D9E',
  pinkSoft: '#FF9CC6',
  gold: '#E8C170',
  goldSoft: '#F5DFA8',
  text: '#FBF3FF',
  textDim: 'rgba(251,243,255,0.70)',
  textFaint: 'rgba(251,243,255,0.45)',
  glass: 'rgba(255,255,255,0.07)',
  glassStrong: 'rgba(255,255,255,0.13)',
  glassBorder: 'rgba(255,255,255,0.15)',
  danger: '#FF6B81',
  success: '#6EE7B7',
  tabBar: '#0E0618',
};

export const gradients = {
  background: ['#07030D', '#120824', '#2A1048'] as const,
  accent: ['#FF5D9E', '#B83AD6'] as const,
  gold: ['#F5DFA8', '#E8C170'] as const,
  bubbleUser: ['#FF5D9E', '#C13AA8'] as const,
};

export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const spacing = { xs: 4, sm: 8, md: 12, lg: 20, xl: 28 };

export const fonts = {
  title: (Platform.OS === 'ios' ? 'Georgia' : 'serif') as string,
};

export interface AvatarOption {
  id: string;
  label: string;
  colors: [string, string];
  icon: IconName;
}

export const AVATARS: AvatarOption[] = [
  { id: 'rose', label: 'Rose', colors: ['#FF5D9E', '#7C3AED'], icon: 'heart' },
  { id: 'moon', label: 'Moon', colors: ['#6D5BFF', '#1B1146'], icon: 'moon' },
  { id: 'blossom', label: 'Blossom', colors: ['#FF9CC6', '#E8C170'], icon: 'flower' },
  { id: 'sun', label: 'Sun', colors: ['#F5C16B', '#FF5D7A'], icon: 'sunny' },
  { id: 'star', label: 'Star', colors: ['#B07CFF', '#FF5D9E'], icon: 'sparkles' },
  { id: 'ocean', label: 'Ocean', colors: ['#47C7E8', '#7C3AED'], icon: 'water' },
];

export function getAvatar(id: string): AvatarOption {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
