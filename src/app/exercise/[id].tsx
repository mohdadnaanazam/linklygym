import { Image } from 'expo-image';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Platform, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AddToRoutineSheet } from '@/components/exercises/add-to-routine-sheet';
import { EmptyState } from '@/components/ui/empty-state';
import { FilterChip } from '@/components/ui/filter-chip';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { exercisesRepo, favoritesRepo } from '@/db/repositories';
import type { Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { styles } from './[id].styles';

const BLUR_HASH = 'L184i9offQof00ayfQay~qfQfQfQ';

function labelize(value: string): string {
  return value
    .split(' ')
    .map((word) => (word.length > 0 ? word[0].toUpperCase() + word.slice(1) : word))
    .join(' ');
}

function ChipGroup({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values || values.length === 0) return null;
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
        {label}
      </ThemedText>
      <View style={styles.chips}>
        {values.map((value) => (
          <FilterChip key={`${label}-${value}`} label={labelize(value)} />
        ))}
      </View>
    </View>
  );
}

export default function ExerciseDetailScreen() {
  const theme = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();

  const exercise = useMemo<Exercise | undefined>(
    () => (id ? exercisesRepo.getById(id) : undefined),
    [id]
  );

  const [isFavorite, setIsFavorite] = useState<boolean>(() =>
    id ? favoritesRepo.isFavorite(id) : false
  );
  const [mediaFailed, setMediaFailed] = useState(false);
  const [routineSheetOpen, setRoutineSheetOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);

  const handleToggleFavorite = useCallback(() => {
    if (!id) return;
    const next = favoritesRepo.toggle(id);
    setIsFavorite(next);
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  }, [id]);

  const handleAdded = useCallback((routineName: string) => {
    setConfirmation(`Added to ${routineName}`);
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    }
  }, []);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)/exercises');
  }, []);

  const showPlaceholder = !exercise?.gifUrl || mediaFailed;

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ headerShown: false }} />
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.topBar}>
          <IconButton
            name="chevron-left"
            accessibilityLabel="Go back"
            onPress={handleBack}
          />
          {exercise ? (
            <View style={styles.topActions}>
              <IconButton
                name={isFavorite ? 'heart-filled' : 'heart'}
                color={isFavorite ? theme.danger : theme.text}
                accessibilityLabel={
                  isFavorite ? 'Remove from favorites' : 'Add to favorites'
                }
                onPress={handleToggleFavorite}
              />
              <IconButton
                name="plus"
                accessibilityLabel="Add to routine"
                onPress={() => setRoutineSheetOpen(true)}
              />
            </View>
          ) : null}
        </View>

        {!exercise ? (
          <EmptyState
            icon="exercises"
            title="Exercise not found"
            message="This exercise isn't in your library."
            actionLabel="Go back"
            onAction={handleBack}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}>
            <View style={[styles.hero, { backgroundColor: theme.backgroundElement }]}>
              {showPlaceholder ? (
                <View style={styles.heroPlaceholder}>
                  <Icon name="exercises" size={64} color={theme.textSecondary} />
                </View>
              ) : (
                <Image
                  source={{ uri: exercise.gifUrl! }}
                  style={styles.heroImage}
                  contentFit="contain"
                  placeholder={{ blurhash: BLUR_HASH }}
                  transition={200}
                  cachePolicy="disk"
                  onError={() => setMediaFailed(true)}
                  accessibilityLabel={`${exercise.name} demonstration`}
                />
              )}
            </View>

            <ThemedText type="subtitle" style={styles.name}>
              {labelize(exercise.name)}
            </ThemedText>

            {confirmation ? (
              <View style={[styles.confirmation, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="checkmark" size={16} color={theme.success} />
                <ThemedText type="small" themeColor="textSecondary">
                  {confirmation}
                </ThemedText>
              </View>
            ) : null}

            <ChipGroup label="Target muscles" values={exercise.targetMuscles} />
            <ChipGroup label="Secondary muscles" values={exercise.secondaryMuscles} />
            <ChipGroup label="Equipment" values={exercise.equipments} />
            <ChipGroup label="Body parts" values={exercise.bodyParts} />

            {exercise.instructions && exercise.instructions.length > 0 ? (
              <View style={styles.section}>
                <ThemedText
                  type="smallBold"
                  themeColor="textSecondary"
                  style={styles.sectionLabel}>
                  Instructions
                </ThemedText>
                <View style={styles.instructions}>
                  {exercise.instructions.map((step, index) => (
                    <View key={index} style={styles.step}>
                      <View style={[styles.stepBadge, { backgroundColor: theme.backgroundElement }]}>
                        <ThemedText type="smallBold" themeColor="accent">
                          {index + 1}
                        </ThemedText>
                      </View>
                      <ThemedText type="default" style={styles.stepText}>
                        {step.replace(/^step:\d+\s*/i, '')}
                      </ThemedText>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}
          </ScrollView>
        )}
      </SafeAreaView>

      {exercise ? (
        <AddToRoutineSheet
          visible={routineSheetOpen}
          onClose={() => setRoutineSheetOpen(false)}
          exerciseId={exercise.id}
          exerciseName={labelize(exercise.name)}
          onAdded={handleAdded}
        />
      ) : null}
    </ThemedView>
  );
}
