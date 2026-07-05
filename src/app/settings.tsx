import { Image } from 'expo-image';
import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Spacing } from '@/constants/theme';
import { clearUserData } from '@/db/maintenance';
import { exercisesRepo, settingsRepo } from '@/db/repositories';
import { getSyncStatus, refreshCatalog, type SyncProgress } from '@/db/sync';
import { useTheme } from '@/hooks/use-theme';
import type { WeightUnit } from '@/lib/units';

const REST_OPTIONS: { value: string; label: string }[] = [
  { value: '60', label: '60s' },
  { value: '90', label: '90s' },
  { value: '120', label: '120s' },
  { value: '180', label: '180s' },
];

const WEIGHT_OPTIONS: { value: WeightUnit; label: string }[] = [
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'lb', label: 'Pounds (lb)' },
];

const MEDIA_BATCH_SIZE = 8;

function formatSyncedAt(epochMs: number | null): string {
  if (!epochMs) return 'Never';
  return new Date(epochMs).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function SettingsScreen() {
  const theme = useTheme();

  const initial = useMemo(() => settingsRepo.get(), []);
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(initial.weightUnit);
  const [defaultRestSec, setDefaultRestSec] = useState<number>(
    initial.defaultRestSec
  );

  const handleWeightUnit = useCallback((next: WeightUnit) => {
    setWeightUnit(next);
    settingsRepo.update({ weightUnit: next });
  }, []);

  const handleRest = useCallback((next: string) => {
    const seconds = Number(next);
    setDefaultRestSec(seconds);
    settingsRepo.update({ defaultRestSec: seconds });
  }, []);

  const [syncing, setSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState<SyncProgress | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(
    getSyncStatus().catalogSyncedAt ?? null
  );

  const handleUpdateLibrary = useCallback(async () => {
    if (syncing) return;
    setSyncing(true);
    setSyncProgress({ current: 0, total: 0 });
    try {
      await refreshCatalog({
        onProgress: (p) => setSyncProgress(p),
      });
      setLastSyncedAt(getSyncStatus().catalogSyncedAt ?? Date.now());
    } catch {
      Alert.alert(
        'Update failed',
        'Could not update the exercise library. Check your connection and try again.'
      );
    } finally {
      setSyncing(false);
      setSyncProgress(null);
    }
  }, [syncing]);

  const [downloading, setDownloading] = useState(false);
  const [mediaProgress, setMediaProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);
  const cancelMediaRef = useRef(false);

  const handleDownloadMedia = useCallback(async () => {
    if (downloading) return;
    cancelMediaRef.current = false;
    setDownloading(true);
    try {
      const total = exercisesRepo.count();
      const rows = exercisesRepo.list({ limit: Math.max(total, 1) });
      const urls = Array.from(
        new Set(
          rows
            .map((e) => e.gifUrl)
            .filter((u): u is string => typeof u === 'string' && u.length > 0)
        )
      );

      setMediaProgress({ current: 0, total: urls.length });

      let done = 0;
      for (let i = 0; i < urls.length; i += MEDIA_BATCH_SIZE) {
        if (cancelMediaRef.current) break;
        const batch = urls.slice(i, i + MEDIA_BATCH_SIZE);
        await Promise.all(
          batch.map((url) => Image.prefetch(url).catch(() => false))
        );
        done += batch.length;
        setMediaProgress({ current: Math.min(done, urls.length), total: urls.length });
      }

      if (!cancelMediaRef.current) {
        Alert.alert(
          'Download complete',
          `Cached ${urls.length} exercise ${urls.length === 1 ? 'image' : 'images'} for offline use.`
        );
      }
    } finally {
      setDownloading(false);
      setMediaProgress(null);
      cancelMediaRef.current = false;
    }
  }, [downloading]);

  const handleCancelMedia = useCallback(() => {
    cancelMediaRef.current = true;
  }, []);

  const handleReset = useCallback(() => {
    Alert.alert(
      'Reset all data?',
      'This permanently deletes your routines, workout history, favorites, records, and body metrics. The exercise library and your preferences are kept. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: () => {
            try {
              clearUserData();
              Alert.alert('Data cleared', 'Your workout data has been reset.');
            } catch {
              Alert.alert(
                'Reset failed',
                'Something went wrong clearing your data. Please try again.'
              );
            }
          },
        },
      ]
    );
  }, []);

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill} edges={['bottom', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}>
          <Section title="UNITS">
            <Card>
              <ThemedText type="default">Weight unit</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.hint}>
                Used across workouts, history, and progress.
              </ThemedText>
              <SegmentedControl
                options={WEIGHT_OPTIONS}
                value={weightUnit}
                onChange={handleWeightUnit}
                style={styles.control}
              />
            </Card>
          </Section>

          <Section title="WORKOUT">
            <Card>
              <ThemedText type="default">Default rest timer</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.hint}>
                Starting rest duration between sets.
              </ThemedText>
              <SegmentedControl
                options={REST_OPTIONS}
                value={String(defaultRestSec)}
                onChange={handleRest}
                style={styles.control}
              />
            </Card>
          </Section>

          <Section title="DATA">
            <Card padding={0}>
              <ListRow
                title="Update exercise library"
                subtitle={
                  syncing
                    ? syncProgress && syncProgress.total > 0
                      ? `Updating… ${syncProgress.current} / ${syncProgress.total}`
                      : 'Updating…'
                    : `Last updated: ${formatSyncedAt(lastSyncedAt)}`
                }
                onPress={handleUpdateLibrary}
                disabled={syncing}
                accessibilityLabel="Update the exercise library from the server"
                leading={
                  <View
                    style={[
                      styles.rowIcon,
                      { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <Icon name="progress" size={18} color={theme.accent} />
                  </View>
                }
                trailing={
                  syncing ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
              />

              <View style={[styles.divider, { backgroundColor: theme.background }]} />

              <ListRow
                title="Download media for offline"
                subtitle={
                  downloading
                    ? mediaProgress
                      ? `Downloading… ${mediaProgress.current} / ${mediaProgress.total}`
                      : 'Preparing…'
                    : 'Cache all exercise animations on this device.'
                }
                onPress={handleDownloadMedia}
                disabled={downloading}
                accessibilityLabel="Download all exercise media for offline use"
                leading={
                  <View
                    style={[
                      styles.rowIcon,
                      { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <Icon name="exercises" size={18} color={theme.accent} />
                  </View>
                }
                trailing={
                  downloading ? (
                    <ActivityIndicator size="small" color={theme.accent} />
                  ) : undefined
                }
              />
            </Card>

            {downloading ? (
              <Button
                title="Cancel download"
                variant="secondary"
                onPress={handleCancelMedia}
                fullWidth
                accessibilityLabel="Cancel the media download"
                style={styles.cancel}
              />
            ) : null}

            <Card padding={0} style={styles.destructiveCard}>
              <ListRow
                title="Reset all data"
                subtitle="Delete routines, history, favorites, and records."
                onPress={handleReset}
                accessibilityLabel="Reset all workout data. This cannot be undone."
                leading={
                  <View
                    style={[
                      styles.rowIcon,
                      { backgroundColor: theme.backgroundSelected },
                    ]}>
                    <Icon name="close" size={18} color={theme.danger} />
                  </View>
                }
                trailing={
                  <ThemedText type="small" themeColor="danger">
                    Reset
                  </ThemedText>
                }
              />
            </Card>
          </Section>
        </ScrollView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <ThemedText
        type="smallBold"
        themeColor="textSecondary"
        style={styles.sectionLabel}>
        {title}
      </ThemedText>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.four,
  },
  section: {
    gap: Spacing.two,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: Spacing.one,
  },
  hint: {
    marginTop: Spacing.half,
  },
  control: {
    marginTop: Spacing.three,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginLeft: Spacing.three + 36 + Spacing.three,
  },
  cancel: {
    marginTop: Spacing.two,
  },
  destructiveCard: {
    marginTop: Spacing.two,
  },
});
