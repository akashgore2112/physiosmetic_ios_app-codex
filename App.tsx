import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppNetwork } from './src/hooks/useAppNetwork';
import useNetworkStore from './src/store/useNetworkStore';
import AppTabs from './src/navigation/AppTabs';
import { ToastProvider } from './src/components/feedback/ToastProvider';

export default function App() {
  useAppNetwork(); // keep network listener alive
  const isOnline = useNetworkStore((s) => s.isOnline);

  return (
    <ToastProvider>
      <NavigationContainer>
        <StatusBar barStyle="dark-content" />
        {/* Root tabs (Booking/Shop/Account etc.) */}
        <AppTabs />
      </NavigationContainer>
    </ToastProvider>
  );
}
