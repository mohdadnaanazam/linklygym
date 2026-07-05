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
});
