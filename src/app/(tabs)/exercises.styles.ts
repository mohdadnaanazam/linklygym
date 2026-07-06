import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  searchWrap: {
    flex: 1,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '700',
  },
  muscleGroupSection: {
    gap: Spacing.one,
  },
  muscleGroupLabel: {
    marginLeft: Spacing.one,
  },
  muscleGroupRow: {
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  muscleChip: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.four,
    borderWidth: 1,
  },
  muscleChipText: {
    fontWeight: '500',
  },
  recentSection: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  recentCard: {
    padding: Spacing.three,
    gap: Spacing.two,
  },
  recentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  recentScroll: {
    gap: Spacing.two,
  },
  recentExerciseCard: {
    width: 100,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    alignItems: 'center',
    gap: Spacing.one,
  },
  recentExerciseIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentExerciseName: {
    textAlign: 'center',
    fontWeight: '500',
  },
  recentExerciseMuscle: {
    textAlign: 'center',
    fontSize: 10,
  },
  listContent: {
    paddingBottom: BottomTabInset + Spacing.four,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  centerFill: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  footer: {
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
