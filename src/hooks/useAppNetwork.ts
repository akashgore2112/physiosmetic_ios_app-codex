import * as Network from 'expo-network';
import { useEffect } from 'react';
import { useNetworkStore } from '../store/useNetworkStore';

export function useAppNetwork() {
  const setOnline = useNetworkStore((s) => s.setOnline);

  useEffect(() => {
    let mounted = true;

    async function prime() {
      try {
        const s = await Network.getNetworkStateAsync();
        const online = !!(s.isConnected && s.isInternetReachable !== false);
        if (mounted) setOnline(online);
      } catch {
        // keep previous
      }
    }
    prime();

    let sub: { remove?: () => void } | undefined;
    if ((Network as any).addNetworkStateListener) {
      sub = (Network as any).addNetworkStateListener((s: any) => {
        const online = !!(s.isConnected && s.isInternetReachable !== false);
        setOnline(online);
      });
    }

    return () => {
      mounted = false;
      if (sub?.remove) sub.remove();
    };
  }, [setOnline]);
}
