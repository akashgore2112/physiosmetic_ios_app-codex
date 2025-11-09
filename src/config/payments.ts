import Constants from 'expo-constants';

const ex: any = (Constants as any)?.expoConfig?.extra ?? {};
export const RZP_ENV = (ex.RAZORPAY_ENV ?? 'test') as 'test' | 'live';
export const RZP_KEY_ID = ex.EXPO_PUBLIC_RAZORPAY_KEY_ID as string | undefined;

