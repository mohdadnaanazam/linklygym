import { type PropsWithChildren, useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useRunMigrations } from '@/db/client';
import { isSynced, syncCatalog, type SyncProgress } from '@/db/sync';
import { useTheme } from '@/hooks/use-theme';

type Phase = 'migrating' | 'migrate-error' | 'syncing' | 'offline' | 'ready';

const RETRY_BASE_MS = 3000;
const RETRY_MAX_MS = 30000;

export function StartupGate({ children }: PropsWithChildren) {
  const [migrateAttempt, setMigrateAttempt] = useState(0);

  return (
    <Gate key={migrateAttempt} onMigrationRetry={() => setMigrateAttempt((n) => n + 1)}>
      {children}
    </Gate>
  );
}

function Gate({
  children,
  onMigrationRetry,
}: PropsWithChildren<{ onMigrationRetry: () => void }>) {
  const { success, error } = useRunMigrations();
  const [phase, setPhase] = useState<Phase>('migrating');
  const [progress, setProgress] = useState<SyncProgress>({ current: 0, total: 0 });

  const runningRef = useRef(false);
  const retryAttemptRef = useRef(0);

  const runSync = useCallback(async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setPhase('syncing');
    try {
      await syncCatalog({ onProgress: setProgress });
      retryAttemptRef.current = 0;
      setPhase('ready');
    } catch {
      setPhase('offline');
    } finally {
      runningRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (error) {
      setPhase('migrate-error');
      return;
    }
    if (!success) return;
    if (isSynced()) {
      setPhase('ready');
      return;
    }
    void runSync();
  }, [success, error, runSync]);

  useEffect(() => {
    if (phase !== 'offline') return;
    const delay = Math.min(RETRY_MAX_MS, RETRY_BASE_MS * 2 ** retryAttemptRef.current);
    retryAttemptRef.current += 1;
    const timer = setTimeout(() => void runSync(), delay);
    return () => clearTimeout(timer);
  }, [phase, runSync]);

  if (phase === 'ready') {
    return <>{children}</>;
  }

  if (phase === 'migrate-error') {
    return (
      <StatusScreen
        title="Something went wrong"
        message="We couldn't prepare the local database. Please try again."
        actionLabel="Retry"
        onAction={onMigrationRetry}
      />
    );
  }

  if (phase === 'offline') {
    return (
      <StatusScreen
        title="Connect to the internet"
        message="Connect to the internet to download the exercise library. We'll keep trying automatically."
        actionLabel="Retry now"
        onAction={() => void runSync()}
      />
    );
  }

  const pct =
    phase === 'syncing' && progress.total > 0
      ? Math.min(100, Math.round((progress.current / progress.total) * 100))
      : null;
  const detail =
    phase === 'syncing'
      ? pct != null
        ? `Downloading exercise library… ${pct}%`
        : progress.current > 0
          ? `Downloading exercise library… ${progress.current}`
          : 'Downloading exercise library…'
      : 'Getting things ready…';

  return <LoadingScreen detail={detail} />;
}

function LoadingScreen({ detail }: { detail: string }) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color={theme.accent} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {detail}
        </ThemedText>
      </SafeAreaView>
    </ThemedView>
  );
}

function StatusScreen({
  title,
  message,
  actionLabel,
  onAction,
}: {
  title: string;
  message: string;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.center}>
        <ThemedText type="subtitle" style={styles.centerText}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {message}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={({ pressed }) => [
            styles.button,
            { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 },
          ]}>
          <ThemedText type="smallBold" style={styles.buttonLabel}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  centerText: {
    textAlign: 'center',
  },
  button: {
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
  },
  buttonLabel: {
    color: '#ffffff',
  },
});
