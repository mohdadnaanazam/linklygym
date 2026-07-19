import { BlurView } from 'expo-blur';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Radius } from '@/constants/theme';

export type GlassSurfaceProps = {
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  intensity?: number;
  tint?: 'light' | 'dark' | 'default';
};

const LIQUID_GLASS = isLiquidGlassAvailable();

export function GlassSurface({
  children,
  style,
  borderRadius = Radius.lg,
  intensity = 40,
  tint = 'dark',
}: GlassSurfaceProps) {
  if (LIQUID_GLASS) {
    return (
      <GlassView
        glassEffectStyle="regular"
        colorScheme="dark"
        style={[{ borderRadius, overflow: 'hidden' }, style]}>
        {children}
      </GlassView>
    );
  }

  return (
    <View style={[styles.fallback, { borderRadius }, style]}>
      <BlurView intensity={intensity} tint={tint} style={StyleSheet.absoluteFill} />
      <View style={[StyleSheet.absoluteFill, styles.overlay]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(199, 243, 107, 0.14)',
  },
  overlay: {
    backgroundColor: 'rgba(12, 15, 12, 0.68)',
  },
});

export default GlassSurface;
