import { type PropsWithChildren, useEffect, useRef } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { usePathname } from 'expo-router';
import ViewShot, { type ViewShotRef } from 'react-native-view-shot';

import { useInspectorStore } from './inspector-store';

const CAPTURE_INTERVAL_MS = 750;

export function NudgeKitInspectorProvider({ children }: PropsWithChildren) {
  const viewShotRef = useRef<ViewShotRef>(null);
  const captureInFlightRef = useRef(false);
  const session = useInspectorStore((state) => state.session);
  const pathname = usePathname();
  const { width, height } = useWindowDimensions();

  useEffect(() => {
    if (!__DEV__ || !session) return;

    let cancelled = false;
    const captureAndUpload = async () => {
      if (captureInFlightRef.current || cancelled) return;
      captureInFlightRef.current = true;
      try {
        const frame = await viewShotRef.current?.capture?.();
        if (!frame || cancelled) return;
        await fetch(
          `${session.relayOrigin.replace(/\/+$/, '')}/api/inspector/${session.sessionId}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              frame,
              capturedAt: Date.now(),
              platform: Platform.OS,
              width: Math.round(width),
              height: Math.round(height),
              route: pathname,
            }),
          }
        );
      } catch {
        // Inspector is best-effort and must never interrupt the host app.
      } finally {
        captureInFlightRef.current = false;
      }
    };

    void captureAndUpload();
    const timer = setInterval(() => void captureAndUpload(), CAPTURE_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [height, pathname, session, width]);

  if (!__DEV__) return <>{children}</>;

  return (
    <View style={styles.root}>
      <ViewShot
        ref={viewShotRef}
        style={styles.root}
        options={{
          format: 'jpg',
          quality: 1,
          result: 'base64',
        }}>
        {children}
      </ViewShot>

      {session ? (
        <View pointerEvents="none" style={styles.badge}>
          <View style={styles.dot} />
          <Text style={styles.badgeText}>Inspector live</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: 54,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(10, 10, 10, 0.84)',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#34d399',
  },
  badgeText: {
    color: '#f8fafc',
    fontSize: 11,
    fontWeight: '600',
  },
});
