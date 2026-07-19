import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { SegmentedControl } from '@/components/ui/segmented-control';
import {
  EXERCISE_ROW_HEIGHT,
  ExerciseRow,
} from '@/components/exercises/exercise-row';
import { ExerciseSearchBar } from '@/components/exercises/exercise-search-bar';
import { ExerciseFilterSheet } from '@/components/exercises/exercise-filter-sheet';
import { exercisesRepo, favoritesRepo, workoutsRepo } from '@/db/repositories';
import type { Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { useExerciseList } from '@/hooks/use-exercise-list';

import { styles } from './exercises.styles';

type ExerciseMode = 'all' | 'favorites' | 'recent';

const MODE_OPTIONS = [
  { value: 'all' as const, label: 'All' },
  { value: 'favorites' as const, label: 'Favorites' },
  { value: 'recent' as const, label: 'Recent' },
];

// Muscle group quick filters with colors
const MUSCLE_GROUPS = [
  { id: 'chest', name: 'Chest', color: '#FF6B6B', icon: '💪' },
  { id: 'back', name: 'Back', color: '#4ECDC4', icon: '🔙' },
  { id: 'shoulders', name: 'Shoulders', color: '#45B7D1', icon: '🎯' },
  { id: 'biceps', name: 'Biceps', color: '#96CEB4', icon: '💪' },
  { id: 'triceps', name: 'Triceps', color: '#DDA0DD', icon: '💪' },
  { id: 'abs', name: 'Abs', color: '#F7DC6F', icon: '🔥' },
  { id: 'quads', name: 'Quads', color: '#FF8C42', icon: '🦵' },
  { id: 'hamstrings', name: 'Hamstrings', color: '#98D8C8', icon: '🦵' },
  { id: 'glutes', name: 'Glutes', color: '#C9B1FF', icon: '🍑' },
  { id: 'calves', name: 'Calves', color: '#FFB6C1', icon: '🦶' },
];

export default function ExercisesScreen() {
  const theme = useTheme();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mode, setMode] = useState<ExerciseMode>('all');
  const [favorites, setFavorites] = useState<Exercise[]>([]);
  const [recentExercises, setRecentExercises] = useState<Exercise[]>([]);
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);

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

  // Load recent exercises from workout history
  const loadRecentExercises = useCallback(() => {
    const workouts = workoutsRepo.list().slice(0, 10); // Last 10 workouts
    const exerciseIds = new Set<string>();
    const recentList: Exercise[] = [];
    
    workouts.forEach(workout => {
      const detail = workoutsRepo.getById(workout.id);
      if (detail) {
        detail.exercises.forEach(ex => {
          if (!exerciseIds.has(ex.exerciseId)) {
            exerciseIds.add(ex.exerciseId);
            const exercise = exercisesRepo.getById(ex.exerciseId);
            if (exercise) recentList.push(exercise);
          }
        });
      }
    });
    
    setRecentExercises(recentList.slice(0, 20)); // Top 20 recent
  }, []);

  useFocusEffect(
    useCallback(() => {
      setFavorites(favoritesRepo.listFavorites());
      loadRecentExercises();
    }, [loadRecentExercises])
  );

  const handleModeChange = useCallback((next: ExerciseMode) => {
    setMode(next);
    setSelectedMuscleGroup(null);
    if (next === 'favorites') {
      setFavorites(favoritesRepo.listFavorites());
    } else if (next === 'recent') {
      loadRecentExercises();
    }
  }, [loadRecentExercises]);

  const handleRowPress = useCallback((id: string) => {
    router.push(`/exercise/${id}`);
  }, []);

  const handleClearAll = useCallback(() => {
    clearFilters();
    setQuery('');
    setSelectedMuscleGroup(null);
  }, [clearFilters, setQuery]);

  const handleMuscleGroupPress = useCallback((muscleId: string) => {
    if (selectedMuscleGroup === muscleId) {
      setSelectedMuscleGroup(null);
      clearFilters();
    } else {
      setSelectedMuscleGroup(muscleId);
      // Find the matching muscle in facets
      const muscleValue = facets.muscles.find(m => 
        m.toLowerCase().includes(muscleId.toLowerCase())
      );
      if (muscleValue) {
        clearFilters();
        toggleFilter('targetMuscles', muscleValue);
      }
    }
  }, [selectedMuscleGroup, facets.muscles, clearFilters, toggleFilter]);

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
  const isRecent = mode === 'recent';
  const isAll = mode === 'all';

  // Filter results by selected muscle group if in 'all' mode
  const filteredResults = useMemo(() => {
    if (!isAll || !selectedMuscleGroup) return results;
    return results;
  }, [isAll, selectedMuscleGroup, results]);

  const listEmpty = useMemo(() => {
    if (isFavorites) {
      return (
        <EmptyState
          icon="heart"
          title="No favorites yet"
          message="Tap the heart on an exercise to save it here for quick access."
        />
      );
    }
    if (isRecent) {
      return (
        <EmptyState
          icon="timer"
          title="No recent exercises"
          message="Your recently used exercises will appear here after your first workout."
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
  }, [isFavorites, isRecent, loading, catalogEmpty, hasActiveQuery, handleClearAll, theme.accent]);

  const listFooter = isAll && loadingMore ? (
    <View style={styles.footer}>
      <ActivityIndicator color={theme.textSecondary} />
    </View>
  ) : null;

  const data = isFavorites ? favorites : isRecent ? recentExercises : filteredResults;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <ThemedText type="subtitle">Exercises</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {total} total
            </ThemedText>
          </View>
          
          <SegmentedControl
            options={MODE_OPTIONS}
            value={mode}
            onChange={handleModeChange}
          />
          
          {isAll && (
            <>
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
                    color={activeFilterCount > 0 ? theme.accentForeground : theme.text}
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

              {/* Muscle Group Quick Filters */}
              <View style={styles.muscleGroupSection}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.muscleGroupLabel}>
                  Quick filter by muscle
                </ThemedText>
                <ScrollView 
                  horizontal 
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.muscleGroupRow}>
                  {MUSCLE_GROUPS.map((muscle) => (
                    <MuscleGroupChip
                      key={muscle.id}
                      muscle={muscle}
                      selected={selectedMuscleGroup === muscle.id}
                      onPress={() => handleMuscleGroupPress(muscle.id)}
                    />
                  ))}
                </ScrollView>
              </View>
            </>
          )}
        </View>

        {/* Recent exercises card for 'all' mode when no search/filter */}
        {isAll && !hasActiveQuery && !selectedMuscleGroup && recentExercises.length > 0 && (
          <View style={styles.recentSection}>
            <Card style={styles.recentCard}>
              <View style={styles.recentHeader}>
                <ThemedText type="smallBold">Recently Used</ThemedText>
                <Pressable onPress={() => setMode('recent')}>
                  <ThemedText type="small" themeColor="accent">See all</ThemedText>
                </Pressable>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.recentScroll}>
                {recentExercises.slice(0, 5).map((exercise) => (
                  <RecentExerciseCard
                    key={exercise.id}
                    exercise={exercise}
                    onPress={() => handleRowPress(exercise.id)}
                  />
                ))}
              </ScrollView>
            </Card>
          </View>
        )}

        <FlatList
          data={data}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          getItemLayout={getItemLayout}
          initialNumToRender={12}
          maxToRenderPerBatch={12}
          windowSize={11}
          removeClippedSubviews
          onEndReached={isAll ? loadMore : undefined}
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

