import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppNetwork } from './src/hooks/useAppNetwork';
import { supabase } from './src/config/supabaseClient';
import { useSessionStore } from './src/store/useSessionStore';
import useNetworkStore from './src/store/useNetworkStore';
import AppTabs from './src/navigation/AppTabs';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import OfflineBanner from './src/components/feedback/OfflineBanner';

export default function App() {
  useAppNetwork(); // keep network listener alive
  const isOnline = useNetworkStore((s) => s.isOnline);

  // Bootstrap Supabase auth session → populate session store (userId)
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const u = data.session?.user;
        if (u && mounted) useSessionStore.getState().setSession(u.id, u.email ?? null);
      } catch {}
    })();
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, session) => {
      const u = session?.user;
      if (u) useSessionStore.getState().setSession(u.id, u.email ?? null);
      else useSessionStore.getState().clearSession();
    });
    return () => { mounted = false; sub.subscription?.unsubscribe(); };
  }, []);

  return (
    <ToastProvider>
      <SafeAreaProvider>
        <NavigationContainer>
          <StatusBar barStyle="dark-content" />
          <OfflineBanner />
          {/* Root tabs (Booking/Shop/Account etc.) */}
          <AppTabs />
        </NavigationContainer>
      </SafeAreaProvider>
    </ToastProvider>
  );
}
