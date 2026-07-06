import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
  },
  content: {
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickActions: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  templatesRow: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  templateCard: {
    width: 100,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    alignItems: 'center',
    gap: Spacing.two,
  },
  templateIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  templateName: {
    textAlign: 'center',
  },
  templateMuscles: {
    textAlign: 'center',
    fontSize: 10,
  },
  routinesList: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  routineCardContent: {
    flex: 1,
    gap: Spacing.one,
  },
  routineCardHeader: {
    gap: Spacing.half,
  },
  routineCardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  routineCardTitle: {
    fontWeight: '600',
    flex: 1,
  },
  lastUsedBadge: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.one,
  },
  lastUsedText: {
    fontSize: 10,
  },
  exercisePreview: {
    marginTop: Spacing.half,
    fontSize: 12,
    opacity: 0.7,
  },
  routineNote: {
    fontStyle: 'italic',
    opacity: 0.6,
  },
  routineCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyWrap: {
    flex: 1,
    minHeight: 200,
    paddingHorizontal: Spacing.three,
  },
  pressed: {
    opacity: 0.7,
  },
});
