import { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useInspectorStore } from '@/features/inspector/inspector-store';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default function InspectorConnectScreen() {
  const params = useLocalSearchParams<{
    session?: string | string[];
    relay?: string | string[];
  }>();
  const router = useRouter();
  const activate = useInspectorStore((state) => state.activate);

  useEffect(() => {
    const sessionId = first(params.session);
    const relayOrigin = first(params.relay);
    if (__DEV__ && sessionId && relayOrigin) {
      activate({ sessionId, relayOrigin });
    }
    router.replace('/(tabs)');
  }, [activate, params.relay, params.session, router]);

  return (
    <View style={styles.root}>
      <ActivityIndicator color="#34d399" />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#07110d',
  },
});
