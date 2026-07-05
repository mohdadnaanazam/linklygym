import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { FilterChip } from '@/components/ui/filter-chip';
import { GlassSurface } from '@/components/ui/glass-surface';
import { IconButton } from '@/components/ui/icon-button';
import { SheetHeader } from '@/components/ui/sheet-header';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ExerciseFacet, ExerciseFilters } from '@/hooks/use-exercise-list';

export type FacetValues = {
  bodyParts: string[];
  equipments: string[];
  muscles: string[];
};

export type ExerciseFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  facets: FacetValues;
  filters: ExerciseFilters;
  onToggle: (facet: ExerciseFacet, value: string) => void;
  onClearAll: () => void;
  activeFilterCount: number;
  resultCount: number;
};

type Group = {
  facet: ExerciseFacet;
  title: string;
  values: string[];
};

export function ExerciseFilterSheet({
  visible,
  onClose,
  facets,
  filters,
  onToggle,
  onClearAll,
  activeFilterCount,
  resultCount,
}: ExerciseFilterSheetProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const groups: Group[] = [
    { facet: 'bodyParts', title: 'Body part', values: facets.bodyParts },
    { facet: 'equipments', title: 'Equipment', values: facets.equipments },
    { facet: 'targetMuscles', title: 'Target muscle', values: facets.muscles },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel="Close filters"
        />
        <GlassSurface
          borderRadius={Spacing.four}
          style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.three }]}>
          <SheetHeader
            title="Filters"
            subtitle={activeFilterCount > 0 ? `${activeFilterCount} active` : undefined}
            left={
              <IconButton name="close" accessibilityLabel="Close filters" onPress={onClose} />
            }
            right={
              activeFilterCount > 0 ? (
                <Button title="Clear all" variant="ghost" size="sm" onPress={onClearAll} />
              ) : undefined
            }
          />

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}>
            {groups.map((group) => (
              <View key={group.facet} style={styles.group}>
                <ThemedText type="smallBold" themeColor="textSecondary" style={styles.groupTitle}>
                  {group.title}
                </ThemedText>
                {group.values.length === 0 ? (
                  <ThemedText type="small" themeColor="textSecondary">
                    No options available.
                  </ThemedText>
                ) : (
                  <View style={styles.chips}>
                    {group.values.map((value) => (
                      <FilterChip
                        key={value}
                        label={value}
                        selected={filters[group.facet].includes(value)}
                        onPress={() => onToggle(group.facet, value)}
                      />
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          <View style={[styles.footer, { borderTopColor: theme.backgroundSelected }]}>
            <Button
              title={resultCount === 1 ? 'Show 1 exercise' : `Show ${resultCount} exercises`}
              onPress={onClose}
              fullWidth
            />
          </View>
        </GlassSurface>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    maxHeight: '82%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.four,
  },
  group: {
    gap: Spacing.two,
  },
  groupTitle: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  footer: {
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});

export default ExerciseFilterSheet;
