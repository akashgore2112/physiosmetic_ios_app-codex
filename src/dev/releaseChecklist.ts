import { ActionSheetIOS, Alert, Platform } from 'react-native';

function boolMark(v: boolean | undefined, label: string) {
  const ok = v ? '✅' : '⚠️';
  return `${ok} ${label}${v === undefined ? ' (check manually)' : ''}`;
}

export function showReleaseChecklist() {
  try {
    const hasSentryDsn = !!process.env.EXPO_PUBLIC_SENTRY_DSN;
    const hasSupabaseUrl = !!process.env.EXPO_PUBLIC_SUPABASE_URL || !!process.env.SUPABASE_URL;
    const hasSupabaseAnon = !!process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || !!process.env.SUPABASE_ANON_KEY;

    const lines = [
      'Release Checklist',
      boolMark(undefined, 'Icons & splash present (assets/, app.json)'),
      boolMark(undefined, 'Bundle IDs set (iOS/Android)'),
      boolMark(hasSentryDsn, 'Sentry DSN present (EXPO_PUBLIC_SENTRY_DSN)'),
      boolMark(hasSupabaseUrl && hasSupabaseAnon, 'Supabase env keys set'),
      boolMark(undefined, 'EAS build profiles exist (eas.json)'),
      boolMark(hasSentryDsn, 'Sentry.init OK (crash-free session)'),
    ];

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: [...lines, 'Cancel'],
          cancelButtonIndex: lines.length,
          title: 'Release Readiness',
          message: 'Verify these before submitting to stores',
        },
        () => {}
      );
    } else {
      Alert.alert('Release Readiness', lines.slice(1).join('\n'));
    }
  } catch (e: any) {
    Alert.alert('Checklist Error', e?.message ?? 'Unable to open checklist');
  }
}

