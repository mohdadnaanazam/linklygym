import { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseRow, EXERCISE_ROW_HEIGHT } from '@/components/exercises/exercise-row';
import { ExerciseSearchBar } from '@/components/exercises/exercise-search-bar';
import { EmptyState } from '@/components/ui/empty-state';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconButton } from '@/components/ui/icon-button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Spacing } from '@/constants/theme';
import { exercisesRepo } from '@/db/repositories';
import type { Exercise } from '@/db/schema';

const PICKER_LIMIT = 60;

export type ExercisePickerSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (exerciseId: string) => void;
};

export function ExercisePickerSheet({ visible, onClose, onSelect }: ExercisePickerSheetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Exercise[]>([]);

  useEffect(() => {
    if (visible) setQuery('');
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    setResults(exercisesRepo.search(query, { limit: PICKER_LIMIT }));
  }, [visible, query]);

  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      onClose();
    },
    [onSelect, onClose]
  );

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => (
      <ExerciseRow exercise={item} onPress={handleSelect} />
    ),
    [handleSelect]
  );

  const keyExtractor = useCallback((item: Exercise) => item.id, []);

  const getItemLayout = useCallback(
    (_data: ArrayLike<Exercise> | null | undefined, index: number) => ({
      length: EXERCISE_ROW_HEIGHT,
      offset: EXERCISE_ROW_HEIGHT * index,
      index,
    }),
    []
  );

  const empty = useMemo(
    () => (
      <EmptyState
        icon="search"
        title="No exercises found"
        message="Try a different search term."
      />
    ),
    []
  );

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
          <SafeAreaView edges={['bottom']} style={styles.fill}>
            <SheetHeader
              title="Add exercise"
              left={
                <IconButton
                  name="close"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  size={18}
                />
              }
            />
            <View style={styles.searchWrap}>
              <ExerciseSearchBar value={query} onChangeText={setQuery} />
            </View>
            <FlatList
              data={results}
              renderItem={renderItem}
              keyExtractor={keyExtractor}
              getItemLayout={getItemLayout}
              initialNumToRender={12}
              maxToRenderPerBatch={12}
              windowSize={11}
              removeClippedSubviews
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={[
                styles.listContent,
                results.length === 0 && styles.listContentEmpty,
              ]}
              ListEmptyComponent={empty}
            />
          </SafeAreaView>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
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
    height: '85%',
  },
  searchWrap: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listContent: {
    paddingBottom: Spacing.four,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
});

export default ExercisePickerSheet;
