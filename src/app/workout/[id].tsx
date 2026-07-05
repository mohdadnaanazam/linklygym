import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { settingsRepo, workoutsRepo } from '@/db/repositories';
import type { WorkoutExerciseDetail } from '@/db/repositories/workouts-repo';
import type { WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, type WeightUnit } from '@/lib/units';

import { styles } from './[id].styles';

const BLUR_HASH = 'L184i9offQof00ayfQay~qfQfQfQ';

function formatWorkoutDate(epochMs: number): string {
  const date = new Date(epochMs);
  const day = date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const time = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });
  return `${day} · ${time}`;
}

function formatDuration(durationSec: number | null): string {
  const total = Math.max(0, durationSec ?? 0);
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

export default function WorkoutDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const workoutId = useMemo(() => Number(id), [id]);
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);

  const detail = useMemo(
    () => (Number.isFinite(workoutId) ? workoutsRepo.getById(workoutId) : undefined),
    [workoutId]
  );

  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/history');
  }, []);

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete workout',
      'This permanently removes this workout and all of its logged sets.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            workoutsRepo.deleteById(workoutId);
            goBack();
          },
        },
      ]
    );
  }, [workoutId, goBack]);

  if (!detail) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ title: 'Workout' }} />
        <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
          <EmptyState
            icon="train"
            title="Workout not found"
            message="This workout no longer exists."
            actionLabel="Go back"
            onAction={goBack}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const { workout, exercises } = detail;
  const totalSets = exercises.reduce((sum, ex) => sum + ex.sets.length, 0);
  const prCount = exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((set) => set.isPr).length,
    0
  );

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen
        options={{
          title: 'Workout',
          headerRight: () => (
            <IconButton
              name="close"
              size={20}
              diameter={36}
              color={theme.danger}
              accessibilityLabel="Delete this workout"
              onPress={handleDelete}
            />
          ),
        }}
      />
      <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
        <ScrollView contentContainerStyle={styles.content}>
          <Card style={styles.summary}>
            <ThemedText type="smallBold">{formatWorkoutDate(workout.startedAt)}</ThemedText>
            <View style={styles.statsRow}>
              <SummaryStat label="Duration" value={formatDuration(workout.durationSec)} />
              <SummaryStat label="Volume" value={formatWeight(workout.totalVolume ?? 0, unit)} />
              <SummaryStat label="Sets" value={String(totalSets)} />
              <SummaryStat label="PRs" value={String(prCount)} />
            </View>
          </Card>

          {exercises.length === 0 ? (
            <ThemedText type="small" themeColor="textSecondary" style={styles.noExercises}>
              No exercises were logged in this workout.
            </ThemedText>
          ) : (
            exercises.map((exercise) => (
              <ExerciseSummary key={exercise.id} detail={exercise} unit={unit} />
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <ThemedText type="default" style={styles.statValue}>
        {value}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
    </View>
  );
}

function ExerciseSummary({
  detail,
  unit,
}: {
  detail: WorkoutExerciseDetail;
  unit: WeightUnit;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.block, { backgroundColor: theme.backgroundElement }]}>
      <View style={styles.blockHeader}>
        <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]}>
          {detail.exercise.gifUrl ? (
            <Image
              source={{ uri: detail.exercise.gifUrl }}
              style={styles.thumbImage}
              contentFit="cover"
              placeholder={{ blurhash: BLUR_HASH }}
              transition={150}
              cachePolicy="disk"
              accessible={false}
            />
          ) : (
            <Icon name="exercises" size={20} color={theme.textSecondary} />
          )}
        </View>
        <ThemedText type="default" numberOfLines={1} style={styles.blockTitle}>
          {detail.exercise.name}
        </ThemedText>
      </View>

      {detail.sets.length > 0 ? (
        <View style={styles.setList}>
          {detail.sets.map((set) => (
            <SetSummaryRow key={set.id} set={set} unit={unit} />
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          No sets logged.
        </ThemedText>
      )}
    </View>
  );
}

function SetSummaryRow({ set, unit }: { set: WorkoutSet; unit: WeightUnit }) {
  const theme = useTheme();
  const repsLabel = set.reps != null ? `${set.reps} reps` : '— reps';
  const weightLabel = set.weight != null ? formatWeight(set.weight, unit) : `— ${unit}`;

  return (
    <View
      style={styles.setRow}
      accessibilityRole="text"
      accessibilityLabel={`Set ${set.setNumber}: ${repsLabel} at ${weightLabel}${
        set.isPr ? ', personal record' : ''
      }`}>
      <View style={[styles.setNumber, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">{set.setNumber}</ThemedText>
      </View>
      <ThemedText type="small" style={styles.setText}>
        {repsLabel} · {weightLabel}
      </ThemedText>
      {set.isPr ? <Icon name="trophy" size={16} color={theme.pr} /> : null}
    </View>
  );
}
