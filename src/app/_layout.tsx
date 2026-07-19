import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundaryScreen } from '@/components/error-boundary-screen';
import { StartupGate } from '@/components/startup-gate';
import { Colors } from '@/constants/theme';
import { NudgeKitInspectorProvider } from '@/features/inspector/nudgekit-inspector-provider';

SplashScreen.preventAutoHideAsync();

export { ErrorBoundaryScreen as ErrorBoundary };

export default function RootLayout() {
  const colors = Colors.dark;
  const navigationTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      primary: colors.accent,
      background: colors.background,
      card: colors.surface,
      text: colors.text,
      border: colors.border,
      notification: colors.accent,
    },
  };

  return (
    <NudgeKitInspectorProvider>
      <ThemeProvider value={navigationTheme}>
        <AnimatedSplashOverlay />
        <StartupGate>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.background },
              headerTintColor: colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: colors.background },
            }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="inspector" options={{ headerShown: false }} />

            <Stack.Screen name="exercise/[id]" options={{ title: 'Exercise' }} />
            <Stack.Screen name="routine/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="workout/active" options={{ headerShown: false }} />
            <Stack.Screen name="workout/[id]" options={{ title: 'Workout' }} />
            <Stack.Screen name="history" options={{ title: 'History' }} />
            <Stack.Screen name="metrics" options={{ title: 'Body Metrics' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </StartupGate>
      </ThemeProvider>
    </NudgeKitInspectorProvider>
  );
}
