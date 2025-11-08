import { Vibration, Platform } from 'react-native';

export function light(): void {
  try {
    // Optional dependency: react-native-haptic-feedback
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Haptics = require('react-native-haptic-feedback').default;
    Haptics.trigger('impactLight', {
      enableVibrateFallback: true,
      ignoreAndroidSystemSettings: true,
    });
    return;
  } catch {}
  try {
    // Minimal fallback vibration
    Vibration.vibrate(Platform.OS === 'ios' ? 10 : 20);
  } catch {}
}

