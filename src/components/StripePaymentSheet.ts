import { initStripe, initPaymentSheet, presentPaymentSheet } from '@stripe/stripe-react-native';
import Constants from 'expo-constants';

let stripeInitialized = false;

/**
 * Initialize Stripe SDK (call once)
 */
async function ensureStripeInitialized(): Promise<{ success: boolean; error?: string }> {
  if (stripeInitialized) {
    return { success: true };
  }

  try {
    const publishableKey = Constants.expoConfig?.extra?.EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY;

    if (!publishableKey) {
      console.error('[StripePaymentSheet] Missing EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY in app.json');
      return { success: false, error: 'Stripe configuration missing' };
    }

    console.debug('[StripePaymentSheet] Initializing Stripe with publishable key:', publishableKey.substring(0, 15) + '...');

    await initStripe({
      publishableKey,
      merchantIdentifier: 'merchant.com.physiosmetic.app', // iOS only, for Apple Pay
    });

    stripeInitialized = true;
    console.debug('[StripePaymentSheet] Stripe SDK initialized successfully');
    return { success: true };
  } catch (e: any) {
    console.error('[StripePaymentSheet] Failed to initialize Stripe:', e);
    return { success: false, error: e?.message || 'Failed to initialize Stripe' };
  }
}

/**
 * Initialize Stripe PaymentSheet with client secret
 * @param clientSecret - The client secret from PaymentIntent
 * @returns Promise resolving to initialization result
 */
export async function initStripePaymentSheet(clientSecret: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Ensure Stripe SDK is initialized first
    const initResult = await ensureStripeInitialized();
    if (!initResult.success) {
      return initResult;
    }

    console.debug('[StripePaymentSheet] Initializing PaymentSheet...');

    const { error } = await initPaymentSheet({
      merchantDisplayName: 'PHYSIOSMETIC',
      paymentIntentClientSecret: clientSecret,
      defaultBillingDetails: {
        // Can be pre-filled with user details if available
      },
      allowsDelayedPaymentMethods: false,
    });

    if (error) {
      console.error('[StripePaymentSheet] PaymentSheet initialization error:', error);
      return { success: false, error: error.message };
    }

    console.debug('[StripePaymentSheet] PaymentSheet initialized successfully');
    return { success: true };
  } catch (e: any) {
    console.error('[StripePaymentSheet] Initialization exception:', e);
    return { success: false, error: e?.message || 'Failed to initialize payment sheet' };
  }
}

/**
 * Present Stripe PaymentSheet to user
 * @returns Promise resolving to payment result
 */
export async function presentStripePaymentSheet(): Promise<{ success: boolean; paymentIntentId?: string; error?: string }> {
  try {
    console.debug('[StripePaymentSheet] Presenting payment sheet');

    const { error } = await presentPaymentSheet();

    if (error) {
      // User canceled - this is expected behavior, not an error
      if (error.code === 'Canceled') {
        console.log('[StripePaymentSheet] Payment canceled by user');
        return { success: false, error: 'Payment canceled' };
      }

      // Actual payment errors
      console.error('[StripePaymentSheet] Payment error:', error);
      return { success: false, error: error.message };
    }

    console.debug('[StripePaymentSheet] Payment successful');
    return { success: true };
  } catch (e: any) {
    console.error('[StripePaymentSheet] Payment exception:', e);
    return { success: false, error: e?.message || 'Payment failed' };
  }
}