function MuscleGroupChip({
  muscle,
  selected,
  onPress,
}: {
  muscle: { id: string; name: string; color: string; icon: string };
  selected: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Filter by ${muscle.name}`}
      accessibilityState={{ selected }}
      style={({ pressed }) => [
        styles.muscleChip,
        { 
          backgroundColor: selected ? muscle.color : theme.backgroundElement,
          borderColor: selected ? muscle.color : 'transparent',
        },
        pressed && styles.pressed,
      ]}>
      <ThemedText 
        type="small" 
        style={[
          styles.muscleChipText,
          { color: selected ? '#ffffff' : theme.text }
        ]}>
        {muscle.name}
      </ThemedText>
    </Pressable>
  );
}

function RecentExerciseCard({
  exercise,
  onPress,
}: {
  exercise: Exercise;
  onPress: () => void;
}) {
  const theme = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}
      style={({ pressed }) => [
        styles.recentExerciseCard,
        { backgroundColor: theme.backgroundSelected },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.recentExerciseIcon, { backgroundColor: theme.backgroundElement }]}>
        <Icon name="exercises" size={18} color={theme.textSecondary} />
      </View>
      <ThemedText type="small" numberOfLines={2} style={styles.recentExerciseName}>
        {exercise.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.recentExerciseMuscle}>
        {exercise.targetMuscles?.[0] ?? exercise.bodyParts?.[0] ?? ''}
      </ThemedText>
    </Pressable>
  );
}
