import React from 'react';
import { View, Text } from 'react-native';

type State = { hasError: boolean };

export default class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: any, errorInfo: any) {
    try {
      // Lazy require to avoid loading Sentry at module init time
      // Use eval to avoid Metro static resolution if sentry-expo is missing
      // eslint-disable-next-line no-eval
      const req: any = eval('require');
      const Sentry = req('sentry-expo');
      Sentry.Native.captureException(error, { extra: errorInfo });
    } catch {}
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
