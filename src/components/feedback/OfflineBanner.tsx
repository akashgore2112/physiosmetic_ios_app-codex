import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import useNetworkStore from '../../store/useNetworkStore';

export default function OfflineBanner(): JSX.Element | null {
  const online = useNetworkStore((s) => s.isOnline);
  if (online) return null;
  return (
    <SafeAreaView edges={['top']} style={styles.wrap} pointerEvents="none">
      <View style={styles.banner}>
        <Text style={styles.text}>You’re offline. Some features may be unavailable.</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 999,
  },
  banner: {
    backgroundColor: '#231f20',
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  text: {
    color: '#fff',
    textAlign: 'center',
    fontSize: 12,
  },
});
