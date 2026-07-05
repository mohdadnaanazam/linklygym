import { Image } from 'expo-image';
import { memo, useCallback } from 'react';
import { StyleSheet, View } from 'react-native';

import { ListRow } from '@/components/ui/list-row';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Exercise } from '@/db/schema';

export const THUMB_SIZE = 56;
export const EXERCISE_ROW_HEIGHT = THUMB_SIZE + Spacing.two * 2;

const BLUR_HASH = 'L184i9offQof00ayfQay~qfQfQfQ';

export type ExerciseRowProps = {
  exercise: Exercise;
  onPress: (id: string) => void;
};

function buildSubtitle(exercise: Exercise): string | undefined {
  const target = exercise.targetMuscles?.[0];
  const bodyParts = exercise.bodyParts ?? [];
  const parts = [target, ...bodyParts.filter((bp) => bp !== target)].filter(
    (v): v is string => !!v
  );
  return parts.length > 0 ? parts.join(' · ') : undefined;
}

function ExerciseRowBase({ exercise, onPress }: ExerciseRowProps) {
  const theme = useTheme();
  const handlePress = useCallback(() => onPress(exercise.id), [exercise.id, onPress]);

  const leading = (
    <View style={[styles.thumb, { backgroundColor: theme.backgroundElement }]}>
      {exercise.gifUrl ? (
        <Image
          source={{ uri: exercise.gifUrl }}
          style={styles.thumbImage}
          contentFit="cover"
          placeholder={{ blurhash: BLUR_HASH }}
          transition={150}
          cachePolicy="disk"
          accessible={false}
        />
      ) : (
        <Icon name="exercises" size={24} color={theme.textSecondary} />
      )}
    </View>
  );

  return (
    <ListRow
      title={exercise.name}
      subtitle={buildSubtitle(exercise)}
      leading={leading}
      chevron
      onPress={handlePress}
      accessibilityLabel={exercise.name}
      style={styles.row}
    />
  );
}

const styles = StyleSheet.create({
  row: {
    height: EXERCISE_ROW_HEIGHT,
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
});

export const ExerciseRow = memo(ExerciseRowBase);

export default ExerciseRow;
