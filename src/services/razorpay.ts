import Constants from 'expo-constants';

export type RazorpayOptions = {
  key: string;
  amount: number;
  currency: 'INR';
  name: string;
  description: string;
  order_id: string;
  prefill?: { email?: string | null; contact?: string | null };
  theme?: { color?: string };
};

export type RazorpaySuccess = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

export async function openPayment(options: RazorpayOptions): Promise<RazorpaySuccess> {
  // Lazy require to avoid crashes if module missing during dev
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const RazorpayCheckout = require('react-native-razorpay');
  return await new Promise((resolve, reject) => {
    try {
      RazorpayCheckout.open(options)
        .then((data: any) => resolve(data as RazorpaySuccess))
        .catch((err: any) => reject(err));
    } catch (e) {
      reject(e);
    }
  });
}

export function getRazorpayKeyId(): string | null {
  const expoConfig: any = (Constants as any)?.expoConfig;
  const id = expoConfig?.extra?.EXPO_PUBLIC_RAZORPAY_KEY_ID || (process.env as any)?.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  return id || null;
}

