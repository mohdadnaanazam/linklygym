import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { Platform, StyleSheet, TextInput, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  type SharedValue,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Spacing } from '@/constants/theme';
import type { Exercise, RoutineExercise } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import type { RoutineExercisePatch } from '@/db/repositories/routines-repo';
import { formatWeight, fromDisplay, type WeightUnit } from '@/lib/units';

export type RoutineExerciseItem = RoutineExercise & { exercise: Exercise };

const ROW_HEIGHT = 128;
const CARD_GAP = Spacing.two;
const THUMB = 44;
const SPRING = { damping: 20, stiffness: 220, mass: 0.6 } as const;
const BLUR_HASH = 'L184i9offQof00ayfQay~qfQfQfQ';

export type ReorderableExerciseListProps = {
  items: RoutineExerciseItem[];
  unit: WeightUnit;
  onReorder: (orderedIds: number[]) => void;
  onPatch: (routineExerciseId: number, patch: RoutineExercisePatch) => void;
  onRemove: (item: RoutineExerciseItem) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

function listToPositions(items: RoutineExerciseItem[]): Record<number, number> {
  const map: Record<number, number> = {};
  items.forEach((item, index) => {
    map[item.id] = index;
  });
  return map;
}

function objectMove(
  obj: Record<number, number>,
  from: number,
  to: number
): Record<number, number> {
  'worklet';
  const next: Record<number, number> = { ...obj };
  for (const key in obj) {
    if (obj[key] === from) next[key] = to;
    if (obj[key] === to) next[key] = from;
  }
  return next;
}

function triggerHaptic() {
  if (Platform.OS !== 'web') {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  }
}

export function ReorderableExerciseList({
  items,
  unit,
  onReorder,
  onPatch,
  onRemove,
  onDraggingChange,
}: ReorderableExerciseListProps) {
  const positions = useSharedValue<Record<number, number>>(listToPositions(items));
  const activeId = useSharedValue<number>(-1);

  useEffect(() => {
    positions.value = listToPositions(items);
  }, [items, positions]);

  return (
    <View style={{ height: items.length * ROW_HEIGHT }}>
      {items.map((item) => (
        <Row
          key={item.id}
          item={item}
          count={items.length}
          unit={unit}
          positions={positions}
          activeId={activeId}
          onReorder={onReorder}
          onPatch={onPatch}
          onRemove={onRemove}
          onDraggingChange={onDraggingChange}
        />
      ))}
    </View>
  );
}

type RowProps = {
  item: RoutineExerciseItem;
  count: number;
  unit: WeightUnit;
  positions: SharedValue<Record<number, number>>;
  activeId: SharedValue<number>;
  onReorder: (orderedIds: number[]) => void;
  onPatch: (routineExerciseId: number, patch: RoutineExercisePatch) => void;
  onRemove: (item: RoutineExerciseItem) => void;
  onDraggingChange?: (dragging: boolean) => void;
};

function Row({
  item,
  count,
  unit,
  positions,
  activeId,
  onReorder,
  onPatch,
  onRemove,
  onDraggingChange,
}: RowProps) {
  const theme = useTheme();
  const top = useSharedValue((positions.value[item.id] ?? 0) * ROW_HEIGHT);
  const startTop = useSharedValue(0);
  const isActive = useSharedValue(false);

  useAnimatedReaction(
    () => positions.value[item.id],
    (index) => {
      if (index == null) return;
      if (!isActive.value) {
        top.value = withSpring(index * ROW_HEIGHT, SPRING);
      }
    }
  );

  const emitReorder = useCallback(
    (ordered: number[]) => {
      onReorder(ordered);
    },
    [onReorder]
  );

  const setDragging = useCallback(
    (dragging: boolean) => {
      onDraggingChange?.(dragging);
    },
    [onDraggingChange]
  );

  /* eslint-disable react-hooks/immutability */
  const pan = Gesture.Pan()
    .onStart(() => {
      isActive.value = true;
      activeId.value = item.id;
      startTop.value = (positions.value[item.id] ?? 0) * ROW_HEIGHT;
      runOnJS(setDragging)(true);
      runOnJS(triggerHaptic)();
    })
    .onUpdate((event) => {
      top.value = startTop.value + event.translationY;
      const newIndex = Math.max(
        0,
        Math.min(count - 1, Math.round(top.value / ROW_HEIGHT))
      );
      const oldIndex = positions.value[item.id];
      if (oldIndex != null && newIndex !== oldIndex) {
        positions.value = objectMove(positions.value, oldIndex, newIndex);
      }
    })
    .onEnd(() => {
      const finalIndex = positions.value[item.id] ?? 0;
      top.value = withSpring(finalIndex * ROW_HEIGHT, SPRING);
      isActive.value = false;
      activeId.value = -1;
      const ordered: number[] = [];
      for (const key in positions.value) {
        ordered[positions.value[key]] = Number(key);
      }
      runOnJS(emitReorder)(ordered);
      runOnJS(setDragging)(false);
    });
  /* eslint-enable react-hooks/immutability */

  const containerStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    right: 0,
    top: top.value,
    zIndex: isActive.value ? 100 : 0,
    transform: [{ scale: isActive.value ? 1.02 : 1 }],
  }));

  const commitSets = useCallback(
    (text: string) => onPatch(item.id, { targetSets: parseIntOrNull(text) }),
    [item.id, onPatch]
  );
  const commitReps = useCallback(
    (text: string) => onPatch(item.id, { targetReps: parseIntOrNull(text) }),
    [item.id, onPatch]
  );
  const commitRest = useCallback(
    (text: string) => onPatch(item.id, { restSeconds: parseIntOrNull(text) }),
    [item.id, onPatch]
  );
  const commitWeight = useCallback(
    (text: string) =>
      onPatch(item.id, { targetWeight: parseWeightToKg(text, unit) }),
    [item.id, onPatch, unit]
  );

  const weightValue =
    item.targetWeight != null
      ? formatWeight(item.targetWeight, unit, { withUnit: false })
      : '';

  return (
    <Animated.View style={containerStyle}>
      <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
        <View style={styles.headerRow}>
          <GestureDetector gesture={pan}>
            <View
              style={styles.handle}
              accessibilityRole="adjustable"
              accessibilityLabel={`Drag to reorder ${item.exercise.name}`}>
              <Icon name="train" size={18} color={theme.textSecondary} />
            </View>
          </GestureDetector>

          <View style={[styles.thumb, { backgroundColor: theme.background }]}>
            {item.exercise.gifUrl ? (
              <Image
                source={{ uri: item.exercise.gifUrl }}
                style={styles.thumbImage}
                contentFit="cover"
                placeholder={{ blurhash: BLUR_HASH }}
                transition={150}
                cachePolicy="disk"
                accessible={false}
              />
            ) : (
              <Icon name="exercises" size={20} color={theme.textSecondary} />
            )}
          </View>

          <ThemedText type="default" numberOfLines={1} style={styles.name}>
            {item.exercise.name}
          </ThemedText>

          <IconButton
            name="close"
            size={16}
            diameter={32}
            accessibilityLabel={`Remove ${item.exercise.name}`}
            onPress={() => onRemove(item)}
          />
        </View>

        <View style={styles.fields}>
          <NumberField
            label="Sets"
            value={item.targetSets != null ? String(item.targetSets) : ''}
            onCommit={commitSets}
            accessibilityLabel={`Target sets for ${item.exercise.name}`}
          />
          <NumberField
            label="Reps"
            value={item.targetReps != null ? String(item.targetReps) : ''}
            onCommit={commitReps}
            accessibilityLabel={`Target reps for ${item.exercise.name}`}
          />
          <NumberField
            label={`Weight (${unit})`}
            value={weightValue}
            onCommit={commitWeight}
            accessibilityLabel={`Target weight for ${item.exercise.name}`}
          />
          <NumberField
            label="Rest (s)"
            value={item.restSeconds != null ? String(item.restSeconds) : ''}
            onCommit={commitRest}
            accessibilityLabel={`Rest seconds for ${item.exercise.name}`}
          />
        </View>
      </View>
    </Animated.View>
  );
}

