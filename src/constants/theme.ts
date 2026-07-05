import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    background: '#ffffff',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    accent: '#1D7AFC',
    success: '#1F9D55',
    pr: '#1F9D55',
    danger: '#D92D20',
    chart: ['#1D7AFC', '#1F9D55', '#F5A623', '#9B51E0', '#EB5757'],
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    accent: '#2E90FA',
    success: '#32D583',
    pr: '#32D583',
    danger: '#F97066',
    chart: ['#2E90FA', '#32D583', '#FDB022', '#B692F6', '#F97066'],
  },
} as const;

type SharedColorKey = keyof typeof Colors.light & keyof typeof Colors.dark;

export type ThemeColor = {
  [K in SharedColorKey]: (typeof Colors.light)[K] extends string ? K : never;
}[SharedColorKey];

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
