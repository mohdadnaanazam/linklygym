import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#F7F8F2',
    background: '#080A09',
    backgroundElement: '#121512',
    backgroundSelected: '#20251F',
    textSecondary: '#9DA39A',
    accent: '#C7F36B',
    accentForeground: '#10150A',
    surface: '#121512',
    surfaceElevated: '#191D18',
    border: '#2A3028',
    success: '#7DE2A1',
    warning: '#F5C451',
    pr: '#C7F36B',
    danger: '#FF6B6B',
    chart: ['#C7F36B', '#7DE2A1', '#F5C451', '#91B8FF', '#D59BFF'],
  },
  dark: {
    text: '#F7F8F2',
    background: '#080A09',
    backgroundElement: '#121512',
    backgroundSelected: '#20251F',
    textSecondary: '#9DA39A',
    accent: '#C7F36B',
    accentForeground: '#10150A',
    surface: '#121512',
    surfaceElevated: '#191D18',
    border: '#2A3028',
    success: '#7DE2A1',
    warning: '#F5C451',
    pr: '#C7F36B',
    danger: '#FF6B6B',
    chart: ['#C7F36B', '#7DE2A1', '#F5C451', '#91B8FF', '#D59BFF'],
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

export const Radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  pill: 999,
} as const;

export const Motion = {
  fast: 160,
  standard: 240,
  emphasis: 360,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