function parseIntOrNull(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed.length === 0) return null;
  const value = parseInt(trimmed, 10);
  return Number.isFinite(value) && value >= 0 ? value : null;
}

function parseWeightToKg(text: string, unit: WeightUnit): number | null {
  const trimmed = text.trim().replace(',', '.');
  if (trimmed.length === 0) return null;
  const value = parseFloat(trimmed);
  if (!Number.isFinite(value) || value < 0) return null;
  return fromDisplay(value, unit);
}

type NumberFieldProps = {
  label: string;
  value: string;
  onCommit: (text: string) => void;
  accessibilityLabel: string;
};

function NumberField({ label, value, onCommit, accessibilityLabel }: NumberFieldProps) {
  const theme = useTheme();
  const [text, setText] = useState(value);

  useEffect(() => {
    setText(value);
  }, [value]);

  return (
    <View style={styles.field}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.fieldLabel}>
        {label}
      </ThemedText>
      <TextInput
        value={text}
        onChangeText={setText}
        onBlur={() => onCommit(text)}
        onEndEditing={() => onCommit(text)}
        keyboardType="numeric"
        placeholder="–"
        placeholderTextColor={theme.textSecondary}
        style={[styles.input, { color: theme.text, backgroundColor: theme.background }]}
        accessibilityLabel={accessibilityLabel}
        returnKeyType="done"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    height: ROW_HEIGHT - CARD_GAP,
    borderRadius: Spacing.three,
    padding: Spacing.two,
    gap: Spacing.two,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  handle: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  name: {
    flex: 1,
    fontWeight: '600',
  },
  fields: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  field: {
    flex: 1,
    gap: Spacing.half,
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  input: {
    height: 40,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.two,
    fontSize: 15,
    textAlign: 'center',
  },
});

export default ReorderableExerciseList;
