import { Platform, ToastAndroid, Alert } from 'react-native';

export function showToast(msg: string) {
  if (Platform.OS === 'android') ToastAndroid.show(msg, ToastAndroid.SHORT);
  else Alert.alert('', msg);
}

export function toastError(err: any) {
  try {
    const code = err?.code ? ` (${err.code})` : '';
    const message = err?.message || 'Something went wrong';
    showToast(`${message}${code}`);
  } catch {
    showToast('Something went wrong');
  }
}
