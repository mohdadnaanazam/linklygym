import { memo, useMemo, useState } from 'react';
import {
  StyleSheet,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type LineChartPoint = { x: number; y: number };

export type LineChartProps = {
  data: LineChartPoint[];
  height?: number;
  width?: number;
  stroke?: string;
  fill?: boolean | string;
  gridLines?: number;
  formatY?: (value: number) => string;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PAD_TOP = 10;
const PAD_BOTTOM = 8;
const PAD_RIGHT = 10;
const PAD_LEFT = 48;

function withAlpha(hex: string, alpha: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(hex) ? `${hex}${alpha}` : hex;
}

function LineChartBase({
  data,
  height = 180,
  width,
  stroke,
  fill = false,
  gridLines = 4,
  formatY,
  accessibilityLabel,
  style,
}: LineChartProps) {
  const theme = useTheme();
  const [measured, setMeasured] = useState(0);
  const chartColor = stroke ?? theme.chart[0];

  const onLayout = (e: LayoutChangeEvent) => {
    if (width === undefined) setMeasured(e.nativeEvent.layout.width);
  };

  const w = width ?? measured;
  const rows = Math.max(2, gridLines);

  const model = useMemo(() => {
    if (w <= 0 || data.length === 0) return null;

    const plotW = Math.max(1, w - PAD_LEFT - PAD_RIGHT);
    const plotH = Math.max(1, height - PAD_TOP - PAD_BOTTOM);

    const xs = data.map((d) => d.x);
    const ys = data.map((d) => d.y);
    let minX = Math.min(...xs);
    let maxX = Math.max(...xs);
    let minY = Math.min(...ys);
    let maxY = Math.max(...ys);

    if (maxY === minY) {
      const bump = Math.abs(maxY) > 0 ? Math.abs(maxY) * 0.1 : 1;
      minY -= bump;
      maxY += bump;
    }
    if (maxX === minX) {
      minX -= 1;
      maxX += 1;
    }

    const sx = (x: number) => PAD_LEFT + ((x - minX) / (maxX - minX)) * plotW;
    const sy = (y: number) => PAD_TOP + (1 - (y - minY) / (maxY - minY)) * plotH;

    const pts = data.map((d) => ({ px: sx(d.x), py: sy(d.y) }));
    const line = pts
      .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.px.toFixed(2)} ${p.py.toFixed(2)}`)
      .join(' ');

    const baseline = PAD_TOP + plotH;
    const area =
      pts.length > 1
        ? `${line} L ${pts[pts.length - 1].px.toFixed(2)} ${baseline.toFixed(2)} ` +
          `L ${pts[0].px.toFixed(2)} ${baseline.toFixed(2)} Z`
        : null;

    const gridYs = Array.from({ length: rows }, (_, i) => {
      const value = maxY - ((maxY - minY) * i) / (rows - 1);
      return { value, y: sy(value) };
    });

    return { pts, line, area, gridYs };
  }, [data, w, height, rows]);

  const fillColor =
    fill === false ? null : typeof fill === 'string' ? fill : withAlpha(chartColor, '22');

  return (
    <View onLayout={onLayout} style={style} accessible accessibilityLabel={accessibilityLabel}>
      {model ? (
        <Svg width={w} height={height}>
          {model.gridYs.map((g, i) => (
            <Line
              key={`grid-${i}`}
              x1={PAD_LEFT}
              y1={g.y}
              x2={w - PAD_RIGHT}
              y2={g.y}
              stroke={theme.backgroundSelected}
              strokeWidth={StyleSheet.hairlineWidth}
            />
          ))}
          {fillColor && model.area ? <Path d={model.area} fill={fillColor} /> : null}
          {model.pts.length > 1 ? (
            <Path
              d={model.line}
              stroke={chartColor}
              strokeWidth={2}
              fill="none"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          ) : null}
          {model.pts.map((p, i) => (
            <Circle
              key={`pt-${i}`}
              cx={p.px}
              cy={p.py}
              r={model.pts.length === 1 ? 4 : 2.5}
              fill={chartColor}
            />
          ))}
        </Svg>
      ) : (
        <View style={{ height }} />
      )}

      {model
        ? model.gridYs.map((g, i) => (
            <View key={`ylabel-${i}`} style={[styles.yLabel, { top: g.y - 8 }]}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.yLabelText}>
                {formatY ? formatY(g.value) : Math.round(g.value).toLocaleString()}
              </ThemedText>
            </View>
          ))
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  yLabel: {
    position: 'absolute',
    left: 0,
    width: PAD_LEFT - Spacing.one,
    alignItems: 'flex-end',
  },
  yLabelText: {
    fontSize: 10,
    lineHeight: 12,
  },
});

export const LineChart = memo(LineChartBase);

export default LineChart;
