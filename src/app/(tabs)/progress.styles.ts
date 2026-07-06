import { StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rangeControl: {
    marginBottom: Spacing.one,
  },
  insightsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  insightCard: {
    flex: 1,
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.three,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  insightValueRow: {
    alignItems: 'center',
  },
  insightValue: {
    fontSize: 24,
    lineHeight: 28,
  },
  card: {
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  prHeader: {
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  prTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flex: 1,
  },
  prBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.half,
    borderRadius: Spacing.two,
  },
  prIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chart: {
    marginTop: Spacing.one,
  },
  pickerButton: {
    alignSelf: 'flex-start',
  },
  metricControl: {
    marginTop: Spacing.one,
  },
  prEmpty: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  prRowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  muscleGroupChart: {
    gap: Spacing.two,
  },
  muscleGroupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  muscleGroupLabel: {
    width: 80,
  },
  muscleGroupBarContainer: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  muscleGroupBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  muscleGroupPercent: {
    width: 36,
    textAlign: 'right',
  },
});
