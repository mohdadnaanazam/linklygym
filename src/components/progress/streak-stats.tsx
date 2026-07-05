import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { computeStreaks } from '@/lib/streak';

export type StreakStatsProps = {
  timestamps: number[];
};

export function StreakStats({ timestamps }: StreakStatsProps) {
  const theme = useTheme();
  const { current, longest } = useMemo(
    () => computeStreaks(timestamps),
    [timestamps]
  );

  const currentLabel = `Current streak: ${current} ${current === 1 ? 'day' : 'days'}`;
  const bestLabel = `Best streak: ${longest} ${longest === 1 ? 'day' : 'days'}`;

  return (
    <View style={styles.row}>
      <View style={styles.stat} accessible accessibilityLabel={currentLabel}>
        <Icon name="train" size={18} color={theme.accent} />
        <View style={styles.statText}>
          <ThemedText type="small" themeColor="textSecondary">
            Current
          </ThemedText>
          <ThemedText type="smallBold">
            {current} {current === 1 ? 'day' : 'days'}
          </ThemedText>
        </View>
      </View>

      <View style={styles.stat} accessible accessibilityLabel={bestLabel}>
        <Icon name="trophy" size={18} color={theme.pr} />
        <View style={styles.statText}>
          <ThemedText type="small" themeColor="textSecondary">
            Best
          </ThemedText>
          <ThemedText type="smallBold">
            {longest} {longest === 1 ? 'day' : 'days'}
          </ThemedText>
        </View>
      </View>
    </View>
  );
}

export default StreakStats;

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  statText: {
    gap: 2,
  },
});
