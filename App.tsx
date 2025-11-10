import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { Linking } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAppNetwork } from './src/hooks/useAppNetwork';
import { supabase } from './src/config/supabaseClient';
import { useSessionStore } from './src/store/useSessionStore';
import useNetworkStore from './src/store/useNetworkStore';
import AppTabs from './src/navigation/AppTabs';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import OfflineBanner from './src/components/feedback/OfflineBanner';
import ErrorBoundary from './src/components/ErrorBoundary';

export default function App() {
  useAppNetwork(); // keep network listener alive
  const isOnline = useNetworkStore((s) => s.isOnline);
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const setPostLoginIntent = useSessionStore((s) => s.setPostLoginIntent);
  const navRef = React.useRef(createNavigationContainerRef<any>());
  const navReadyRef = React.useRef(false);

  const linking = React.useMemo(() => ({
    prefixes: ['physiosmetic://'],
    config: {
      screens: {
        Home: '',
        Services: {
          screens: {
            ServicesMain: 'services',
            ServiceDetail: 'services/:serviceId',
          },
        },
        Shop: {
          screens: {
            ShopMain: 'shop',
            ProductDetail: 'shop/:productId',
            Cart: 'cart',
          },
        },
        Account: '',
      },
    },
  }), []);

  const handleDeepLink = React.useCallback((urlStr: string | null) => {
    if (!urlStr) return;
    try {
      // Expect formats like: physiosmetic://services/<id> or physiosmetic://book/<id>
      const withoutScheme = urlStr.replace(/^physiosmetic:\/\//, '');
      const [pathOnly, queryStr] = withoutScheme.split('?');
      const query: Record<string, string> = {};
      if (queryStr) {
        queryStr.split('&').forEach((pair) => {
          const [k, v] = pair.split('=');
          if (k) query[decodeURIComponent(k)] = v ? decodeURIComponent(v) : '';
        });
      }
      const parts = pathOnly.split('/').filter(Boolean);
      const first = parts[0];
      const second = parts[1];
      if (!navRef.current?.isReady()) return;
      if (first === 'services' && second) {
        navRef.current.navigate('Services', { screen: 'ServiceDetail', params: { serviceId: second } });
        return;
      }
      if (first === 'services' && !second) {
        const cat = query['category'];
        if (typeof cat === 'string' && cat.trim().length > 0) {
          navRef.current.navigate('Services', { screen: 'ServicesMain', params: { highlightCategory: cat } });
        } else {
          navRef.current.navigate('Services', { screen: 'ServicesMain' });
        }
        return;
      }
      if (first === 'book' && second) {
        if (!isLoggedIn) {
          setPostLoginIntent({ action: 'book_service', params: { serviceId: second } });
          navRef.current.navigate('Account', { screen: 'SignIn' });
        } else {
          navRef.current.navigate('Services', { screen: 'SelectTherapist', params: { serviceId: second } });
        }
        return;
      }
      // Shop deeplinks: physiosmetic://shop/<productId>
      if (first === 'shop' && second) {
        navRef.current.navigate('Shop', { screen: 'ProductDetail', params: { id: second } });
        return;
      }
      // Cart deeplink: physiosmetic://cart
      if (first === 'cart' && !second) {
        navRef.current.navigate('Shop', { screen: 'Cart' });
        return;
      }
    } catch {}
  }, [isLoggedIn, setPostLoginIntent]);

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

  // Deep link wiring: initial + subscribe
  React.useEffect(() => {
    let sub: any;
    (async () => {
      const initial = await Linking.getInitialURL();
      if (navReadyRef.current) handleDeepLink(initial);
    })();
    sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => { sub?.remove?.(); };
  }, [handleDeepLink]);

  return (
    <ErrorBoundary>
      <ToastProvider>
        <SafeAreaProvider>
          <NavigationContainer
            ref={navRef as any}
            linking={linking}
            onReady={() => { navReadyRef.current = true; }}
          >
            <StatusBar barStyle="dark-content" />
            <OfflineBanner />
            {/* Root tabs (Booking/Shop/Account etc.) */}
            <AppTabs />
          </NavigationContainer>
        </SafeAreaProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
}
