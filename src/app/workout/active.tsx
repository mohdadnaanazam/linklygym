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
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

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

// Preset weight increments
const WEIGHT_PRESETS = [2.5, 5, 10, 20, 25];
const REP_PRESETS = [5, 8, 10, 12, 15];

function haptic(kind: 'light' | 'success' | 'medium') {
  if (Platform.OS === 'web') return;
  if (kind === 'success') {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  } else if (kind === 'medium') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
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

  // Calculate workout stats
  const workoutStats = useMemo(() => {
    if (!active) return { totalSets: 0, totalVolume: 0 };
    let totalSets = 0;
    let totalVolume = 0;
    active.exercises.forEach(ex => {
      ex.sets.forEach(set => {
        if (set.completed) {
          totalSets++;
          totalVolume += (set.weight ?? 0) * (set.reps ?? 0);
        }
      });
    });
    return { totalSets, totalVolume };
  }, [active]);

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

          {/* Workout Stats Bar */}
          <View style={[styles.statsBar, { backgroundColor: theme.backgroundElement }]}>
            <View style={styles.statItem}>
              <ThemedText type="small" themeColor="textSecondary">Sets</ThemedText>
              <ThemedText type="smallBold">{workoutStats.totalSets}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.statItem}>
              <ThemedText type="small" themeColor="textSecondary">Volume</ThemedText>
              <ThemedText type="smallBold">{formatWeight(workoutStats.totalVolume, unit)}</ThemedText>
            </View>
            <View style={[styles.statDivider, { backgroundColor: theme.backgroundSelected }]} />
            <View style={styles.statItem}>
              <ThemedText type="small" themeColor="textSecondary">Exercises</ThemedText>
              <ThemedText type="smallBold">{active?.exercises.length ?? 0}</ThemedText>
            </View>
          </View>

          {prBanner ? (
            <Animated.View
              entering={FadeIn.duration(200)}
              exiting={FadeOut.duration(200)}
              style={[styles.prBanner, { backgroundColor: theme.pr }]}
              accessibilityRole="alert"
              accessibilityLabel={`New personal record. ${prBanner}`}>
              <Icon name="trophy" size={18} color="#00120a" />
              <ThemedText type="smallBold" style={styles.prBannerText} numberOfLines={2}>
                New PR! {prBanner}
              </ThemedText>
            </Animated.View>
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
  const [showPresets, setShowPresets] = useState(false);

  // Get previous workout data for suggestions
  const { previous, suggestedWeight, suggestedReps } = useMemo(() => {
    const history = progressRepo.exerciseHistory(detail.exerciseId);
    const last = history[0];
    if (!last || last.topSetKg <= 0) return { previous: null, suggestedWeight: null, suggestedReps: null };
    // Estimate reps from volume: volume = weight * reps, so reps ≈ volume / weight
    const estimatedReps = last.topSetKg > 0 ? Math.round(last.volume / last.topSetKg) : null;
    return {
      previous: `Last: ${formatWeight(last.topSetKg, unit)}`,
      suggestedWeight: last.topSetKg,
      suggestedReps: estimatedReps && estimatedReps > 0 ? Math.min(estimatedReps, 20) : 8,
    };
  }, [detail.exerciseId, unit]);

  // Get the last set in this session for quick repeat
  const lastSet = useMemo(() => {
    if (detail.sets.length === 0) return null;
    return detail.sets[detail.sets.length - 1];
  }, [detail.sets]);

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

  const handleRepeatLast = useCallback(() => {
    if (!lastSet) return;
    haptic('light');
    const prs = logSet(detail.id, { reps: lastSet.reps, weight: lastSet.weight });
    onLogged(prs);
    const restSeconds = (detail as { restSeconds?: number | null }).restSeconds ?? null;
    onSetCompleted(restSeconds);
  }, [lastSet, logSet, detail, onLogged, onSetCompleted]);

  const handleUseSuggested = useCallback(() => {
    if (suggestedWeight) setWeight(formatWeight(suggestedWeight, unit, { withUnit: false }));
    if (suggestedReps) setReps(String(suggestedReps));
    haptic('light');
  }, [suggestedWeight, suggestedReps, unit]);

  const handlePresetWeight = useCallback((preset: number) => {
    const current = weight.trim() === '' ? 0 : Number(weight);
    setWeight(String(current + preset));
    haptic('light');
  }, [weight]);

  const handlePresetReps = useCallback((preset: number) => {
    setReps(String(preset));
    haptic('light');
  }, []);

  const restSeconds = (detail as { restSeconds?: number | null }).restSeconds ?? null;

  const handleToggle = useCallback(
    (setItem: WorkoutSet) => {
      const nextCompleted = !setItem.completed;
      updateSet(setItem.id, { completed: nextCompleted });
      if (nextCompleted) {
        haptic('medium');
        onSetCompleted(restSeconds);
      }
    },
    [updateSet, onSetCompleted, restSeconds]
  );

  const handleRemove = useCallback(
    (setItem: WorkoutSet) => {
      haptic('medium');
      removeSet(setItem.id);
    },
    [removeSet]
  );

  return (
    <Animated.View 
      layout={Layout.springify()}
      style={[styles.block, { backgroundColor: theme.backgroundElement }]}>
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
            <Pressable onPress={handleUseSuggested} accessibilityLabel="Use suggested values">
              <ThemedText type="small" themeColor="accent" numberOfLines={1}>
                {previous} (tap to use)
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>

      {detail.sets.length > 0 ? (
        <View style={styles.setList}>
          {detail.sets.map((setItem) => (
            <SwipeableSetRow
              key={setItem.id}
              set={setItem}
              unit={unit}
              onToggle={() => handleToggle(setItem)}
              onRemove={() => handleRemove(setItem)}
            />
          ))}
        </View>
      ) : null}

      {/* Quick action buttons */}
      <View style={styles.quickActions}>
        {lastSet && (
          <Pressable 
            onPress={handleRepeatLast}
            style={[styles.quickActionButton, { backgroundColor: theme.backgroundSelected }]}
            accessibilityLabel="Repeat last set">
            <Icon name="timer" size={14} color={theme.textSecondary} />
            <ThemedText type="small" themeColor="textSecondary">
              Repeat {lastSet.reps}×{formatWeight(lastSet.weight ?? 0, unit, { withUnit: false })}
            </ThemedText>
          </Pressable>
        )}
        <Pressable 
          onPress={() => setShowPresets(!showPresets)}
          style={[styles.quickActionButton, { backgroundColor: theme.backgroundSelected }]}
          accessibilityLabel="Toggle preset buttons">
          <Icon name="plus" size={14} color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            Presets
          </ThemedText>
        </Pressable>
      </View>

      {/* Preset buttons */}
      {showPresets && (
        <Animated.View 
          entering={FadeIn.duration(150)}
          exiting={FadeOut.duration(150)}
          style={styles.presetsContainer}>
          <View style={styles.presetRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.presetLabel}>
              + Weight:
            </ThemedText>
            {WEIGHT_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => handlePresetWeight(preset)}
                style={[styles.presetChip, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small">+{preset}</ThemedText>
              </Pressable>
            ))}
          </View>
          <View style={styles.presetRow}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.presetLabel}>
              Reps:
            </ThemedText>
            {REP_PRESETS.map((preset) => (
              <Pressable
                key={preset}
                onPress={() => handlePresetReps(preset)}
                style={[styles.presetChip, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small">{preset}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Animated.View>
      )}

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
          title="Log"
          size="sm"
          onPress={handleLog}
          accessibilityLabel={`Log set for ${detail.exercise.name}`}
        />
      </View>
    </Animated.View>
  );
}

function SwipeableSetRow({
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
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = useCallback(() => (
    <Pressable
      onPress={() => {
        swipeableRef.current?.close();
        onRemove();
      }}
      style={[styles.swipeAction, { backgroundColor: theme.danger }]}
      accessibilityLabel="Delete set">
      <Icon name="close" size={20} color="#ffffff" />
    </Pressable>
  ), [onRemove, theme.danger]);

  const renderLeftActions = useCallback(() => (
    <Pressable
      onPress={() => {
        swipeableRef.current?.close();
        onToggle();
      }}
      style={[styles.swipeAction, { backgroundColor: set.completed ? theme.textSecondary : theme.success }]}
      accessibilityLabel={set.completed ? "Mark incomplete" : "Mark complete"}>
      <Icon name="checkmark" size={20} color="#ffffff" />
    </Pressable>
  ), [onToggle, set.completed, theme.success, theme.textSecondary]);

  const repsLabel = set.reps != null ? `${set.reps} reps` : '— reps';
  const weightLabel = set.weight != null ? formatWeight(set.weight, unit) : `— ${unit}`;

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}>
      <Animated.View 
        layout={Layout.springify()}
        style={[
          styles.setRow,
          set.completed && styles.setRowCompleted,
        ]}>
        <View style={[styles.setNumber, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold">{set.setNumber}</ThemedText>
        </View>
        <ThemedText 
          type="small" 
          style={[styles.setText, set.completed && styles.setTextCompleted]}>
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
      </Animated.View>
    </Swipeable>
  );
}
