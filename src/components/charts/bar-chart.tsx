import { memo, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type BarChartDatum = { label: string; value: number };

export type BarChartProps = {
  data: BarChartDatum[];
  height?: number;
  width?: number;
  color?: string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const X_LABEL_HEIGHT = 18;
const MAX_LABELS = 6;

function BarChartBase({
  data,
  height = 160,
  width,
  color,
  accessibilityLabel,
  style,
}: BarChartProps) {
  const theme = useTheme();
  const [measured, setMeasured] = useState(0);
  const barColor = color ?? theme.chart[0];

  const onLayout = (e: LayoutChangeEvent) => {
    if (width === undefined) setMeasured(e.nativeEvent.layout.width);
  };

  const w = width ?? measured;

  const model = useMemo(() => {
    if (w <= 0 || data.length === 0) return null;

    const n = data.length;
    const maxValue = Math.max(...data.map((d) => d.value), 0);
    const slot = w / n;
    const barW = Math.max(2, slot * 0.6);
    const labelStep = Math.ceil(n / MAX_LABELS);

    const bars = data.map((d, i) => {
      const h = maxValue > 0 ? (d.value / maxValue) * height : 0;
      return {
        x: i * slot + (slot - barW) / 2,
        y: height - h,
        w: barW,
        h,
        showLabel: i % labelStep === 0 || i === n - 1,
        label: d.label,
        slotCenter: i * slot + slot / 2,
      };
    });

    return { bars };
  }, [data, w, height]);

  return (
    <View onLayout={onLayout} style={style} accessible accessibilityLabel={accessibilityLabel}>
      {model ? (
        <>
          <Svg width={w} height={height}>
            {model.bars.map((b, i) => (
              <Rect
                key={`bar-${i}`}
                x={b.x}
                y={b.y}
                width={b.w}
                height={Math.max(0, b.h)}
                rx={2}
                fill={barColor}
              />
            ))}
          </Svg>
          <View style={[styles.labelRow, { height: X_LABEL_HEIGHT }]}>
            {model.bars.map((b, i) =>
              b.showLabel ? (
                <ThemedText
                  key={`xlabel-${i}`}
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={1}
                  style={[styles.xLabel, { left: b.slotCenter - 24 }]}>
                  {b.label}
                </ThemedText>
              ) : null
            )}
          </View>
        </>
      ) : (
        <View style={{ height: height + X_LABEL_HEIGHT }} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  labelRow: {
    position: 'relative',
    marginTop: Spacing.one,
  },
  xLabel: {
    position: 'absolute',
    width: 48,
    textAlign: 'center',
    fontSize: 10,
    lineHeight: 12,
  },
});

export const BarChart = memo(BarChartBase);

export default BarChart;
