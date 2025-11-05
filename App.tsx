import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import RootNavigator from './src/navigation/RootNavigator';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import { supabase } from './src/config/supabaseClient';
import { useSessionStore } from './src/store/useSessionStore';
import { fetchProfile } from './src/services/profileService';

export default function App(): JSX.Element {
  // Bootstrap Supabase auth session and subscribe to changes
  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const session = data.session;
      if (session?.user && mounted) {
        const user = session.user;
        useSessionStore.getState().setSession(user.id, user.email ?? null);
        const prof = await fetchProfile(user.id);
        useSessionStore.getState().setProfile(prof, { email: user.email ?? null, user_metadata: user.user_metadata as any });
      }
    })();
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user;
      if (user) {
        useSessionStore.getState().setSession(user.id, user.email ?? null);
        const prof = await fetchProfile(user.id);
        useSessionStore.getState().setProfile(prof, { email: user.email ?? null, user_metadata: user.user_metadata as any });
      } else {
        useSessionStore.getState().clearSession();
      }
    });
    return () => { mounted = false; sub.subscription?.unsubscribe(); };
  }, []);

  return (
    <ToastProvider>
      <NavigationContainer>
        <RootNavigator />
      </NavigationContainer>
    </ToastProvider>
  );
}
