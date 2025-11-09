import React, { useRef } from 'react';
import { Modal, View, TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';

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

interface Props {
  visible: boolean;
  options: RazorpayOptions;
  onSuccess: (response: RazorpaySuccess) => void;
  onError: (error: string) => void;
  onCancel: () => void;
}

export default function RazorpayWebView({ visible, options, onSuccess, onError, onCancel }: Props) {
  const webViewRef = useRef<WebView>(null);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>Payment</title>
  <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      background: #f5f5f5;
    }
    .loading {
      text-align: center;
      padding: 20px;
    }
    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #F37021;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .message {
      font-size: 16px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p class="message">Opening Payment Gateway...</p>
  </div>
  <script>
    function sendMessage(type, data) {
      window.ReactNativeWebView.postMessage(JSON.stringify({ type, data }));
    }

    const options = {
      key: "${options.key}",
      amount: ${options.amount},
      currency: "${options.currency}",
      name: "${options.name}",
      description: "${options.description}",
      order_id: "${options.order_id}",
      prefill: ${JSON.stringify(options.prefill || {})},
      theme: ${JSON.stringify(options.theme || { color: '#F37021' })},
      handler: function(response) {
        sendMessage('success', {
          razorpay_order_id: response.razorpay_order_id,
          razorpay_payment_id: response.razorpay_payment_id,
          razorpay_signature: response.razorpay_signature
        });
      },
      modal: {
        ondismiss: function() {
          sendMessage('cancel', {});
        }
      }
    };

    try {
      const rzp = new Razorpay(options);

      rzp.on('payment.failed', function(response) {
        sendMessage('error', {
          code: response.error.code,
          description: response.error.description,
          reason: response.error.reason
        });
      });

      // Open checkout
      rzp.open();
    } catch (e) {
      sendMessage('error', { description: e.message });
    }
  </script>
</body>
</html>`;

  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      console.log('[RazorpayWebView] Message received:', message);

      switch (message.type) {
        case 'success':
          onSuccess(message.data);
          break;
        case 'error':
          onError(message.data.description || 'Payment failed');
          break;
        case 'cancel':
          onCancel();
          break;
        default:
          console.warn('[RazorpayWebView] Unknown message type:', message.type);
      }
    } catch (error) {
      console.error('[RazorpayWebView] Failed to parse message:', error);
      onError('Failed to process payment response');
    }
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onCancel} style={styles.closeButton}>
            <Text style={styles.closeText}>✕ Close</Text>
          </TouchableOpacity>
          <Text style={styles.title}>Payment</Text>
        </View>

        <WebView
          ref={webViewRef}
          source={{ html }}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#F37021" />
              <Text style={styles.loadingText}>Loading payment gateway...</Text>
            </View>
          )}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[RazorpayWebView] WebView error:', nativeEvent);
            onError('Failed to load payment gateway');
          }}
          style={styles.webview}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  closeButton: {
    padding: 8,
  },
  closeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginRight: 60, // To center the title (compensate for close button)
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
