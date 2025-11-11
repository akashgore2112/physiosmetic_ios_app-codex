/**
 * Razorpay Web Integration for Expo Managed Workflow
 * Uses Razorpay's Standard Checkout (web-based) instead of native SDK
 */

import * as WebBrowser from 'expo-web-browser';
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

export type RazorpaySuccess = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

/**
 * Opens Razorpay Standard Checkout in a web browser
 * Works with Expo Go and managed workflow
 */
export async function openPayment(options: RazorpayOptions): Promise<RazorpaySuccess> {
  return new Promise((resolve, reject) => {
    // Create checkout HTML page
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      background: #f5f5f5;
    }
    .loading {
      text-align: center;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #F37021;
      border-radius: 50%;
      width: 40px;
      height: 40px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Opening Payment Gateway...</p>
  </div>
  <script>
    const options = ${JSON.stringify({
      ...options,
      modal: {
        ondismiss: function() {
          window.location.href = 'exp://close?error=cancelled';
        }
      },
      handler: function(response: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) {
        // Payment successful
        const params = new URLSearchParams({
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
        window.location.href = 'exp://close?' + params.toString();
      }
    })};

    // Open Razorpay checkout immediately
    try {
      const rzp = new Razorpay(options);
      rzp.on('payment.failed', function(response: { error: { code?: string; description?: string } }) {
        const params = new URLSearchParams({
          error: 'failed',
          code: response.error.code,
          description: response.error.description
        });
        window.location.href = 'exp://close?' + params.toString();
      });
      rzp.open();
    } catch (e) {
      window.location.href = 'exp://close?error=' + encodeURIComponent(e.message);
    }
  </script>
</body>
</html>`;

    // Create data URL for the HTML
    const dataUrl = `data:text/html;base64,${btoa(html)}`;

    console.log('[razorpayWeb] Opening payment browser...');

    // Open in web browser
    WebBrowser.openBrowserAsync(dataUrl, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FULL_SCREEN,
      dismissButtonStyle: 'close',
    })
      .then((result) => {
        console.log('[razorpayWeb] Browser result:', result);

        if (result.type === 'cancel') {
          reject(new Error('Payment cancelled by user'));
          return;
        }

        if (result.type === 'dismiss') {
          // Try to parse URL if available
          const url = (result as any).url;
          if (url) {
            const params = new URLSearchParams(url.split('?')[1]);
            const error = params.get('error');
            const orderId = params.get('razorpay_order_id');
            const paymentId = params.get('razorpay_payment_id');
            const signature = params.get('razorpay_signature');

            if (error) {
              const description = params.get('description') || error;
              reject(new Error(description));
              return;
            }

            if (orderId && paymentId && signature) {
              resolve({
                razorpay_order_id: orderId,
                razorpay_payment_id: paymentId,
                razorpay_signature: signature,
              });
              return;
            }
          }

          reject(new Error('Payment cancelled'));
          return;
        }

        reject(new Error('Payment process interrupted'));
      })
      .catch((error) => {
        console.error('[razorpayWeb] Browser error:', error);
        reject(error);
      });
  });
}

export function getRazorpayKeyId(): string | null {
  const expoConfig: any = (Constants as any)?.expoConfig;
  const id =
    expoConfig?.extra?.EXPO_PUBLIC_RAZORPAY_KEY_ID ||
    (process.env as any)?.EXPO_PUBLIC_RAZORPAY_KEY_ID;
  return id || null;
}
