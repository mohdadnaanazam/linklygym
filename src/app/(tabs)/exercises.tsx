import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  EXERCISE_ROW_HEIGHT,
  ExerciseRow,
} from '@/components/exercises/exercise-row';
import { ExerciseSearchBar } from '@/components/exercises/exercise-search-bar';
import { ExerciseFilterSheet } from '@/components/exercises/exercise-filter-sheet';
import { exercisesRepo, favoritesRepo } from '@/db/repositories';
import type { Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseList } from '@/hooks/use-exercise-list';

import { styles } from './exercises.styles';

type ExerciseMode = 'all' | 'favorites';

const MODE_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'favorites' as const, label: 'Favorites' },
];

export default function ExercisesScreen() {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<ExerciseMode>('all');
  const [favorites, setFavorites] = useState<Exercise[]>([]);

  const facets = useMemo(() => exercisesRepo.facets(), []);

  const {
    query,
    setQuery,
    filters,
    toggleFilter,
    clearFilters,
    activeFilterCount,
    hasActiveQuery,
    results,
    total,
    loading,
    loadingMore,
    loadMore,
    catalogEmpty,
  } = useExerciseList();

  useFocusEffect(
    useCallback(() => {
      setFavorites(favoritesRepo.listFavorites());
    }, [])
  );

  const handleModeChange = useCallback((next: ExerciseMode) => {
    setMode(next);
    if (next === 'favorites') {
      setFavorites(favoritesRepo.listFavorites());
    }
  }, []);

  const handleRowPress = useCallback((id: string) => {
    router.push(`/exercise/${id}`);
  }, []);

  const handleClearAll = useCallback(() => {
    clearFilters();
    setQuery('');
  }, [clearFilters, setQuery]);

  const renderItem = useCallback(
    ({ item }: { item: Exercise }) => <ExerciseRow exercise={item} onPress={handleRowPress} />,
    [handleRowPress]
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

  const isFavorites = mode === 'favorites';

  const listEmpty = useMemo(() => {
    if (isFavorites) {
      return (
        <EmptyState
          icon="heart"
          title="No favorites yet"
          message="Tap the heart on an exercise to save it here."
        />
      );
    }
    if (loading) {
      return (
        <View style={styles.centerFill}>
          <ActivityIndicator color={theme.accent} />
        </View>
      );
    }
    if (catalogEmpty) {
      return (
        <EmptyState
          icon="exercises"
          title="No exercises yet"
          message="Your exercise library hasn't synced. Connect to the internet to download the catalog."
        />
      );
    }
    return (
      <EmptyState
        icon="search"
        title="No exercises found"
        message="Try a different search or adjust your filters."
        actionLabel={hasActiveQuery ? 'Clear filters' : undefined}
        onAction={hasActiveQuery ? handleClearAll : undefined}
      />
    );
  }, [isFavorites, loading, catalogEmpty, hasActiveQuery, handleClearAll, theme.accent]);

  const listFooter = !isFavorites && loadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator color={theme.textSecondary} />
    </View>
  ) : null;

  const data = isFavorites ? favorites : results;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Exercises</ThemedText>
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleModeChange}
          />
          {isFavorites ? null : (
            <View style={styles.controls}>
              <View style={styles.searchWrap}>
                <ExerciseSearchBar value={query} onChangeText={setQuery} />
              </View>
              <Pressable
                onPress={() => setFiltersOpen(true)}
                accessibilityRole="button"
                accessibilityLabel={
                  activeFilterCount > 0
                    ? `Filters, ${activeFilterCount} active`
                    : 'Filters'
                }
                style={({ pressed }) => [
                  styles.filterButton,
                  {
                    backgroundColor:
                      activeFilterCount > 0 ? theme.accent : theme.backgroundElement,
                  },
                  pressed && styles.pressed,
                ]}>
                <Icon
                  name="filter"
                  size={18}
                  color={activeFilterCount > 0 ? '#ffffff' : theme.text}
                />
                {activeFilterCount > 0 ? (
                  <View style={[styles.badge, { backgroundColor: theme.background }]}>
                    <ThemedText type="small" style={styles.badgeText}>
                      {activeFilterCount}
                    </ThemedText>
                  </View>
                ) : null}
              </Pressable>
            </View>
          )}
        </View>

        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={11}
          removeClippedSubviews
          onEndReached={isFavorites ? undefined : loadMore}
          onEndReachedThreshold={0.4}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={[
            styles.listContent,
            data.length === 0 && styles.listContentEmpty,
          ]}
          ListEmptyComponent={listEmpty}
          ListFooterComponent={listFooter}
        />
      </SafeAreaView>

      <ExerciseFilterSheet
        visible={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        facets={facets}
        filters={filters}
        onToggle={toggleFilter}
        onClearAll={clearFilters}
        activeFilterCount={activeFilterCount}
        resultCount={total}
      />
    </ThemedView>
  );
}
