import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LineChart, type LineChartPoint } from '@/components/charts';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import {
  Button,
  Card,
  EmptyState,
  FilterChip,
  GlassSurface,
  Icon,
  IconButton,
  ListRow,
  SheetHeader,
} from '@/components/ui';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { metricsRepo, settingsRepo } from '@/db/repositories';
import type { BodyMetric } from '@/db/schema';
import { useTheme } from '@/hooks/use-theme';
import { formatWeight, fromDisplay, toDisplay, type WeightUnit } from '@/lib/units';

const BODYWEIGHT = 'bodyweight';

function trimNumber(value: number, decimals = 1): string {
  const factor = Math.pow(10, decimals);
  return String(Math.round(value * factor) / factor);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

type AddMetricSheetProps = {
  visible: boolean;
  onClose: () => void;
  measurementTypes: string[];
  initialType: string;
  weightUnit: WeightUnit;
  onAdded: (type: string) => void;
};

function AddMetricSheet({
  visible,
  onClose,
  measurementTypes,
  initialType,
  weightUnit,
  onAdded,
}: AddMetricSheetProps) {
  const theme = useTheme();

  const [selected, setSelected] = useState<string>(initialType);
  const [newTypeName, setNewTypeName] = useState('');
  const [valueText, setValueText] = useState('');
  const [unitText, setUnitText] = useState('cm');

  const reset = useCallback(() => {
    setSelected(initialType);
    setNewTypeName('');
    setValueText('');
    setUnitText('cm');
  }, [initialType]);

  const isBodyweight = selected === BODYWEIGHT;
  const isNew = selected === 'new';

  const parsedValue = Number.parseFloat(valueText);
  const resolvedType = isNew ? newTypeName.trim() : selected;
  const resolvedUnit = isBodyweight ? weightUnit : unitText.trim();
  const canSave =
    Number.isFinite(parsedValue) &&
    parsedValue > 0 &&
    resolvedType.length > 0 &&
    (isBodyweight || resolvedUnit.length > 0);

  const handleSave = () => {
    if (!canSave) return;
    const storedValue = isBodyweight
      ? fromDisplay(parsedValue, weightUnit)
      : parsedValue;
    metricsRepo.add({ type: resolvedType, value: storedValue, unit: resolvedUnit });
    onAdded(resolvedType);
    onClose();
  };

  const typeChips = useMemo(
    () => [BODYWEIGHT, ...measurementTypes],
    [measurementTypes]
  );

  const inputStyle = [
    styles.input,
    { backgroundColor: theme.backgroundElement, color: theme.text },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      onShow={reset}
      statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Close" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.sheetWrap}
        pointerEvents="box-none">
        <GlassSurface borderRadius={Spacing.four} style={styles.sheet}>
          <SafeAreaView edges={['bottom']} style={styles.fill}>
            <SheetHeader
              title="Log entry"
              left={
                <IconButton
                  name="close"
                  accessibilityLabel="Close"
                  onPress={onClose}
                  size={18}
                />
              }
              right={
                <Button
                  title="Save"
                  size="sm"
                  onPress={handleSave}
                  disabled={!canSave}
                  accessibilityLabel="Save entry"
                />
              }
            />
            <ScrollView
              contentContainerStyle={styles.formContent}
              keyboardShouldPersistTaps="handled">
              <ThemedText type="smallBold">Type</ThemedText>
              <View
                style={styles.chipRow}
                accessibilityRole="radiogroup"
                accessibilityLabel="Metric type">
                {typeChips.map((type) => (
                  <FilterChip
                    key={type}
                    label={type === BODYWEIGHT ? 'Bodyweight' : type}
                    selected={selected === type}
                    onPress={() => setSelected(type)}
                  />
                ))}
                <FilterChip
                  label="+ New measurement"
                  selected={isNew}
                  onPress={() => setSelected('new')}
                />
              </View>

              {isNew ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">Measurement name</ThemedText>
                  <TextInput
                    value={newTypeName}
                    onChangeText={setNewTypeName}
                    placeholder="e.g. chest, waist, arms"
                    placeholderTextColor={theme.textSecondary}
                    style={inputStyle}
                    autoCapitalize="none"
                    accessibilityLabel="Measurement name"
                  />
                </View>
              ) : null}

              <View style={styles.field}>
                <ThemedText type="smallBold">
                  Value{isBodyweight ? ` (${weightUnit})` : ''}
                </ThemedText>
                <TextInput
                  value={valueText}
                  onChangeText={setValueText}
                  placeholder="0"
                  placeholderTextColor={theme.textSecondary}
                  keyboardType="decimal-pad"
                  style={inputStyle}
                  accessibilityLabel="Value"
                />
              </View>

              {!isBodyweight ? (
                <View style={styles.field}>
                  <ThemedText type="smallBold">Unit</ThemedText>
                  <TextInput
                    value={unitText}
                    onChangeText={setUnitText}
                    placeholder="e.g. cm, in"
                    placeholderTextColor={theme.textSecondary}
                    autoCapitalize="none"
                    style={inputStyle}
                    accessibilityLabel="Unit"
                  />
                </View>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </GlassSurface>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export default function MetricsScreen() {
  const theme = useTheme();
  const unit = useMemo<WeightUnit>(() => settingsRepo.get().weightUnit, []);

  const [types, setTypes] = useState<string[]>([]);
  const [selectedType, setSelectedType] = useState<string>(BODYWEIGHT);
  const [entries, setEntries] = useState<BodyMetric[]>([]);
  const [addVisible, setAddVisible] = useState(false);

  const isBodyweight = selectedType === BODYWEIGHT;

  const measurementTypes = useMemo(
    () => types.filter((t) => t !== BODYWEIGHT),
    [types]
  );

  const selectableTypes = useMemo(
    () => (types.includes(BODYWEIGHT) ? types : [BODYWEIGHT, ...types]),
    [types]
  );

  const reload = useCallback(() => {
    setTypes(metricsRepo.types());
    setEntries(metricsRepo.listByType(selectedType));
  }, [selectedType]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload])
  );

  const handleAdded = useCallback((type: string) => {
    setSelectedType(type);
    setTypes(metricsRepo.types());
    setEntries(metricsRepo.listByType(type));
  }, []);

  const handleDelete = useCallback(
    (id: number) => {
      metricsRepo.deleteById(id);
      setEntries(metricsRepo.listByType(selectedType));
      setTypes(metricsRepo.types());
    },
    [selectedType]
  );

  const linePoints = useMemo<LineChartPoint[]>(
    () =>
      entries.map((e) => ({
        x: e.recordedAt,
        y: isBodyweight ? toDisplay(e.value, unit) : e.value,
      })),
    [entries, isBodyweight, unit]
  );

  const recent = useMemo(() => [...entries].reverse(), [entries]);

  const entryUnitLabel = isBodyweight ? unit : (entries[0]?.unit ?? '');

  const chartSummary =
    linePoints.length > 0
      ? `${isBodyweight ? 'Bodyweight' : selectedType} over ${linePoints.length} entries.`
      : 'Not enough data to chart yet.';

  const formatValue = useCallback(
    (entry: BodyMetric): string =>
      isBodyweight
        ? formatWeight(entry.value, unit)
        : `${trimNumber(entry.value)} ${entry.unit}`,
    [isBodyweight, unit]
  );

  return (
    <ThemedView style={styles.fill}>
      <Stack.Screen options={{ title: 'Body metrics' }} />
      <SafeAreaView style={styles.fill} edges={['left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.content,
            { paddingBottom: BottomTabInset + Spacing.four },
          ]}
          showsVerticalScrollIndicator={false}>
          <Button
            title="Log entry"
            onPress={() => setAddVisible(true)}
            leading={<Icon name="plus" size={16} color="#ffffff" />}
            accessibilityLabel="Log a new body metric entry"
          />

          <View
            style={styles.chipRow}
            accessibilityRole="radiogroup"
            accessibilityLabel="Select metric type">
            {selectableTypes.map((type) => (
              <FilterChip
                key={type}
                label={type === BODYWEIGHT ? 'Bodyweight' : type}
                selected={selectedType === type}
                onPress={() => setSelectedType(type)}
              />
            ))}
          </View>

          <Card style={styles.card}>
            <View style={styles.cardHeader}>
              <ThemedText type="smallBold">
                {isBodyweight ? 'Bodyweight' : selectedType}
              </ThemedText>
              {entryUnitLabel ? (
                <ThemedText type="small" themeColor="textSecondary">
                  {entryUnitLabel}
                </ThemedText>
              ) : null}
            </View>
            {linePoints.length >= 2 ? (
              <LineChart
                data={linePoints}
                stroke={theme.chart[0]}
                fill
                formatY={(v) => trimNumber(v)}
                accessibilityLabel={chartSummary}
                style={styles.chart}
              />
            ) : (
              <EmptyState
                icon="progress"
                title="Not enough data"
                message="Log at least two entries to see a trend over time."
              />
            )}
          </Card>

          <Card style={styles.card} padding={0}>
            <View style={[styles.cardHeader, styles.listHeader]}>
              <ThemedText type="smallBold">Recent entries</ThemedText>
            </View>
            {recent.length === 0 ? (
              <View style={styles.listEmpty}>
                <ThemedText type="small" themeColor="textSecondary">
                  No entries yet. Tap “Log entry” to record your first{' '}
                  {isBodyweight ? 'bodyweight' : selectedType} value.
                </ThemedText>
              </View>
            ) : (
              recent.map((entry, i) => (
                <ListRow
                  key={entry.id}
                  title={formatValue(entry)}
                  subtitle={formatDate(entry.recordedAt)}
                  style={i > 0 ? styles.rowBorder : undefined}
                  trailing={
                    <IconButton
                      name="close"
                      size={16}
                      onPress={() => handleDelete(entry.id)}
                      accessibilityLabel={`Delete entry from ${formatDate(entry.recordedAt)}`}
                    />
                  }
                />
              ))
            )}
          </Card>
        </ScrollView>
      </SafeAreaView>

      <AddMetricSheet
        visible={addVisible}
        onClose={() => setAddVisible(false)}
        measurementTypes={measurementTypes}
        initialType={selectedType}
        weightUnit={unit}
        onAdded={handleAdded}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  card: {
    gap: Spacing.three,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chart: {
    marginTop: Spacing.one,
  },
  listHeader: {
    padding: Spacing.three,
    paddingBottom: Spacing.two,
  },
  listEmpty: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
  },
  rowBorder: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.06)',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheetWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '85%',
  },
  formContent: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  field: {
    gap: Spacing.two,
  },
  input: {
    borderRadius: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    fontSize: 16,
    minHeight: 44,
  },
});
