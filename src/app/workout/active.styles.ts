import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.two,
  },
  statItem: {
    alignItems: 'center',
    gap: Spacing.half,
    flex: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  emptyBody: {
    paddingVertical: Spacing.five,
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
  },
  prBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    marginHorizontal: Spacing.three,
    marginBottom: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Spacing.three,
  },
  prBannerText: {
    flex: 1,
    color: '#00120a',
  },
  block: {
    borderRadius: Spacing.three,
    padding: Spacing.three,
    gap: Spacing.three,
  },
  blockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  thumb: {
    width: 48,
    height: 48,
    borderRadius: Spacing.two,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  blockHeaderText: {
    flex: 1,
    gap: Spacing.half,
  },
  blockTitle: {
    fontWeight: '600',
  },
  setList: {
    gap: Spacing.two,
  },
  setRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  setRowCompleted: {
    opacity: 0.7,
  },
  setNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setText: {
    flex: 1,
  },
  setTextCompleted: {
    textDecorationLine: 'line-through',
    opacity: 0.6,
  },
  swipeAction: {
    width: 60,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Spacing.two,
    marginHorizontal: Spacing.one,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.two,
  },
  presetsContainer: {
    gap: Spacing.two,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    flexWrap: 'wrap',
  },
  presetLabel: {
    minWidth: 60,
  },
  presetChip: {
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    borderRadius: Spacing.one,
    minWidth: 40,
    alignItems: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    height: 44,
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    fontSize: 15,
  },
  addWrap: {
    marginTop: Spacing.two,
  },
});
