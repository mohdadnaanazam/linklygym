import * as Haptics from 'expo-haptics';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { GlassSurface } from '@/components/ui/glass-surface';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useTimerStore } from '@/stores/timer-store';

const TICK_MS = 250;
const STEP_SEC = 15;

function completionHaptic() {
  if (Platform.OS === 'web') return;
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
}

function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

interface RestTimerView {
  running: boolean;
  remainingMs: number;
  progress: number;
  addTime: (deltaSec: number) => void;
  skip: () => void;
}

export function useRestTimerController(): RestTimerView {
  const endsAt = useTimerStore((s) => s.endsAt);
  const durationSec = useTimerStore((s) => s.durationSec);
  const running = useTimerStore((s) => s.running);
  const addTime = useTimerStore((s) => s.addTime);
  const skip = useTimerStore((s) => s.skip);
  const stop = useTimerStore((s) => s.stop);

  const [now, setNow] = useState(() => Date.now());

  const firedForRef = useRef<number | null>(null);

  useEffect(() => {
    if (!running || endsAt === null) return;
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(interval);
  }, [running, endsAt]);

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;

  useEffect(() => {
    if (!running || endsAt === null) return;
    if (remainingMs > 0) return;
    if (firedForRef.current === endsAt) return;
    firedForRef.current = endsAt;
    completionHaptic();
    AccessibilityInfo.announceForAccessibility('Rest complete');
    stop();
  }, [running, endsAt, remainingMs, stop]);

  useEffect(() => {
    if (running && endsAt !== null && firedForRef.current !== endsAt) {
      firedForRef.current = null;
    }
  }, [running, endsAt]);

  const progress =
    durationSec > 0 ? 1 - remainingMs / (durationSec * 1000) : 0;

  return {
    running,
    remainingMs,
    progress: Math.min(1, Math.max(0, progress)),
    addTime,
    skip,
  };
}

export function RestTimerBar() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { running, remainingMs, progress, addTime, skip } =
    useRestTimerController();

  if (!running) return null;

  const label = formatRemaining(remainingMs);

  return (
    <View
      pointerEvents="box-none"
      style={[styles.wrap, { paddingBottom: Math.max(insets.bottom, Spacing.three) }]}>
      <GlassSurface style={styles.surface} borderRadius={Spacing.four}>
        <View style={styles.row}>
          <IconButton
            name="close"
            size={18}
            diameter={40}
            color={theme.textSecondary}
            accessibilityLabel="Skip rest timer"
            onPress={skip}
          />

          <Pressable
            style={styles.center}
            accessibilityRole="timer"
            accessibilityLabel={`Rest timer, ${label} remaining`}
            accessibilityLiveRegion="polite">
            <View style={styles.timeRow}>
              <Icon name="timer" size={16} color={theme.accent} />
              <ThemedText type="default" style={styles.time}>
                {label}
              </ThemedText>
            </View>
            <View style={[styles.track, { backgroundColor: theme.backgroundSelected }]}>
              <View
                style={[
                  styles.fill,
                  { backgroundColor: theme.accent, width: `${progress * 100}%` },
                ]}
              />
            </View>
          </Pressable>

          <View style={styles.adjust}>
            <Pressable
              onPress={() => addTime(-STEP_SEC)}
              accessibilityRole="button"
              accessibilityLabel="Subtract 15 seconds from rest timer"
              hitSlop={8}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">-15</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => addTime(STEP_SEC)}
              accessibilityRole="button"
              accessibilityLabel="Add 15 seconds to rest timer"
              hitSlop={8}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.backgroundSelected },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold">+15</ThemedText>
            </Pressable>
          </View>
        </View>
      </GlassSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
  },
  surface: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  center: {
    flex: 1,
    gap: Spacing.one,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.one,
  },
  time: {
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  track: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 2,
  },
  adjust: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  chip: {
    minWidth: 44,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});

export default RestTimerBar;
