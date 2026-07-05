import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, TextInput, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  ReorderableExerciseList,
  type RoutineExerciseItem,
} from '@/components/routines/reorderable-exercise-list';
import { ExercisePickerSheet } from '@/components/exercises/exercise-picker-sheet';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { routinesRepo, settingsRepo } from '@/db/repositories';
import type { RoutineExercisePatch } from '@/db/repositories/routines-repo';
import type { Routine } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { styles } from './[id].styles';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

export default function RoutineEditorScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const routineId = useMemo(() => Number(id), [id]);

  const unit = useMemo(() => settingsRepo.get().weightUnit, []);

  const [routine, setRoutine] = useState<Routine | undefined>();
  const [exercises, setExercises] = useState<RoutineExerciseItem[]>([]);
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragging, setDragging] = useState(false);

  const load = useCallback(() => {
    if (!Number.isFinite(routineId)) {
      setLoaded(true);
      return;
    }
    const detail = routinesRepo.getById(routineId);
    if (detail) {
      setRoutine(detail.routine);
      setExercises(detail.exercises);
      setName(detail.routine.name);
      setNote(detail.routine.note ?? '');
    } else {
      setRoutine(undefined);
    }
    setLoaded(true);
  }, [routineId]);

  useEffect(() => {
    load();
  }, [load]);

  const persistMeta = useCallback(() => {
    if (!routine) return;
    const trimmedName = name.trim().length > 0 ? name.trim() : 'Untitled routine';
    routinesRepo.update(routineId, {
      name: trimmedName,
      note: note.trim().length > 0 ? note.trim() : null,
    });
  }, [routine, routineId, name, note]);

  const handleAddExercise = useCallback(
    (exerciseId: string) => {
      routinesRepo.addExercise(routineId, {
        exerciseId,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
      });
      load();
    },
    [routineId, load]
  );

  const handlePatch = useCallback(
    (routineExerciseId: number, patch: RoutineExercisePatch) => {
      routinesRepo.updateExercise(routineExerciseId, patch);
      setExercises((prev) =>
        prev.map((ex) => (ex.id === routineExerciseId ? { ...ex, ...patch } : ex))
      );
    },
    []
  );

  const handleRemove = useCallback(
    (item: RoutineExerciseItem) => {
      Alert.alert(
        'Remove exercise',
        `Remove ${item.exercise.name} from this routine?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              routinesRepo.removeExercise(item.id);
              load();
            },
          },
        ]
      );
    },
    [load]
  );

  const handleReorder = useCallback(
    (orderedIds: number[]) => {
      routinesRepo.reorderExercises(routineId, orderedIds);
      setExercises((prev) => {
        const byId = new Map(prev.map((ex) => [ex.id, ex]));
        return orderedIds
          .map((exId) => byId.get(exId))
          .filter((ex): ex is RoutineExerciseItem => ex != null);
      });
    },
    [routineId]
  );

  const handleDelete = useCallback(() => {
    Alert.alert(
      'Delete routine',
      'This permanently deletes the routine and its exercises.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            routinesRepo.delete(routineId);
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)/train');
          },
        },
      ]
    );
  }, [routineId]);

  const handleBack = useCallback(() => {
    persistMeta();
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/train');
  }, [persistMeta]);

  if (loaded && !routine) {
    return (
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <EmptyState
            icon="train"
            title="Routine not found"
            message="This routine no longer exists."
            actionLabel="Go back"
            onAction={handleBack}
          />
        </SafeAreaView>
      </ThemedView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.fill}>
      <ThemedView style={styles.fill}>
        <Stack.Screen options={{ headerShown: false }} />
        <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
          <View style={styles.topBar}>
            <IconButton
              name="chevron-left"
              accessibilityLabel="Save and go back"
              onPress={handleBack}
            />
            <ThemedText type="smallBold">Edit routine</ThemedText>
            <IconButton
              name="close"
              color={theme.danger}
              accessibilityLabel="Delete routine"
              onPress={handleDelete}
            />
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            scrollEnabled={!dragging}>
            <View style={styles.metaFields}>
              <TextInput
                value={name}
                onChangeText={setName}
                onBlur={persistMeta}
                onEndEditing={persistMeta}
                placeholder="Routine name"
                placeholderTextColor={theme.textSecondary}
                style={[styles.nameInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Routine name"
                returnKeyType="done"
              />
              <TextInput
                value={note}
                onChangeText={setNote}
                onBlur={persistMeta}
                onEndEditing={persistMeta}
                placeholder="Add a note (optional)"
                placeholderTextColor={theme.textSecondary}
                style={[styles.noteInput, { color: theme.text, backgroundColor: theme.backgroundElement }]}
                accessibilityLabel="Routine note"
                multiline
              />
            </View>

            <View style={styles.sectionHeader}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                EXERCISES
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {exercises.length > 1 ? 'Hold the handle to reorder' : ''}
              </ThemedText>
            </View>

            {exercises.length === 0 ? (
              <View style={styles.emptyWrap}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.emptyText}>
                  No exercises yet. Add one to get started.
                </ThemedText>
              </View>
            ) : (
              <ReorderableExerciseList
                items={exercises}
                unit={unit}
                onReorder={handleReorder}
                onPatch={handlePatch}
                onRemove={handleRemove}
                onDraggingChange={setDragging}
              />
            )}

            <View style={styles.addWrap}>
              <Button
                title="Add exercise"
                variant="secondary"
                fullWidth
                onPress={() => setPickerOpen(true)}
                leading={<Icon name="plus" size={18} color={theme.text} />}
                accessibilityLabel="Add an exercise to this routine"
              />
            </View>
          </ScrollView>
        </SafeAreaView>

        <ExercisePickerSheet
          visible={pickerOpen}
          onClose={() => setPickerOpen(false)}
          onSelect={handleAddExercise}
        />
      </ThemedView>
    </GestureHandlerRootView>
  );
}
