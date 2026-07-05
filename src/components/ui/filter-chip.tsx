import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FilterChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  count?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function FilterChip({
  label,
  selected = false,
  onPress,
  count,
  disabled = false,
  style,
}: FilterChipProps) {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected, disabled }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.accent : theme.backgroundElement,
          borderColor: selected ? theme.accent : theme.backgroundSelected,
        },
        disabled && styles.disabled,
        pressed && !disabled && styles.pressed,
        style,
      ]}>
      <ThemedText
        type="small"
        themeColor={selected ? 'text' : 'textSecondary'}
        style={[styles.label, selected && styles.selectedLabel]}
        numberOfLines={1}>
        {label}
      </ThemedText>
      {typeof count === 'number' ? (
        <View style={[styles.badge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="small" style={styles.count}>
            {count}
          </ThemedText>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.three,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.7,
  },
  label: {
    fontWeight: '600',
  },
  selectedLabel: {
    color: '#ffffff',
  },
  badge: {
    minWidth: 18,
    paddingHorizontal: Spacing.one,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
});

export default FilterChip;
