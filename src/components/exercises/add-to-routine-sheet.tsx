import { useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ListRow } from '@/components/ui/list-row';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Spacing } from '@/constants/theme';
import { routinesRepo } from '@/db/repositories';
import type { Routine } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = 10;

export type AddToRoutineSheetProps = {
  visible: boolean;
  onClose: () => void;
  exerciseId: string;
  exerciseName: string;
  onAdded?: (routineName: string) => void;
};

export function AddToRoutineSheet({
  visible,
  onClose,
  exerciseId,
  exerciseName,
  onAdded,
}: AddToRoutineSheetProps) {
  const theme = useTheme();
  const [routines, setRoutines] = useState<Routine[]>([]);

  const refresh = useCallback(() => {
    setRoutines(routinesRepo.list());
  }, []);

  useEffect(() => {
    if (visible) refresh();
  }, [visible, refresh]);

  const addToRoutine = useCallback(
    (routineId: number, routineName: string) => {
      routinesRepo.addExercise(routineId, {
        exerciseId,
        targetSets: DEFAULT_TARGET_SETS,
        targetReps: DEFAULT_TARGET_REPS,
      });
      onAdded?.(routineName);
      onClose();
    },
    [exerciseId, onAdded, onClose]
  );

  const createAndAdd = useCallback(() => {
    const name = `Routine ${routines.length + 1}`;
    const routineId = routinesRepo.create({
      name,
      exercises: [
        {
          exerciseId,
          targetSets: DEFAULT_TARGET_SETS,
          targetReps: DEFAULT_TARGET_REPS,
        },
      ],
    });
    if (routineId) {
      onAdded?.(name);
      onClose();
    }
  }, [exerciseId, routines.length, onAdded, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheetWrap} pointerEvents="box-none">
        <GlassSurface borderRadius={Spacing.four} style={styles.sheet}>
          <SafeAreaView edges={['bottom']}>
            <SheetHeader
              title="Add to routine"
              subtitle={exerciseName}
              left={
                <IconButton
                  name="close"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  size={18}
                />
              }
            />

            {routines.length === 0 ? (
              <View style={styles.emptyWrap}>
                <EmptyState
                  icon="train"
                  title="No routines yet"
                  message="Create a routine to add this exercise."
                  actionLabel="Create new routine"
                  onAction={createAndAdd}
                />
              </View>
            ) : (
              <ScrollView
                style={styles.list}
                contentContainerStyle={styles.listContent}
                keyboardShouldPersistTaps="handled">
                {routines.map((routine) => (
                  <ListRow
                    key={routine.id}
                    title={routine.name}
                    subtitle={routine.note ?? undefined}
                    leading={
                      <Icon name="train" size={22} color={theme.textSecondary} />
                    }
                    chevron
                    onPress={() => addToRoutine(routine.id, routine.name)}
                    accessibilityLabel={`Add ${exerciseName} to ${routine.name}`}
                  />
                ))}

                <View style={styles.createWrap}>
                  <Button
                    title="Create new routine"
                    variant="secondary"
                    fullWidth
                    onPress={createAndAdd}
                    leading={<Icon name="plus" size={18} color={theme.text} />}
                    accessibilityLabel="Create new routine and add exercise"
                  />
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '80%',
  },
  emptyWrap: {
    minHeight: 260,
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: Spacing.three,
  },
  createWrap: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
  },
});

export default AddToRoutineSheet;
