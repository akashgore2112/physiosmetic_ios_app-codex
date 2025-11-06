import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppNetwork } from './src/hooks/useAppNetwork';
import useNetworkStore from './src/store/useNetworkStore';
import AppTabs from './src/navigation/AppTabs';
import { ToastProvider } from './src/components/feedback/ToastProvider';
import OfflineBanner from './src/components/feedback/OfflineBanner';

export default function App() {
  useAppNetwork(); // keep network listener alive
  const isOnline = useNetworkStore((s) => s.isOnline);

  return (
    <ToastProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        <OfflineBanner />
        {/* Root tabs (Booking/Shop/Account etc.) */}
        <AppTabs />
      </NavigationContainer>
    </ToastProvider>
  );
}
