import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon, type IconName } from '@/components/ui/icon';
import { routinesRepo, workoutsRepo } from '@/db/repositories';
import type { Routine, Exercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';

import { styles } from './train.styles';

interface RoutineSummary {
  routine: Routine;
  exerciseCount: number;
  exercises: Exercise[];
  lastUsed?: number;
}

interface QuickTemplate {
  id: string;
  name: string;
  icon: IconName;
  color: string;
  muscleGroups: string[];
}

const QUICK_TEMPLATES: QuickTemplate[] = [
  { id: 'push', name: 'Push', icon: 'train', color: '#FF6B6B', muscleGroups: ['chest', 'shoulders', 'triceps'] },
  { id: 'pull', name: 'Pull', icon: 'train', color: '#4ECDC4', muscleGroups: ['back', 'biceps', 'forearms'] },
  { id: 'legs', name: 'Legs', icon: 'train', color: '#45B7D1', muscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'] },
  { id: 'upper', name: 'Upper', icon: 'train', color: '#96CEB4', muscleGroups: ['chest', 'back', 'shoulders', 'arms'] },
  { id: 'lower', name: 'Lower', icon: 'train', color: '#DDA0DD', muscleGroups: ['quads', 'hamstrings', 'glutes'] },
  { id: 'full', name: 'Full Body', icon: 'train', color: '#F7DC6F', muscleGroups: ['full body workout'] },
];

function tap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

export default function TrainScreen() {
  const theme = useTheme();
  const [summaries, setSummaries] = useState<RoutineSummary[]>([]);
  const [recentWorkoutRoutineIds, setRecentWorkoutRoutineIds] = useState<number[]>([]);

  const refresh = useCallback(() => {
    const list = routinesRepo.list();
    const workoutHistory = workoutsRepo.list();
    
    // Get last used times for routines
    const lastUsedMap = new Map<number, number>();
    workoutHistory.forEach(w => {
      if (w.routineId && !lastUsedMap.has(w.routineId)) {
        lastUsedMap.set(w.routineId, w.startedAt);
      }
    });

    // Get recent routine IDs (unique, up to 3)
    const recentIds: number[] = [];
    workoutHistory.forEach(w => {
      if (w.routineId && !recentIds.includes(w.routineId) && recentIds.length < 3) {
        recentIds.push(w.routineId);
      }
    });
    setRecentWorkoutRoutineIds(recentIds);

    setSummaries(
      list.map((routine) => {
        const detail = routinesRepo.getById(routine.id);
        return { 
          routine, 
          exerciseCount: detail?.exercises.length ?? 0,
          exercises: detail?.exercises.map(e => e.exercise) ?? [],
          lastUsed: lastUsedMap.get(routine.id),
        };
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

  const handleQuickTemplate = useCallback((template: QuickTemplate) => {
    // Create a new routine based on template and go to edit it
    const id = routinesRepo.create({ 
      name: template.name,
      note: `${template.muscleGroups.join(', ')} workout`
    });
    tap();
    router.push(`/routine/${id}`);
  }, []);

  const isEmpty = summaries.length === 0;

  const recentSummaries = useMemo(() => {
    return summaries.filter(s => recentWorkoutRoutineIds.includes(s.routine.id));
  }, [summaries, recentWorkoutRoutineIds]);

  const otherSummaries = useMemo(() => {
    return summaries.filter(s => !recentWorkoutRoutineIds.includes(s.routine.id));
  }, [summaries, recentWorkoutRoutineIds]);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <ThemedText type="subtitle">Train</ThemedText>
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, isEmpty && styles.contentEmpty]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          
          {/* Quick Start Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                QUICK START
              </ThemedText>
            </View>
            <View style={styles.quickActions}>
              <Button
                title="Empty workout"
                variant="primary"
                onPress={handleStartEmpty}
                fullWidth
                leading={<Icon name="plus" size={18} color="#ffffff" />}
                accessibilityLabel="Start an empty workout"
              />
            </View>
          </View>

          {/* Quick Templates */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                WORKOUT TEMPLATES
              </ThemedText>
            </View>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.templatesRow}>
              {QUICK_TEMPLATES.map((template) => (
                <QuickTemplateCard 
                  key={template.id} 
                  template={template} 
                  onPress={() => handleQuickTemplate(template)}
                />
              ))}
            </ScrollView>
          </View>

          {/* Recently Used */}
          {recentSummaries.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                  RECENTLY USED
                </ThemedText>
              </View>
              <View style={styles.routinesList}>
                {recentSummaries.map(({ routine, exerciseCount, exercises, lastUsed }) => (
                  <EnhancedRoutineCard
                    key={routine.id}
                    routine={routine}
                    exerciseCount={exerciseCount}
                    exercises={exercises}
                    lastUsed={lastUsed}
                    onOpen={() => handleOpen(routine.id)}
                    onStart={() => handleStartRoutine(routine.id)}
                  />
                ))}
              </View>
            </View>
          )}

          {/* Your Routines */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
                YOUR ROUTINES
              </ThemedText>
              <Pressable 
                onPress={handleNewRoutine}
                accessibilityLabel="Create new routine"
                style={({ pressed }) => [pressed && styles.pressed]}>
                <ThemedText type="small" themeColor="accent">+ New</ThemedText>
              </Pressable>
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
              <View style={styles.routinesList}>
                {(otherSummaries.length > 0 ? otherSummaries : summaries).map(({ routine, exerciseCount, exercises, lastUsed }) => (
                  <EnhancedRoutineCard
                    key={routine.id}
                    routine={routine}
                    exerciseCount={exerciseCount}
                    exercises={exercises}
                    lastUsed={lastUsed}
                    onOpen={() => handleOpen(routine.id)}
                    onStart={() => handleStartRoutine(routine.id)}
                  />
                ))}
              </View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function QuickTemplateCard({
  template,
  onPress,
}: {
  template: QuickTemplate;
  onPress: () => void;
}) {
  const theme = useTheme();
  
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Create ${template.name} workout template`}
      style={({ pressed }) => [
        styles.templateCard,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
        <Icon name={template.icon} size={20} color={template.color} />
      </View>
      <ThemedText type="smallBold" style={styles.templateName}>
        {template.name}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.templateMuscles}>
        {template.muscleGroups.slice(0, 2).join(', ')}
      </ThemedText>
    </Pressable>
  );
}

function EnhancedRoutineCard({
  routine,
  exerciseCount,
  exercises,
  lastUsed,
  onOpen,
  onStart,
}: {
  routine: Routine;
  exerciseCount: number;
  exercises: Exercise[];
  lastUsed?: number;
  onOpen: () => void;
  onStart: () => void;
}) {
  const theme = useTheme();
  const countLabel = `${exerciseCount} ${exerciseCount === 1 ? 'exercise' : 'exercises'}`;
  
  const lastUsedLabel = useMemo(() => {
    if (!lastUsed) return null;
    const days = Math.floor((Date.now() - lastUsed) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }, [lastUsed]);

  const exercisePreview = useMemo(() => {
    return exercises.slice(0, 3).map(e => e.name).join(' · ');
  }, [exercises]);

  return (
    <Pressable
      onPress={onOpen}
      accessibilityRole="button"
      accessibilityLabel={`Edit routine ${routine.name}`}
      style={({ pressed }) => [
        styles.routineCard,
        { backgroundColor: theme.backgroundElement },
        pressed && styles.pressed,
      ]}>
      <View style={styles.routineCardContent}>
        <View style={styles.routineCardHeader}>
          <View style={styles.routineCardTitleRow}>
            <ThemedText type="default" numberOfLines={1} style={styles.routineCardTitle}>
              {routine.name}
            </ThemedText>
            {lastUsedLabel && (
              <View style={[styles.lastUsedBadge, { backgroundColor: theme.backgroundSelected }]}>
                <ThemedText type="small" themeColor="textSecondary" style={styles.lastUsedText}>
                  {lastUsedLabel}
                </ThemedText>
              </View>
            )}
          </View>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {countLabel}
          </ThemedText>
        </View>
        
        {exercisePreview ? (
          <ThemedText 
            type="small" 
            themeColor="textSecondary" 
            numberOfLines={1}
            style={styles.exercisePreview}>
            {exercisePreview}
          </ThemedText>
        ) : null}
        
        {routine.note ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.routineNote}>
            {routine.note}
          </ThemedText>
        ) : null}
      </View>
      
      <View style={styles.routineCardActions}>
        <Button
          title="Start"
          size="sm"
          onPress={onStart}
          accessibilityLabel={`Start workout from ${routine.name}`}
        />
      </View>
    </Pressable>
  );
}
