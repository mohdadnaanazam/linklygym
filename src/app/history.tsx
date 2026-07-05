import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { FlatList, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedView } from '@/components/themed-view';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { settingsRepo, workoutsRepo } from '@/db/repositories';
import type { Workout } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, type WeightUnit } from '@/lib/units';

import { styles } from './history.styles';

interface HistoryItem {
  workout: Workout;
  exerciseCount: number;
  setCount: number;
}

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

export default function HistoryScreen() {
  const theme = useTheme();
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);
  const [items, setItems] = useState<HistoryItem[]>([]);

  const load = useCallback(() => {
    const workouts = workoutsRepo.list();
    const enriched = workouts.map<HistoryItem>((workout) => {
      const detail = workoutsRepo.getById(workout.id);
      const exerciseCount = detail?.exercises.length ?? 0;
      const setCount =
        detail?.exercises.reduce((sum, ex) => sum + ex.sets.length, 0) ?? 0;
      return { workout, exerciseCount, setCount };
    });
    setItems(enriched);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const renderItem = useCallback(
    ({ item }: { item: HistoryItem }) => {
      const { workout, exerciseCount, setCount } = item;
      const dateLabel = formatWorkoutDate(workout.startedAt);
      const volumeLabel = formatWeight(workout.totalVolume ?? 0, unit);
      const durationLabel = formatDuration(workout.durationSec);
      const countLabel =
        exerciseCount === 1 ? '1 exercise' : `${exerciseCount} exercises`;
      const subtitle = `${durationLabel} · ${volumeLabel} · ${setCount} sets · ${countLabel}`;

      return (
        <ListRow
          title={dateLabel}
          subtitle={subtitle}
          chevron
          onPress={() => router.push(`/workout/${workout.id}`)}
          accessibilityLabel={`Workout on ${dateLabel}. ${durationLabel}, ${volumeLabel} total volume, ${setCount} sets across ${countLabel}.`}
          leading={
            <View style={[styles.leading, { backgroundColor: theme.backgroundSelected }]}>
              <Icon name="train" size={20} color={theme.textSecondary} />
            </View>
          }
        />
      );
    },
    [theme.backgroundSelected, theme.textSecondary, unit]
  );

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
        <FlatList
          data={items}
          keyExtractor={(item) => String(item.workout.id)}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.emptyContent : styles.listContent}
          ItemSeparatorComponent={() => (
            <View style={[styles.separator, { backgroundColor: theme.backgroundElement }]} />
          )}
          ListEmptyComponent={
            <EmptyState
              icon="train"
              title="No workouts yet"
              message="Finish a workout and it will show up here."
            />
          }
        />
      </SafeAreaView>
    </ThemedView>
  );
}
