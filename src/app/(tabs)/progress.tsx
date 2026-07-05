import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BarChart, type BarChartDatum } from '@/components/charts/bar-chart';
import { LineChart, type LineChartPoint } from '@/components/charts/line-chart';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import { StreakStats } from '@/components/progress/streak-stats';
import { WorkoutCalendar } from '@/components/progress/workout-calendar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { exercisesRepo, progressRepo, settingsRepo, workoutsRepo } from '@/db/repositories';
import type { ExerciseHistoryPoint } from '@/db/repositories/progress-repo';
import type { PersonalRecord } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, type WeightUnit } from '@/lib/units';

import { styles } from './progress.styles';

type RangeKey = '4W' | '12W' | '1Y' | 'All';
type Granularity = 'day' | 'week' | 'month';

const RANGE_OPTIONS: { value: RangeKey; label: string }[] = [
  { value: '4W', label: '4W' },
  { value: '12W', label: '12W' },
  { value: '1Y', label: '1Y' },
  { value: 'All', label: 'All' },
];

const DAY_MS = 86_400_000;

function rangeConfig(range: RangeKey): { start?: number; granularity: Granularity } {
  const now = Date.now();
  switch (range) {
    case '4W':
      return { start: now - 28 * DAY_MS, granularity: 'day' };
    case '12W':
      return { start: now - 84 * DAY_MS, granularity: 'week' };
    case '1Y':
      return { start: now - 365 * DAY_MS, granularity: 'month' };
    case 'All':
      return { start: undefined, granularity: 'month' };
  }
}

type MetricKey = 'top' | 'e1rm' | 'volume';

const METRIC_OPTIONS: { value: MetricKey; label: string }[] = [
  { value: 'top', label: 'Top set' },
  { value: 'e1rm', label: 'Est. 1RM' },
  { value: 'volume', label: 'Volume' },
];

function metricValue(point: ExerciseHistoryPoint, metric: MetricKey): number {
  switch (metric) {
    case 'top':
      return point.topSetKg;
    case 'e1rm':
      return point.est1RM;
    case 'volume':
      return point.volume;
  }
}

const PR_LABELS: Record<PersonalRecord['metric'], string> = {
  max_weight: 'Max weight',
  est_1rm: 'Estimated 1RM',
  max_volume: 'Max volume',
};

function parseDay(day: string): Date {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function shortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'numeric', day: 'numeric' });
}

function shortMonth(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short' });
}

