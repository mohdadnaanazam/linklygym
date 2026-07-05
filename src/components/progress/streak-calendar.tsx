import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const WEEKDAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;

const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

function dayKeyOf(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

interface Cell {
  day: number | null;
  key: string;
}

function buildCells(year: number, month: number): Cell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: Cell[] = [];
  for (let i = 0; i < firstWeekday; i++) {
    cells.push({ day: null, key: `blank-${i}` });
  }
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ day, key: dayKeyOf(year, month, day) });
  }
  return cells;
}

export interface StreakCalendarProps {
  highlightedDays: Set<string>;
}

export function StreakCalendar({ highlightedDays }: StreakCalendarProps) {
  const theme = useTheme();

  const today = useMemo(() => new Date(), []);
  const todayKey = dayKeyOf(today.getFullYear(), today.getMonth(), today.getDate());

  const [view, setView] = useState(() => ({
    year: today.getFullYear(),
    month: today.getMonth(),
  }));

  const cells = useMemo(() => buildCells(view.year, view.month), [view]);

  const goPrev = () =>
    setView(({ year, month }) =>
      month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 }
    );
  const goNext = () =>
    setView(({ year, month }) =>
      month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 }
    );

  const monthLabel = `${MONTH_NAMES[view.month]} ${view.year}`;

  return (
    <View>
      <View style={styles.header}>
        <Pressable
          onPress={goPrev}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month"
          style={styles.navButton}>
          <Icon name="chevron-left" size={18} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" accessibilityRole="header">
          {monthLabel}
        </ThemedText>
        <Pressable
          onPress={goNext}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Next month"
          style={styles.navButton}>
          <Icon name="chevron-right" size={18} color={theme.text} />
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEKDAYS.map((label, i) => (
          <View key={`wd-${i}`} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.weekdayText}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((cell) => {
          if (cell.day === null) {
            return <View key={cell.key} style={styles.cell} />;
          }

          const highlighted = highlightedDays.has(cell.key);
          const isToday = cell.key === todayKey;
          const label = `${MONTH_NAMES[view.month]} ${cell.day}${
            highlighted ? ', worked out' : ''
          }${isToday ? ', today' : ''}`;

          return (
            <View key={cell.key} style={styles.cell}>
              <View
                accessible
                accessibilityLabel={label}
                style={[
                  styles.dayInner,
                  highlighted && { backgroundColor: theme.accent },
                  isToday &&
                    !highlighted && {
                      borderColor: theme.accent,
                      borderWidth: 1.5,
                    },
                  isToday && highlighted && { borderColor: theme.text, borderWidth: 1.5 },
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    styles.dayText,
                    highlighted && styles.dayTextHighlighted,
                  ]}>
                  {cell.day}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.two,
  },
  navButton: {
    padding: Spacing.one,
  },
  weekRow: {
    flexDirection: 'row',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: `${100 / 7}%`,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.half,
  },
  weekdayText: {
    fontWeight: '700',
  },
  dayInner: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontWeight: '600',
  },
  dayTextHighlighted: {
    color: '#000000',
    fontWeight: '700',
  },
});

export default StreakCalendar;
