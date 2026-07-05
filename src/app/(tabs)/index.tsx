import { router, useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useCallback, useMemo, useState } from 'react';
import { Platform, Pressable, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NudgeKitCards, NudgeKitProvider } from 'nudgekit-react-native';

import { NUDGEKIT_API_KEY, NUDGEKIT_USER_ID } from '@/api/linkly-config';
import { Spacing } from '@/constants/theme';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { ListRow } from '@/components/ui/list-row';
import { settingsRepo, workoutsRepo } from '@/db/repositories';
import type { Workout } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { computeStreaks } from '@/lib/streak';
import { formatWeight, type WeightUnit } from '@/lib/units';

import { styles } from './index.styles';

const RECENT_LIMIT = 5;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

function tap() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  }
}

function greeting(now: number): string {
  const hour = new Date(now).getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(epochMs: number): string {
  return new Date(epochMs).toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

function formatDuration(durationSec: number | null): string {
  const total = Math.max(0, durationSec ?? 0);
  if (total < 60) return `${total}s`;
  const hours = Math.floor(total / 3600);
  const minutes = Math.round((total % 3600) / 60);
  if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  return `${minutes}m`;
}

interface DashboardData {
  hasActive: boolean;
  recent: Workout[];
  currentStreak: number;
  lastWorkout: Workout | null;
  weeklyVolume: number;
  totalCompleted: number;
}

export default function HomeScreen() {
  const theme = useTheme();
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);
  // eslint-disable-next-line react-hooks/purity
  const greetingText = useMemo(() => greeting(Date.now()), []);
  const [data, setData] = useState<DashboardData>({
    hasActive: false,
    recent: [],
    currentStreak: 0,
    lastWorkout: null,
    weeklyVolume: 0,
    totalCompleted: 0,
  });

  const load = useCallback(() => {
    const now = Date.now();
    const completed = workoutsRepo.list();
    const hasActive = workoutsRepo.getActive() !== undefined;

    const { current } = computeStreaks(completed.map((w) => w.startedAt), now);
    const weeklyVolume = completed
      .filter((w) => now - w.startedAt <= WEEK_MS)
      .reduce((sum, w) => sum + (w.totalVolume ?? 0), 0);

    setData({
      hasActive,
      recent: completed.slice(0, RECENT_LIMIT),
      currentStreak: current,
      lastWorkout: completed[0] ?? null,
      weeklyVolume,
      totalCompleted: completed.length,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleStartWorkout = useCallback(() => {
    tap();
    if (workoutsRepo.getActive()) {
      router.push('/workout/active');
    } else {
      router.push('/(tabs)/train');
    }
  }, []);

  const handleResume = useCallback(() => {
    tap();
    router.push('/workout/active');
  }, []);

  const handleBrowse = useCallback(() => {
    router.push('/(tabs)/exercises');
  }, []);

  const isFirstRun = !data.hasActive && data.totalCompleted === 0;

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            isFirstRun && styles.contentEmpty,
          ]}
          showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <View style={styles.headerText}>
              <ThemedText type="small" themeColor="textSecondary">
                {greetingText}
              </ThemedText>
              <ThemedText type="subtitle">Home</ThemedText>
            </View>
            <IconButton
              name="gear"
              color={theme.textSecondary}
              onPress={() => router.push('/settings')}
              accessibilityLabel="Open settings"
            />
          </View>

          <HomeCardsSection />

          {isFirstRun ? (
            <View style={styles.emptyWrap}>
              <EmptyState
                icon="train"
                title="Let's get started"
                message="Start your first workout to build a streak, or browse the exercise library to plan your training."
                actionLabel="Start workout"
                onAction={handleStartWorkout}
              />
              <Button
                title="Browse exercises"
                variant="secondary"
                onPress={handleBrowse}
                fullWidth
                leading={<Icon name="search" size={18} color={theme.text} />}
                accessibilityLabel="Browse the exercise library"
                style={styles.emptyBrowse}
              />
            </View>
          ) : (
            <>
              {data.hasActive ? (
                <ResumeBanner onResume={handleResume} />
              ) : null}

              <View style={styles.actions}>
                <Button
                  title="Start workout"
                  onPress={handleStartWorkout}
                  fullWidth
                  leading={<Icon name="train" size={18} color="#ffffff" />}
                  accessibilityLabel={
                    data.hasActive
                      ? 'Resume your in-progress workout'
                      : 'Start a new workout'
                  }
                />
                <Button
                  title="Browse exercises"
                  variant="secondary"
                  onPress={handleBrowse}
                  fullWidth
                  leading={<Icon name="search" size={18} color={theme.text} />}
                  accessibilityLabel="Browse the exercise library"
                />
              </View>

              <View style={styles.statsRow}>
                <StatCard
                  icon="progress"
                  iconColor={theme.accent}
                  label="Current streak"
                  value={`${data.currentStreak}`}
                  unit={data.currentStreak === 1 ? 'day' : 'days'}
                />
                <StatCard
                  icon="train"
                  iconColor={theme.pr}
                  label="This week"
                  value={formatWeight(data.weeklyVolume, unit, { withUnit: false })}
                  unit={unit}
                />
              </View>

              <LastWorkoutCard workout={data.lastWorkout} unit={unit} />

              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <ThemedText
                    type="smallBold"
                    themeColor="textSecondary"
                    style={styles.sectionLabel}>
                    RECENT ACTIVITY
                  </ThemedText>
                  {data.totalCompleted > 0 ? (
                    <Pressable
                      onPress={() => router.push('/history')}
                      accessibilityRole="button"
                      accessibilityLabel="See all workout history">
                      <ThemedText type="small" themeColor="accent">
                        See all
                      </ThemedText>
                    </Pressable>
                  ) : null}
                </View>

                {data.recent.length > 0 ? (
                  <Card padding={0}>
                    {data.recent.map((workout, i) => {
                      const dateLabel = formatDate(workout.startedAt);
                      const durationLabel = formatDuration(workout.durationSec);
                      const volumeLabel = formatWeight(
                        workout.totalVolume ?? 0,
                        unit
                      );
                      return (
                        <ListRow
                          key={workout.id}
                          title={dateLabel}
                          subtitle={`${durationLabel} · ${volumeLabel}`}
                          chevron
                          onPress={() => router.push(`/workout/${workout.id}`)}
                          accessibilityLabel={`Workout on ${dateLabel}. ${durationLabel}, ${volumeLabel} total volume.`}
                          leading={
                            <View
                              style={[
                                styles.rowIcon,
                                { backgroundColor: theme.backgroundSelected },
                              ]}>
                              <Icon
                                name="train"
                                size={18}
                                color={theme.textSecondary}
                              />
                            </View>
                          }
                          style={i > 0 ? styles.rowBorder : undefined}
                        />
                      );
                    })}
                  </Card>
                ) : (
                  <Card>
                    <ThemedText type="small" themeColor="textSecondary">
                      No completed workouts yet. Finish a session to see it here.
                    </ThemedText>
                  </Card>
                )}
              </View>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function HomeCardsSection() {
  if (!NUDGEKIT_API_KEY) {
    if (!__DEV__) return null;
    return (
      <ThemedText type="small" themeColor="danger">
        Set EXPO_PUBLIC_NUDGEKIT_API_KEY to load home cards.
      </ThemedText>
    );
  }

  return (
    <NudgeKitProvider apiKey={NUDGEKIT_API_KEY} userId={NUDGEKIT_USER_ID}>
      <NudgeKitCards style={styles.homeCards} gap={Spacing.three} />
    </NudgeKitProvider>
  );
}

function ResumeBanner({ onResume }: { onResume: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onResume}
      accessibilityRole="button"
      accessibilityLabel="Resume your in-progress workout"
      style={({ pressed }) => [
        styles.resume,
        { backgroundColor: theme.accent },
        pressed && styles.pressed,
      ]}>
      <View style={styles.resumeIcon}>
        <Icon name="timer" size={22} color="#ffffff" />
      </View>
      <View style={styles.resumeBody}>
        <ThemedText type="smallBold" style={styles.resumeText}>
          Workout in progress
        </ThemedText>
        <ThemedText type="small" style={styles.resumeSubtext}>
          Tap to resume where you left off
        </ThemedText>
      </View>
      <Icon name="chevron-right" size={18} color="#ffffff" />
    </Pressable>
  );
}

function StatCard({
  icon,
  iconColor,
  label,
  value,
  unit,
}: {
  icon: 'progress' | 'train' | 'trophy';
  iconColor: string;
  label: string;
  value: string;
  unit: string;
}) {
  return (
    <Card
      style={styles.statCard}
      accessible
      accessibilityLabel={`${label}: ${value} ${unit}`}>
      <Icon name={icon} size={18} color={iconColor} />
      <ThemedText type="small" themeColor="textSecondary">
        {label}
      </ThemedText>
      <View style={styles.statValueRow}>
        <ThemedText type="subtitle" style={styles.statValue}>
          {value}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.statUnit}>
          {unit}
        </ThemedText>
      </View>
    </Card>
  );
}

function LastWorkoutCard({
  workout,
  unit,
}: {
  workout: Workout | null;
  unit: WeightUnit;
}) {
  const theme = useTheme();
  if (!workout) {
    return (
      <Card
        accessible
        accessibilityLabel="Last workout: none yet">
        <ThemedText type="small" themeColor="textSecondary">
          LAST WORKOUT
        </ThemedText>
        <ThemedText type="default" style={styles.lastNone}>
          No workouts yet
        </ThemedText>
      </Card>
    );
  }

  const dateLabel = formatDate(workout.startedAt);
  const durationLabel = formatDuration(workout.durationSec);
  const volumeLabel = formatWeight(workout.totalVolume ?? 0, unit);

  return (
    <Pressable
      onPress={() => router.push(`/workout/${workout.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Last workout on ${dateLabel}. ${durationLabel}, ${volumeLabel} total volume. Tap for details.`}
      style={({ pressed }) => [pressed && styles.pressed]}>
      <Card>
        <View style={styles.lastHeader}>
          <ThemedText type="small" themeColor="textSecondary">
            LAST WORKOUT
          </ThemedText>
          <Icon name="chevron-right" size={16} color={theme.textSecondary} />
        </View>
        <ThemedText type="default" style={styles.lastTitle}>
          {dateLabel}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {durationLabel} · {volumeLabel}
        </ThemedText>
      </Card>
    </Pressable>
  );
}
