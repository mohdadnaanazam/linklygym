import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Stack, router } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import { RestTimerBar } from '@/components/workout/rest-timer-bar';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { progressRepo, settingsRepo } from '@/db/repositories';
import type { WorkoutExerciseDetail } from '@/db/repositories/workouts-repo';
import type { WorkoutSet } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, fromDisplay, type WeightUnit } from '@/lib/units';
import { useSessionStore, type DetectedPR } from '@/stores/session-store';
import { useTimerStore } from '@/stores/timer-store';

import { styles } from './active.styles';

const DEFAULT_REST_SEC = 90;

function haptic(kind: 'light' | 'success') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

function formatElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const mm = String(minutes).padStart(hours > 0 ? 2 : 1, '0');
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${mm}:${ss}` : `${mm}:${ss}`;
}

function prLabel(pr: DetectedPR, unit: WeightUnit): string {
  switch (pr.metric) {
    case 'max_weight':
      return `Heaviest set · ${formatWeight(pr.value, unit)}`;
    case 'est_1rm':
      return `Best est. 1RM · ${formatWeight(pr.value, unit)}`;
    case 'max_volume':
      return `Best set volume · ${formatWeight(pr.value, unit)}`;
    default:
      return 'New personal record';
  }
}

export default function ActiveWorkoutScreen() {
  const theme = useTheme();
  const active = useSessionStore((s) => s.active);
  const loading = useSessionStore((s) => s.loading);
  const load = useSessionStore((s) => s.load);
  const addExercise = useSessionStore((s) => s.addExercise);
  const finish = useSessionStore((s) => s.finish);
  const cancel = useSessionStore((s) => s.cancel);
  const startTimer = useTimerStore((s) => s.start);
  const stopTimer = useTimerStore((s) => s.stop);

  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);

  const startRest = useCallback(
    (restSeconds?: number | null) => {
      const configured = settingsRepo.get().defaultRestSec ?? DEFAULT_REST_SEC;
      const seconds =
        restSeconds != null && restSeconds > 0 ? restSeconds : configured;
      startTimer(seconds);
    },
    [startTimer]
  );

  const [pickerOpen, setPickerOpen] = useState(false);
  const [prBanner, setPrBanner] = useState<string | null>(null);
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    load();
  }, [load]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, [active]);

  useEffect(() => {
    return () => {
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showPrBanner = useCallback((prs: DetectedPR[]) => {
    if (prs.length === 0) return;
    haptic('success');
    const label = prs.map((pr) => prLabel(pr, unit)).join('  •  ');
    setPrBanner(label);
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    bannerTimer.current = setTimeout(() => setPrBanner(null), 3200);
  }, [unit]);

  const goToTrain = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/train');
  }, []);

  const handleCancel = useCallback(() => {
    Alert.alert(
      'Discard workout?',
      'This deletes the current session and everything logged so far.',
      [
        { text: 'Keep training', style: 'cancel' },
        {
          text: 'Discard',
          style: 'destructive',
          onPress: () => {
            stopTimer();
            cancel();
            goToTrain();
          },
        },
      ]
    );
  }, [cancel, goToTrain, stopTimer]);

  const handleFinish = useCallback(() => {
    Alert.alert('Finish workout?', 'Save this session to your history.', [
      { text: 'Not yet', style: 'cancel' },
      {
        text: 'Finish',
        onPress: () => {
          stopTimer();
          const id = finish();
          haptic('success');
          if (id != null) router.replace(`/workout/${id}`);
          else goToTrain();
        },
      },
    ]);
  }, [finish, goToTrain, stopTimer]);

  if (!active && !loading) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <EmptyState
            icon="train"
            title="No workout in progress"
            message="Start a workout from one of your routines or an empty session."
            actionLabel="Start a workout"
            onAction={goToTrain}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  const elapsed = active ? formatElapsed(now - active.workout.startedAt) : '0:00';

  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <SheetHeader
            title={elapsed}
            subtitle="Active workout"
            left={
              <IconButton
                name="close"
                color={theme.danger}
                accessibilityLabel="Cancel workout"
                onPress={handleCancel}
              />
            }
            right={
              <Button
                title="Finish"
                size="sm"
                onPress={handleFinish}
                accessibilityLabel="Finish and save workout"
              />
            }
          />

          {prBanner ? (
            <View
              style={[styles.prBanner, { backgroundColor: theme.pr }]}
              accessibilityRole="alert"
              accessibilityLabel={`New personal record. ${prBanner}`}>
              <Icon name="trophy" size={18} color="#00120a" />
              <ThemedText type="smallBold" style={styles.prBannerText} numberOfLines={2}>
                New PR! {prBanner}
              </ThemedText>
            </View>
          ) : null}

          <KeyboardAvoidingView
            style={styles.fill}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <ScrollView
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag">
              {active && active.exercises.length === 0 ? (
                <View style={styles.emptyBody}>
                  <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                    No exercises yet. Add one to start logging sets.
                  </ThemedText>
                </View>
              ) : (
                active?.exercises.map((exercise) => (
                  <ExerciseBlock
                    key={exercise.id}
                    detail={exercise}
                    unit={unit}
                    onLogged={showPrBanner}
                    onSetCompleted={startRest}
                  />
                ))
              )}

              <View style={styles.addWrap}>
                <Button
                  title="Add exercise"
                  variant="secondary"
                  fullWidth
                  onPress={() => setPickerOpen(true)}
                  leading={<Icon name="plus" size={18} color={theme.text} />}
                  accessibilityLabel="Add an exercise to this workout"
                />
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </SafeAreaView>

        <RestTimerBar />

        <ExercisePickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={addExercise}
        />
      </ThemedView>
    </GestureHandlerRootView>
  );
}

const BLUR_HASH = 'L184i9offQof00ayfQay~qfQfQfQ';

function ExerciseBlock({
  detail,
  unit,
  onLogged,
  onSetCompleted,
}: {
  detail: WorkoutExerciseDetail;
  unit: WeightUnit;
  onLogged: (prs: DetectedPR[]) => void;
  onSetCompleted: (restSeconds?: number | null) => void;
}) {
  const theme = useTheme();
  const logSet = useSessionStore((s) => s.logSet);
  const updateSet = useSessionStore((s) => s.updateSet);
  const removeSet = useSessionStore((s) => s.removeSet);

  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');

  const previous = useMemo(() => {
    const history = progressRepo.exerciseHistory(detail.exerciseId);
    const last = history[0];
    if (!last || last.topSetKg <= 0) return null;
    return `Last: ${formatWeight(last.topSetKg, unit)} top set`;
  }, [detail.exerciseId, unit]);

  const handleLog = useCallback(() => {
    const parsedReps = reps.trim() === '' ? null : Number(reps);
    const parsedWeightDisplay = weight.trim() === '' ? null : Number(weight);
    if (parsedReps !== null && !Number.isFinite(parsedReps)) return;
    if (parsedWeightDisplay !== null && !Number.isFinite(parsedWeightDisplay)) return;

    const weightKg =
      parsedWeightDisplay === null ? null : fromDisplay(parsedWeightDisplay, unit);

    haptic('light');
    const prs = logSet(detail.id, { reps: parsedReps, weight: weightKg });
    onLogged(prs);
    const restSeconds = (detail as { restSeconds?: number | null }).restSeconds ?? null;
    onSetCompleted(restSeconds);
    setReps('');
    setWeight('');
  }, [reps, weight, unit, logSet, detail, onLogged, onSetCompleted]);

  const restSeconds = (detail as { restSeconds?: number | null }).restSeconds ?? null;

  const handleToggle = useCallback(
    (setItem: WorkoutSet) => {
      const nextCompleted = !setItem.completed;
      updateSet(setItem.id, { completed: nextCompleted });
      if (nextCompleted) onSetCompleted(restSeconds);
    },
    [updateSet, onSetCompleted, restSeconds]
  );

  const handleRemove = useCallback(
    (setItem: WorkoutSet) => {
      Alert.alert('Remove set', `Remove set ${setItem.setNumber}?`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Remove', style: 'destructive', onPress: () => removeSet(setItem.id) },
      ]);
    },
    [removeSet]
  );

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
            <Icon name="exercises" size={22} color={theme.textSecondary} />
          )}
        </View>
        <View style={styles.blockHeaderText}>
          <ThemedText type="default" numberOfLines={1} style={styles.blockTitle}>
            {detail.exercise.name}
          </ThemedText>
          {previous ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {previous}
            </ThemedText>
          ) : null}
        </View>
      </View>

      {detail.sets.length > 0 ? (
        <View style={styles.setList}>
          {detail.sets.map((setItem) => (
            <SetRow
              key={setItem.id}
              set={setItem}
              unit={unit}
              onToggle={() => handleToggle(setItem)}
              onRemove={() => handleRemove(setItem)}
            />
          ))}
        </View>
      ) : null}

      <View style={styles.entryRow}>
        <TextInput
          value={reps}
          onChangeText={setReps}
          placeholder="Reps"
          placeholderTextColor={theme.textSecondary}
          keyboardType="number-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
          accessibilityLabel={`Reps for ${detail.exercise.name}`}
          returnKeyType="done"
        />
        <TextInput
          value={weight}
          onChangeText={setWeight}
          placeholder={`Weight (${unit})`}
          placeholderTextColor={theme.textSecondary}
          keyboardType="decimal-pad"
          style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundSelected }]}
          accessibilityLabel={`Weight in ${unit} for ${detail.exercise.name}`}
          returnKeyType="done"
        />
        <Button
          title="Log set"
          size="sm"
          onPress={handleLog}
          accessibilityLabel={`Log set for ${detail.exercise.name}`}
        />
      </View>
    </View>
  );
}

function SetRow({
  set,
  unit,
  onToggle,
  onRemove,
}: {
  set: WorkoutSet;
  unit: WeightUnit;
  onToggle: () => void;
  onRemove: () => void;
}) {
  const theme = useTheme();
  const repsLabel = set.reps != null ? `${set.reps} reps` : '— reps';
  const weightLabel =
    set.weight != null ? formatWeight(set.weight, unit) : `— ${unit}`;

  return (
    <Pressable
      onLongPress={onRemove}
      accessibilityRole="button"
      accessibilityLabel={`Set ${set.setNumber}: ${repsLabel} at ${weightLabel}${
        set.isPr ? ', personal record' : ''
      }. Long press to remove.`}
      style={styles.setRow}>
      <View style={[styles.setNumber, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold">{set.setNumber}</ThemedText>
      </View>
      <ThemedText type="small" style={styles.setText}>
        {repsLabel} · {weightLabel}
      </ThemedText>
      {set.isPr ? (
        <Icon name="trophy" size={16} color={theme.pr} />
      ) : null}
      <IconButton
        name="checkmark"
        size={16}
        diameter={32}
        filled
        color={set.completed ? theme.success : theme.textSecondary}
        accessibilityLabel={
          set.completed
            ? `Mark set ${set.setNumber} incomplete`
            : `Mark set ${set.setNumber} complete`
        }
        onPress={onToggle}
      />
    </Pressable>
  );
}
