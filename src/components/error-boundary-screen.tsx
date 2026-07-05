import type { ErrorBoundaryProps } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ErrorBoundaryScreen({ error, retry }: ErrorBoundaryProps) {
  const theme = useTheme();

  return (
    <ThemedView style={styles.fill}>
      <SafeAreaView style={styles.fill}>
        <View style={styles.content}>
          <Icon name="close" size={44} color={theme.danger} />
          <ThemedText type="subtitle" style={styles.title}>
            Something went wrong
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.message}>
            {error?.message
              ? error.message
              : 'An unexpected error occurred. You can try again to continue.'}
          </ThemedText>
          <View style={styles.action}>
            <Button title="Try again" onPress={retry} accessibilityLabel="Try again" />
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    gap: Spacing.three,
  },
  title: {
    textAlign: 'center',
  },
  message: {
    textAlign: 'center',
  },
  action: {
    marginTop: Spacing.two,
    alignSelf: 'stretch',
  },
});

export default ErrorBoundaryScreen;
