import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { routinesRepo, workoutsRepo } from '@/db/repositories';
import type { Routine } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { styles } from './train.styles';

interface RoutineSummary {
  routine: Routine;
  exerciseCount: number;
}

function tap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export default function TrainScreen() {
  const theme = useTheme();
  const [summaries, setSummaries] = useState<RoutineSummary[]>([]);

  const refresh = useCallback(() => {
    const list = routinesRepo.list();
    setSummaries(
      list.map((routine) => {
        const detail = routinesRepo.getById(routine.id);
        return { routine, exerciseCount: detail?.exercises.length ?? 0 };
      })
    );
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const handleNewRoutine = useCallback(() => {
    const id = routinesRepo.create({ name: 'New routine' });
    tap();
    router.push(`/routine/${id}`);
  }, []);

  const handleOpen = useCallback((id: number) => {
    router.push(`/routine/${id}`);
  }, []);

  const handleStartRoutine = useCallback((id: number) => {
    workoutsRepo.start(id);
    tap();
    router.push('/workout/active');
  }, []);

  const handleStartEmpty = useCallback(() => {
    workoutsRepo.start();
    tap();
    router.push('/workout/active');
  }, []);

  const isEmpty = summaries.length === 0;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Train</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
          keyboardShouldPersistTaps="handled">
          <View style={styles.actions}>
            <Button
              title="New routine"
              onPress={handleNewRoutine}
              fullWidth
              leading={<Icon name="plus" size={18} color="#ffffff" />}
              accessibilityLabel="Create a new routine"
            />
            <Button
              title="Start empty workout"
              variant="secondary"
              onPress={handleStartEmpty}
              fullWidth
              leading={<Icon name="train" size={18} color={theme.text} />}
              accessibilityLabel="Start an empty workout"
            />
          </View>

          {isEmpty ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="train"
                title="No routines yet"
                message="Create a routine to plan your workouts, then start it with one tap."
                actionLabel="New routine"
                onAction={handleNewRoutine}
              />
            </View>
          ) : (
            <View style={styles.list}>
              <ThemedText
                type="smallBold"
                themeColor="textSecondary"
                style={styles.sectionLabel}>
                YOUR ROUTINES
              </ThemedText>
              {summaries.map(({ routine, exerciseCount }) => (
                <RoutineCard
                  key={routine.id}
                  routine={routine}
                  exerciseCount={exerciseCount}
                  onOpen={() => handleOpen(routine.id)}
                  onStart={() => handleStartRoutine(routine.id)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function RoutineCard({
  routine,
  exerciseCount,
  onOpen,
  onStart,
}: {
  routine: Routine;
  exerciseCount: number;
  onOpen: () => void;
  onStart: () => void;
}) {
  const theme = useTheme();
  const countLabel = `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}`;

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Edit routine ${routine.name}`}
      style={({ pressed }) => [
        styles.card,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.cardBody}>
        <ThemedText type="default" numberOfLines={1} style={styles.cardTitle}>
          {routine.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {countLabel}
        </ThemedText>
        {routine.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
            {routine.note}
          </ThemedText>
        ) : null}
      </View>
      <Button
        title="Start"
        size="sm"
        onPress={onStart}
        accessibilityLabel={`Start workout from ${routine.name}`}
      />
    </Pressable>
  );
}
