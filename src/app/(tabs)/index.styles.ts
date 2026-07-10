import { StyleSheet } from 'react-native';

import { BottomTabInset, Spacing } from '@/constants/theme';

export const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    paddingBottom: BottomTabInset + Spacing.four,
    gap: Spacing.four,
  },
  contentEmpty: {
    flexGrow: 1,
  },
  homeCards: {
    gap: Spacing.three,
    marginHorizontal: -Spacing.three,
  },
  journeyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  journeyToggleText: {
    flex: 1,
    gap: Spacing.half,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerText: {
    gap: Spacing.half,
  },
  actions: {
    gap: Spacing.two,
  },
  emptyWrap: {
    flex: 1,
    minHeight: 320,
    justifyContent: 'center',
  },
  emptyBrowse: {
    marginTop: Spacing.three,
  },
  resume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  resumeIcon: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  resumeBody: {
    flex: 1,
    gap: 2,
  },
  resumeText: {
    color: '#ffffff',
  },
  resumeSubtext: {
    color: 'rgba(255,255,255,0.85)',
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.three,
  },
  statCard: {
    flex: 1,
    gap: Spacing.one,
  },
  statValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: Spacing.one,
  },
  statValue: {
    fontSize: 28,
    lineHeight: 34,
  },
  statUnit: {
    marginBottom: 2,
  },
  section: {
    gap: Spacing.two,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  lastHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  lastTitle: {
    fontWeight: '600',
    marginTop: Spacing.one,
  },
  lastNone: {
    marginTop: Spacing.one,
  },
  pressed: {
    opacity: 0.7,
  },
});
