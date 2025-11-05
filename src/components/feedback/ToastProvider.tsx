import React, { createContext, useContext, useMemo } from 'react';
import { Platform, ToastAndroid, Alert } from 'react-native';

type ToastContextType = {
  show: (message: string) => void;
};

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }): JSX.Element {
  const api = useMemo<ToastContextType>(() => ({
    show: (message: string) => {
      if (Platform.OS === 'android') ToastAndroid.show(message, ToastAndroid.SHORT);
      else Alert.alert('', message);
    },
  }), []);

  return <ToastContext.Provider value={api}>{children}</ToastContext.Provider>;
}

export function useToastInternal(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

