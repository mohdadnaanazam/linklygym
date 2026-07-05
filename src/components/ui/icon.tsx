import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import type { SFSymbol } from 'expo-symbols';
import { Platform, View, type ColorValue } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

export type IconName =
  | 'home'
  | 'exercises'
  | 'train'
  | 'progress'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-down'
  | 'plus'
  | 'checkmark'
  | 'timer'
  | 'trophy'
  | 'gear'
  | 'filter'
  | 'heart'
  | 'heart-filled'
  | 'search'
  | 'close';

const SF_SYMBOLS: Record<IconName, SFSymbol> = {
  home: 'house.fill',
  exercises: 'dumbbell.fill',
  train: 'figure.strengthtraining.traditional',
  progress: 'chart.line.uptrend.xyaxis',
  'chevron-right': 'chevron.right',
  'chevron-left': 'chevron.left',
  'chevron-down': 'chevron.down',
  plus: 'plus',
  checkmark: 'checkmark',
  timer: 'timer',
  trophy: 'trophy.fill',
  gear: 'gearshape.fill',
  filter: 'line.3.horizontal.decrease.circle',
  heart: 'heart',
  'heart-filled': 'heart.fill',
  search: 'magnifyingglass',
  close: 'xmark',
};

export const IONICONS_FALLBACK: Record<IconName, keyof typeof Ionicons.glyphMap> = {
  home: 'home',
  exercises: 'barbell',
  train: 'fitness',
  progress: 'trending-up',
  'chevron-right': 'chevron-forward',
  'chevron-left': 'chevron-back',
  'chevron-down': 'chevron-down',
  plus: 'add',
  checkmark: 'checkmark',
  timer: 'timer',
  trophy: 'trophy',
  gear: 'settings',
  filter: 'filter',
  heart: 'heart-outline',
  'heart-filled': 'heart',
  search: 'search',
  close: 'close',
};

export type IconProps = {
  name: IconName | SFSymbol;
  size?: number;
  color?: ColorValue;
  androidName?: keyof typeof Ionicons.glyphMap;
};

function isIconName(name: string): name is IconName {
  return name in SF_SYMBOLS;
}

function resolveSymbol(name: IconName | SFSymbol): SFSymbol {
  return (SF_SYMBOLS as Record<string, SFSymbol>)[name] ?? (name as SFSymbol);
}

export function Icon({ name, size = 24, color, androidName }: IconProps) {
  const theme = useTheme();
  const tint = color ?? theme.text;

  if (Platform.OS === 'ios') {
    return <SymbolView name={resolveSymbol(name)} size={size} tintColor={tint} />;
  }

  const glyph =
    androidName ?? (isIconName(name) ? IONICONS_FALLBACK[name] : undefined);

  if (glyph && glyph in Ionicons.glyphMap) {
    return <Ionicons name={glyph} size={size} color={tint} />;
  }

  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: Math.max(4, size * 0.25),
        backgroundColor: tint,
        opacity: 0.6,
      }}
    />
  );
}

export default Icon;