function aggregateVolume(
  days: { day: string; volume: number }[],
  granularity: Granularity
): BarChartDatum[] {
  if (granularity === 'day') {
    return days.map((d) => ({ label: shortDate(parseDay(d.day)), value: d.volume }));
  }

  const buckets = new Map<string, { date: Date; volume: number }>();
  for (const { day, volume } of days) {
    const date = parseDay(day);
    let key: string;
    let bucketDate: Date;
    if (granularity === 'week') {
      const weekIndex = Math.floor(date.getTime() / (7 * DAY_MS));
      key = `w${weekIndex}`;
      bucketDate = date;
    } else {
      key = `${date.getFullYear()}-${date.getMonth()}`;
      bucketDate = new Date(date.getFullYear(), date.getMonth(), 1);
    }
    const existing = buckets.get(key);
    if (existing) existing.volume += volume;
    else buckets.set(key, { date: bucketDate, volume });
  }

  return [...buckets.values()]
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .map((b) => ({
      label: granularity === 'month' ? shortMonth(b.date) : shortDate(b.date),
      value: b.volume,
    }));
}

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);

  const [range, setRange] = useState<RangeKey>('12W');
  const [metric, setMetric] = useState<MetricKey>('top');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState<string | null>(null);

  const [volumeDays, setVolumeDays] = useState<{ day: string; volume: number }[]>([]);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [workoutTimestamps, setWorkoutTimestamps] = useState<number[]>([]);

  const { start, granularity } = useMemo(() => rangeConfig(range), [range]);

  const loadVolume = useCallback(() => {
    setVolumeDays(progressRepo.volumeByRange(start ? { start } : undefined));
  }, [start]);

  const loadExercise = useCallback(() => {
    if (!exerciseId) {
      setHistory([]);
      setPrs([]);
      return;
    }
    setHistory(progressRepo.exerciseHistory(exerciseId, start ? { start } : undefined));
    setPrs(progressRepo.personalRecords(exerciseId));
  }, [exerciseId, start]);

  const loadConsistency = useCallback(() => {
    setWorkoutTimestamps(workoutsRepo.list().map((w) => w.startedAt));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadVolume();
      loadExercise();
      loadConsistency();
    }, [loadVolume, loadExercise, loadConsistency])
  );

  const handleSelectExercise = useCallback((id: string) => {
    setExerciseId(id);
    setExerciseName(exercisesRepo.getById(id)?.name ?? 'Exercise');
    setHistory(progressRepo.exerciseHistory(id));
    setPrs(progressRepo.personalRecords(id));
  }, []);

  const volumeBars = useMemo(
    () => aggregateVolume(volumeDays, granularity),
    [volumeDays, granularity]
  );
  const totalVolume = useMemo(
    () => volumeDays.reduce((sum, d) => sum + d.volume, 0),
    [volumeDays]
  );

  const linePoints = useMemo<LineChartPoint[]>(
    () =>
      [...history]
        .sort((a, b) => a.at - b.at)
        .map((p) => ({ x: p.at, y: metricValue(p, metric) })),
    [history, metric]
  );

  const volumeSummary =
    volumeBars.length > 0
      ? `Total volume ${formatWeight(totalVolume, unit)} across ${volumeBars.length} ${
          granularity === 'day' ? 'days' : granularity === 'week' ? 'weeks' : 'months'
        }.`
      : 'No volume recorded in this range.';

  const lineSummary =
    linePoints.length > 0
      ? `${exerciseName ?? 'Exercise'} ${
          METRIC_OPTIONS.find((m) => m.value === metric)?.label
        } over ${linePoints.length} workouts, ranging ${formatWeight(
          Math.min(...linePoints.map((p) => p.y)),
          unit
        )} to ${formatWeight(Math.max(...linePoints.map((p) => p.y)), unit)}.`
      : 'Not enough data to chart yet.';

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">Progress</ThemedText>
            <Button
              title="Body metrics"
              variant="secondary"
              size="sm"
              onPress={() => router.push('/metrics')}
              leading={<Icon name="progress" size={16} color={theme.text} />}
              accessibilityLabel="Open body metrics"
            />
          </View>

          <SegmentedControl
            options={RANGE_OPTIONS}
            value={range}
            onChange={setRange}
            style={styles.rangeControl}
          />

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">Volume over time</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatWeight(totalVolume, unit)}
              </ThemedText>
            </View>
            {volumeBars.length > 0 ? (
              <BarChart
                data={volumeBars}
                color={theme.chart[0]}
                accessibilityLabel={volumeSummary}
                style={styles.chart}
              />
            ) : (
              <EmptyState
                icon="progress"
                title="No volume yet"
                message="Complete workouts in this range to see your training volume."
              />
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">Per-exercise progress</ThemedText>
            </View>
            <Button
              title={exerciseName ?? 'Choose an exercise'}
              variant="secondary"
              size="sm"
              onPress={() => setPickerVisible(true)}
              leading={<Icon name="search" size={16} color={theme.text} />}
              style={styles.pickerButton}
            />

            {exerciseId ? (
              <>
                <SegmentedControl
                  options={METRIC_OPTIONS}
                  value={metric}
                  onChange={setMetric}
                  style={styles.metricControl}
                />
                {linePoints.length >= 2 ? (
                  <LineChart
                    data={linePoints}
                    stroke={theme.chart[1]}
                    fill
                    formatY={(v) => formatWeight(v, unit, { withUnit: false })}
                    accessibilityLabel={lineSummary}
                    style={styles.chart}
                  />
                ) : (
                  <EmptyState
                    icon="progress"
                    title="Not enough data"
                    message="Log this exercise in at least two workouts to see a trend."
                  />
                )}
              </>
            ) : (
              <EmptyState
                icon="exercises"
                title="Pick an exercise"
                message="Choose an exercise to chart your progress over time."
              />
            )}
          </Card>

          <Card style={styles.card} padding={0}>
            <View style={[styles.cardHeader, styles.prHeader]}>
              <ThemedText type="smallBold">Personal records</ThemedText>
              <Icon name="trophy" size={16} color={theme.pr} />
            </View>
            {!exerciseId ? (
              <View style={styles.prEmpty}>
                <ThemedText type="small" themeColor="textSecondary">
                  Select an exercise above to see its personal records.
                </ThemedText>
              </View>
            ) : prs.length === 0 ? (
              <View style={styles.prEmpty}>
                <ThemedText type="small" themeColor="textSecondary">
                  No records yet for {exerciseName}. Hit a new best to set one.
                </ThemedText>
              </View>
            ) : (
              prs.map((pr, i) => (
                <ListRow
                  key={pr.id}
                  title={PR_LABELS[pr.metric]}
                  subtitle={new Date(pr.achievedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  trailing={
                    <ThemedText type="smallBold" themeColor="pr">
                      {formatWeight(pr.value, unit)}
                    </ThemedText>
                  }
                  style={i > 0 ? styles.prRowBorder : undefined}
                />
              ))
            )}
          </Card>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">Consistency</ThemedText>
              <Icon name="progress" size={16} color={theme.accent} />
            </View>
            <StreakStats timestamps={workoutTimestamps} />
            <WorkoutCalendar timestamps={workoutTimestamps} />
          </Card>
        </ScrollView>
      </SafeAreaView>

      <ExercisePickerSheet
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={handleSelectExercise}
      />
    </ThemedView>
  );
}
