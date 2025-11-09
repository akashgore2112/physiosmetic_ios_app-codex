import { supabase } from '../config/supabaseClient';

export async function createRazorpayOrder(payload: { amount_in_paise: number; currency: 'INR'; user_id: string; cart: any[] }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;

  console.log('[paymentsApi] Creating Razorpay order:', {
    amount: payload.amount_in_paise,
    user_id: payload.user_id,
    cart_items: payload.cart?.length,
    cart: payload.cart,
    has_token: !!token,
  });

  const { data, error } = await supabase.functions.invoke('create_razorpay_order', {
    body: payload,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  console.log('[paymentsApi] Raw response data:', data);
  console.log('[paymentsApi] Raw response error:', error);
  console.log('[paymentsApi] Data type:', typeof data, 'Error type:', typeof error);

  // If there's an error, try to extract the actual error message from response body
  if (error) {
    console.error('[paymentsApi] Edge Function error:', error);

    // The actual error message is in the response body, need to read it
    let errorMessage = 'Failed to create payment order';

    // Try to get response body if available
    if (error.context && typeof error.context.json === 'function') {
      try {
        const errorBody = await error.context.json();
        console.error('[paymentsApi] Error body:', errorBody);
        if (errorBody.error) {
          errorMessage = errorBody.error;
        }
      } catch (e) {
        console.error('[paymentsApi] Failed to parse error body:', e);
      }
    } else if (error.context && typeof error.context.text === 'function') {
      try {
        const errorText = await error.context.text();
        console.error('[paymentsApi] Error text:', errorText);
        try {
          const errorBody = JSON.parse(errorText);
          if (errorBody.error) {
            errorMessage = errorBody.error;
          }
        } catch (e) {
          errorMessage = errorText;
        }
      } catch (e) {
        console.error('[paymentsApi] Failed to read error text:', e);
      }
    }

    // Also check if data has the error (sometimes Supabase puts it there)
    if (data?.error) {
      console.error('[paymentsApi] Error in data:', data.error);
      errorMessage = data.error;
    }

    throw new Error(errorMessage);
  }

  // Check data for errors even if no error object
  if (data?.error) {
    console.error('[paymentsApi] Response has error:', data.error);
    throw new Error(data.error);
  }

  console.log('[paymentsApi] Order created successfully:', data);
  return data as { order_id: string; amount: number; currency: 'INR' };
}

export async function verifyRazorpayPayment(payload: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
  const { data: sess } = await supabase.auth.getSession();
  const token = sess.session?.access_token;
  const { data, error } = await supabase.functions.invoke('verify_razorpay_payment', {
    body: payload,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (error) throw error;
  return data as { ok: boolean };
}
