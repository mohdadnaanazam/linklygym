import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  style?: StyleProp<ViewStyle>;
  borderRadius?: number;
  padding?: number;
};

export function Card({
  children,
  style,
  borderRadius = Radius.lg,
  padding = Spacing.three,
  ...rest
}: CardProps) {
  const theme = useTheme();

  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: theme.surface,
          borderColor: theme.border,
          borderRadius,
          padding,
        },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    overflow: 'hidden',
    borderWidth: 1,
  },
});

export default Card;
