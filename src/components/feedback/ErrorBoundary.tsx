import React from 'react';
import { View, Text } from 'react-native';
import * as Sentry from 'sentry-expo';

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    try { Sentry.Native.captureException(error, { extra: errorInfo }); } catch {}
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <Text>Something went wrong.</Text>
        </View>
      );
    }
    return this.props.children as any;
  }
}

