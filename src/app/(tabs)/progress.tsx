import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn } from 'react-native-reanimated';

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
import { Icon, type IconName } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { exercisesRepo, progressRepo, settingsRepo, workoutsRepo } from '@/db/repositories';
import type { ExerciseHistoryPoint } from '@/db/repositories/progress-repo';
import type { PersonalRecord, Workout } from '@/db/schema';
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

// Muscle group colors for visualization
const MUSCLE_COLORS: Record<string, string> = {
  chest: '#FF6B6B',
  back: '#4ECDC4',
  shoulders: '#45B7D1',
  biceps: '#96CEB4',
  triceps: '#DDA0DD',
  abs: '#F7DC6F',
  quads: '#FF8C42',
  hamstrings: '#98D8C8',
  glutes: '#C9B1FF',
  calves: '#FFB6C1',
  forearms: '#87CEEB',
  core: '#F7DC6F',
  legs: '#45B7D1',
  arms: '#96CEB4',
};

interface WorkoutInsight {
  icon: IconName;
  title: string;
  value: string;
  color: string;
  subtitle?: string;
}

interface MuscleGroupData {
  name: string;
  sets: number;
  color: string;
  percentage: number;
}

export default function ProgressScreen() {
  const theme = useTheme();
  const router = useRouter();
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);
  const [insightNow] = useState(() => Date.now());

  const [range, setRange] = useState<RangeKey>('12W');
  const [metric, setMetric] = useState<MetricKey>('top');
  const [pickerVisible, setPickerVisible] = useState(false);
  const [exerciseId, setExerciseId] = useState<string | null>(null);
  const [exerciseName, setExerciseName] = useState<string | null>(null);

  const [volumeDays, setVolumeDays] = useState<{ day: string; volume: number }[]>([]);
  const [history, setHistory] = useState<ExerciseHistoryPoint[]>([]);
  const [prs, setPrs] = useState<PersonalRecord[]>([]);
  const [workoutTimestamps, setWorkoutTimestamps] = useState<number[]>([]);
  const [allWorkouts, setAllWorkouts] = useState<Workout[]>([]);
  const [muscleGroupData, setMuscleGroupData] = useState<MuscleGroupData[]>([]);

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
    const workouts = workoutsRepo.list();
    setAllWorkouts(workouts);
    setWorkoutTimestamps(workouts.map((w) => w.startedAt));
  }, []);

  // Calculate muscle group distribution
  const loadMuscleGroups = useCallback(() => {
    const workouts = workoutsRepo.list();
    const muscleSetCount: Record<string, number> = {};
    let totalSets = 0;

    workouts.forEach(workout => {
      const detail = workoutsRepo.getById(workout.id);
      if (detail) {
        detail.exercises.forEach(ex => {
          const exercise = exercisesRepo.getById(ex.exerciseId);
          if (exercise) {
            const targetMuscle = exercise.targetMuscles?.[0]?.toLowerCase() ?? 
                                exercise.bodyParts?.[0]?.toLowerCase() ?? 'other';
            const completedSets = ex.sets.filter(s => s.completed).length;
            muscleSetCount[targetMuscle] = (muscleSetCount[targetMuscle] ?? 0) + completedSets;
            totalSets += completedSets;
          }
        });
      }
    });

    const data: MuscleGroupData[] = Object.entries(muscleSetCount)
      .map(([name, sets]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        sets,
        color: MUSCLE_COLORS[name.toLowerCase()] ?? theme.chart[0],
        percentage: totalSets > 0 ? Math.round((sets / totalSets) * 100) : 0,
      }))
      .sort((a, b) => b.sets - a.sets)
      .slice(0, 8);

    setMuscleGroupData(data);
  }, [theme.chart]);

  useFocusEffect(
    useCallback(() => {
      loadVolume();
      loadExercise();
      loadConsistency();
      loadMuscleGroups();
    }, [loadVolume, loadExercise, loadConsistency, loadMuscleGroups])
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

  // Calculate workout insights
  const insights = useMemo<WorkoutInsight[]>(() => {
    if (allWorkouts.length === 0) return [];

    const rangeWorkouts = start 
      ? allWorkouts.filter(w => w.startedAt >= start)
      : allWorkouts;

    // Total workouts in range
    const totalWorkouts = rangeWorkouts.length;

    // Average duration
    const avgDuration = rangeWorkouts.length > 0
      ? Math.round(rangeWorkouts.reduce((sum, w) => sum + (w.durationSec ?? 0), 0) / rangeWorkouts.length / 60)
      : 0;

    // Average volume per workout
    const avgVolume = rangeWorkouts.length > 0
      ? Math.round(rangeWorkouts.reduce((sum, w) => sum + (w.totalVolume ?? 0), 0) / rangeWorkouts.length)
      : 0;

    // Workouts per week
    const days = start ? (insightNow - start) / DAY_MS :
      rangeWorkouts.length > 0 ? (insightNow - rangeWorkouts[rangeWorkouts.length - 1].startedAt) / DAY_MS : 0;
    const weeks = Math.max(1, days / 7);
    const workoutsPerWeek = Math.round((totalWorkouts / weeks) * 10) / 10;

    return [
      {
        icon: 'train' as IconName,
        title: 'Workouts',
        value: String(totalWorkouts),
        color: theme.accent,
        subtitle: `${workoutsPerWeek}/week avg`,
      },
      {
        icon: 'timer' as IconName,
        title: 'Avg Duration',
        value: `${avgDuration}`,
        color: theme.chart[1],
        subtitle: 'minutes',
      },
      {
        icon: 'progress' as IconName,
        title: 'Avg Volume',
        value: formatWeight(avgVolume, unit, { withUnit: false }),
        color: theme.chart[2],
        subtitle: unit,
      },
    ];
  }, [allWorkouts, insightNow, start, unit, theme]);

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
            <ThemedText type="subtitle">Progress</ThemedText>
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

          {/* Quick Insights */}
          {insights.length > 0 && (
            <Animated.View entering={FadeIn.duration(300)} style={styles.insightsRow}>
              {insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </Animated.View>
          )}

          {/* Muscle Group Balance */}
          {muscleGroupData.length > 0 && (
            <Card style={styles.card}>
              <View style={styles.cardHeader}>
                <ThemedText type="smallBold">Muscle Group Balance</ThemedText>
                <Icon name="exercises" size={16} color={theme.textSecondary} />
              </View>
              <View style={styles.muscleGroupChart}>
                {muscleGroupData.map((muscle, index) => (
                  <MuscleGroupBar key={index} muscle={muscle} />
                ))}
              </View>
            </Card>
          )}

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
              <View style={styles.prTitleRow}>
                <ThemedText type="smallBold">Personal Records</ThemedText>
                <View style={[styles.prBadge, { backgroundColor: theme.pr + '20' }]}>
                  <Icon name="trophy" size={14} color={theme.pr} />
                  <ThemedText type="small" style={{ color: theme.pr }}>
                    {prs.length} PRs
                  </ThemedText>
                </View>
              </View>
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
              prs.slice(0, 5).map((pr, i) => (
                <ListRow
                  key={pr.id}
                  title={PR_LABELS[pr.metric]}
                  subtitle={new Date(pr.achievedAt).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                  })}
                  leading={
                    <View style={[styles.prIcon, { backgroundColor: theme.pr + '20' }]}>
                      <Icon name="trophy" size={16} color={theme.pr} />
                    </View>
                  }
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

function InsightCard({ insight }: { insight: WorkoutInsight }) {
  const theme = useTheme();
  
  return (
    <Card style={styles.insightCard}>
      <View style={[styles.insightIcon, { backgroundColor: insight.color + '20' }]}>
        <Icon name={insight.icon} size={16} color={insight.color} />
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {insight.title}
      </ThemedText>
      <View style={styles.insightValueRow}>
        <ThemedText type="subtitle" style={styles.insightValue}>
          {insight.value}
        </ThemedText>
        {insight.subtitle && (
          <ThemedText type="small" themeColor="textSecondary">
            {insight.subtitle}
          </ThemedText>
        )}
      </View>
    </Card>
  );
}

function MuscleGroupBar({ muscle }: { muscle: MuscleGroupData }) {
  const theme = useTheme();
  
  return (
    <View style={styles.muscleGroupRow}>
      <View style={styles.muscleGroupLabel}>
        <ThemedText type="small" numberOfLines={1}>
          {muscle.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {muscle.sets} sets
        </ThemedText>
      </View>
      <View style={styles.muscleGroupBarContainer}>
        <View 
          style={[
            styles.muscleGroupBarFill,
            { 
              backgroundColor: muscle.color,
              width: `${Math.max(5, muscle.percentage)}%`,
            }
          ]} 
        />
      </View>
      <ThemedText type="small" themeColor="textSecondary" style={styles.muscleGroupPercent}>
        {muscle.percentage}%
      </ThemedText>
    </View>
  );
}
