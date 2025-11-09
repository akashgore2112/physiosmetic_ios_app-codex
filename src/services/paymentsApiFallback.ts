import { supabase } from '../config/supabaseClient';

/**
 * Fallback implementation using direct fetch
 * Use this if Supabase Functions SDK doesn't return proper error details
 */
export async function createRazorpayOrderFallback(payload: {
  amount_in_paise: number;
  currency: 'INR';
  user_id: string;
  cart: any[];
}) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;

  if (!token) {
    throw new Error('Not authenticated');
  }

  const SUPABASE_URL = 'https://cjdchjdhrjcmtskkgngb.supabase.co';
  const url = `${SUPABASE_URL}/functions/v1/create_razorpay_order`;

  console.log('[paymentsApiFallback] Making direct request:', { url, payload });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    console.log('[paymentsApiFallback] Response status:', response.status, response.statusText);

    const text = await response.text();
    console.log('[paymentsApiFallback] Response body (raw):', text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      throw new Error(`Invalid JSON response: ${text}`);
    }

    if (!response.ok) {
      const errorMsg = data.error || data.message || `HTTP ${response.status}: ${response.statusText}`;
      console.error('[paymentsApiFallback] Error response:', data);
      throw new Error(errorMsg);
    }

    console.log('[paymentsApiFallback] Success:', data);
    return data as { order_id: string; amount: number; currency: 'INR' };
  } catch (error: any) {
    console.error('[paymentsApiFallback] Request failed:', error);
    throw error;
  }
}
