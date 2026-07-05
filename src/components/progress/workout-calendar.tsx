import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

function dayKey(at: number): string {
  const d = new Date(at);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function ymdKey(year: number, month: number, day: number): string {
  const m = String(month + 1).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
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
];

export type WorkoutCalendarProps = {
  timestamps: number[];
};

export function WorkoutCalendar({ timestamps }: WorkoutCalendarProps) {
  const theme = useTheme();

  const workoutDays = useMemo(
    () => new Set(timestamps.map(dayKey)),
    [timestamps]
  );

  const now = new Date();
  const todayKey = ymdKey(now.getFullYear(), now.getMonth(), now.getDate());

  const [view, setView] = useState({
    year: now.getFullYear(),
    month: now.getMonth(),
  });

  const isCurrentMonth =
    view.year === now.getFullYear() && view.month === now.getMonth();

  const goPrev = () => {
    setView((v) =>
      v.month === 0
        ? { year: v.year - 1, month: 11 }
        : { year: v.year, month: v.month - 1 }
    );
  };

  const goNext = () => {
    if (isCurrentMonth) return;
    setView((v) =>
      v.month === 11
        ? { year: v.year + 1, month: 0 }
        : { year: v.year, month: v.month + 1 }
    );
  };

  const cells = useMemo<(number | null)[]>(() => {
    const firstWeekday = new Date(view.year, view.month, 1).getDay();
    const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
    const out: (number | null)[] = [];
    for (let i = 0; i < firstWeekday; i++) out.push(null);
    for (let d = 1; d <= daysInMonth; d++) out.push(d);
    return out;
  }, [view]);

  const monthLabel = `${MONTH_NAMES[view.month]} ${view.year}`;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable
          onPress={goPrev}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Previous month">
          <Icon name="chevron-left" size={18} color={theme.text} />
        </Pressable>
        <ThemedText type="smallBold" accessibilityLabel={monthLabel}>
          {monthLabel}
        </ThemedText>
        <Pressable
          onPress={goNext}
          hitSlop={8}
          disabled={isCurrentMonth}
          accessibilityRole="button"
          accessibilityState={{ disabled: isCurrentMonth }}
          accessibilityLabel="Next month">
          <Icon
            name="chevron-right"
            size={18}
            color={isCurrentMonth ? theme.textSecondary : theme.text}
          />
        </Pressable>
      </View>

      <View style={styles.week}>
        {WEEKDAY_LABELS.map((label, i) => (
          <View key={`wd-${i}`} style={styles.cell}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.weekdayText}>
              {label}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.grid}>
        {cells.map((day, i) => {
          if (day === null) {
            return <View key={`blank-${i}`} style={styles.cell} />;
          }
          const key = ymdKey(view.year, view.month, day);
          const worked = workoutDays.has(key);
          const isToday = key === todayKey;

          const dayDate = new Date(view.year, view.month, day);
          const label = `${dayDate.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
          })}${worked ? ', worked out' : ''}${isToday ? ', today' : ''}`;

          return (
            <View key={key} style={styles.cell}>
              <View
                accessible
                accessibilityLabel={label}
                style={[
                  styles.dayDot,
                  worked && { backgroundColor: theme.accent },
                  isToday &&
                    !worked && {
                      borderWidth: 1.5,
                      borderColor: theme.accent,
                    },
                  isToday && worked && { borderWidth: 1.5, borderColor: theme.text },
                ]}>
                <ThemedText
                  type="small"
                  style={[
                    styles.dayText,
                    worked && { color: theme.background, fontWeight: '700' },
                  ]}>
                  {day}
                </ThemedText>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default WorkoutCalendar;

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.one,
  },
  week: {
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
  },
  weekdayText: {
    fontWeight: '700',
  },
  dayDot: {
    width: '76%',
    aspectRatio: 1,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayText: {
    fontSize: 13,
  },
});
