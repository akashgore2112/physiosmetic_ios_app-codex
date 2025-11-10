import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useSessionStore } from '../../store/useSessionStore';
import { useToast } from '../../components/feedback/useToast';
import { formatPrice } from '../../utils/formatPrice';
import { bookAppointment } from '../../services/bookingService';
import { createRazorpayOrderForService, verifyRazorpayPayment } from '../../services/paymentsApi';
import { createStripePaymentIntent } from '../../services/paymentsApi';
import { initStripePaymentSheet, presentStripePaymentSheet } from '../../components/StripePaymentSheet';
import { getRazorpayKeyId } from '../../services/razorpay';
import RazorpayWebView, { type RazorpayOptions, type RazorpaySuccess } from '../../components/RazorpayWebView';

export default function BookingCheckoutScreen(): JSX.Element {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { userId } = useSessionStore();
  const { show } = useToast();

  const { serviceId, serviceName, therapistId, therapistName, slot, basePrice } = route.params || {};

  const [paymentMethod, setPaymentMethod] = useState<'razorpay' | 'stripe' | 'pay_at_clinic'>('pay_at_clinic');
  const [booking, setBooking] = useState(false);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Razorpay state
  const [showRazorpay, setShowRazorpay] = useState(false);
  const [razorpayOptions, setRazorpayOptions] = useState<any>(null);

  const price = basePrice || 0;
  const tax = 0; // No tax for services currently
  const total = price;

  const onConfirmBooking = async () => {
    if (!userId || !serviceId || !therapistId || !slot) {
      setError('Missing booking details. Please try again.');
      return;
    }

    setError(null);
    setBooking(true);

    try {
      if (paymentMethod === 'razorpay') {
        // Razorpay payment flow
        setBookingMsg('Creating Razorpay order…');
        const keyId = getRazorpayKeyId();
        if (!keyId) {
          setError('Payment unavailable. Try Pay at Clinic.');
          setBooking(false);
          setBookingMsg(null);
          return;
        }
        const amountPaise = Math.round(total * 100);
        const rzp = await createRazorpayOrderForService({
          amount_in_paise: amountPaise,
          currency: 'INR',
          user_id: userId,
          service_id: serviceId,
          therapist_id: therapistId,
          slot_id: slot.id,
        });

        setRazorpayOptions({
          key: keyId,
          amount: rzp.amount,
          currency: 'INR',
          name: 'PHYSIOSMETIC',
          description: 'Service Booking',
          order_id: rzp.order_id,
          prefill: { email: useSessionStore.getState().displayName ?? '', contact: '' },
          theme: { color: '#F37021' },
        });
        setShowRazorpay(true);
        setBooking(false);
        setBookingMsg(null);
        return; // Wait for Razorpay callback

      } else if (paymentMethod === 'stripe') {
        // Stripe payment flow
        setBookingMsg('Initiating Stripe payment…');
        const amountPaise = Math.round(total * 100);
        const { clientSecret } = await createStripePaymentIntent(amountPaise, 'INR');

        setBookingMsg('Loading payment sheet…');
        const initResult = await initStripePaymentSheet(clientSecret);
        if (!initResult.success) {
          setError(initResult.error || 'Failed to initialize payment');
          setBooking(false);
          setBookingMsg(null);
          return;
        }

        setBookingMsg(null);
        setBooking(false);
        const paymentResult = await presentStripePaymentSheet();

        if (!paymentResult.success) {
          if (paymentResult.error === 'Payment canceled') {
            console.log('[BookingCheckout] User canceled Stripe payment');
            return;
          } else {
            setError(paymentResult.error || 'Payment failed');
          }
          return;
        }

        // Payment successful, book appointment
        setBooking(true);
        setBookingMsg('Booking appointment…');
        const idempotencyKey = `stripe_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const res = await bookAppointment({
          userId,
          serviceId,
          therapistId,
          slotId: slot.id,
          payment: {
            payment_method: 'stripe',
            payment_status: 'paid',
            payment_gateway: 'stripe',
            gateway_payment_id: 'stripe_payment',
          },
          amountPaid: total,
          idempotencyKey,
        });

        navigation.replace('BookingSuccess', { appointmentId: res.id, method: 'stripe', amount: total });

      } else {
        // Pay at clinic
        setBookingMsg('Booking appointment…');
        const res = await bookAppointment({
          userId,
          serviceId,
          therapistId,
          slotId: slot.id,
          payment: {
            payment_method: 'pay_at_clinic',
            payment_status: 'pending',
          },
          amountPaid: total,
        });

        navigation.replace('BookingSuccess', { appointmentId: res.id, method: 'pay_at_clinic', amount: total });
      }
    } catch (e: any) {
      console.error('[BookingCheckout] Error:', e);
      setError(e?.message || 'Booking failed. Please try again.');
    } finally {
      setBooking(false);
      setBookingMsg(null);
    }
  };

  const handleRazorpaySuccess = async (response: RazorpaySuccess) => {
    console.log('[BookingCheckout] Razorpay payment success:', response);
    setShowRazorpay(false);
    setBooking(true);
    setBookingMsg('Verifying payment…');

    try {
      const ok = await verifyRazorpayPayment({
        razorpay_order_id: response.razorpay_order_id,
        razorpay_payment_id: response.razorpay_payment_id,
        razorpay_signature: response.razorpay_signature,
      });

      if (!ok?.ok) {
        setError('Payment verification failed. Please contact support.');
        setBooking(false);
        setBookingMsg(null);
        return;
      }

      setBookingMsg('Booking appointment…');
      const idempotencyKey = `rzp_${response.razorpay_order_id}`;
      const res = await bookAppointment({
        userId: userId!,
        serviceId,
        therapistId,
        slotId: slot.id,
        payment: {
          payment_method: 'razorpay',
          payment_status: 'paid',
          payment_gateway: 'razorpay',
          gateway_order_id: response.razorpay_order_id,
          gateway_payment_id: response.razorpay_payment_id,
        },
        amountPaid: total,
        idempotencyKey,
      });

      navigation.replace('BookingSuccess', { appointmentId: res.id, method: 'razorpay', amount: total });
    } catch (e: any) {
      console.error('[BookingCheckout] Post-payment error:', e);
      setError(e?.message || 'Booking failed after payment. Contact support.');
    } finally {
      setBooking(false);
      setBookingMsg(null);
    }
  };

  const handleRazorpayError = (error: string) => {
    setShowRazorpay(false);
    setError(error || 'Payment failed');
    console.error('[BookingCheckout] Razorpay error:', error);
  };

  const handleRazorpayCancel = () => {
    setShowRazorpay(false);
    console.log('[BookingCheckout] Razorpay canceled');
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#f9fafb' }}>
      <View style={{ padding: 16 }}>
        {/* Booking Summary */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Booking Summary</Text>

          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#666', fontSize: 12 }}>Service</Text>
            <Text style={{ fontWeight: '600', fontSize: 15 }}>{serviceName}</Text>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#666', fontSize: 12 }}>Therapist</Text>
            <Text style={{ fontWeight: '600', fontSize: 15 }}>{therapistName}</Text>
          </View>

          <View style={{ marginBottom: 8 }}>
            <Text style={{ color: '#666', fontSize: 12 }}>Date & Time</Text>
            <Text style={{ fontWeight: '600', fontSize: 15 }}>
              {slot?.date} at {slot?.start_time}
            </Text>
          </View>
        </View>

        {/* Price Breakdown */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Price Breakdown</Text>

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text>Service Fee</Text>
            <Text style={{ fontWeight: '600' }}>{formatPrice(price)}</Text>
          </View>

          <View style={{ height: 1, backgroundColor: '#eee', marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>Total</Text>
            <Text style={{ fontSize: 16, fontWeight: '700' }}>{formatPrice(total)}</Text>
          </View>
        </View>

        {/* Payment Method Selection */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '700', marginBottom: 12 }}>Payment Method</Text>

          {['pay_at_clinic', 'razorpay', 'stripe'].map((method) => (
            <TouchableOpacity
              key={method}
              onPress={() => setPaymentMethod(method as any)}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 12,
                borderWidth: 1,
                borderColor: paymentMethod === method ? '#1e64d4' : '#ddd',
                borderRadius: 8,
                marginBottom: 8,
                backgroundColor: paymentMethod === method ? '#f0f7ff' : '#fff',
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  borderColor: paymentMethod === method ? '#1e64d4' : '#ccc',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 12,
                }}
              >
                {paymentMethod === method && (
                  <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#1e64d4' }} />
                )}
              </View>
              <Text style={{ fontWeight: '600' }}>
                {method === 'pay_at_clinic' ? 'Pay at Clinic' : method === 'razorpay' ? 'Razorpay (Test)' : 'Stripe (Test)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error Message */}
        {error && (
          <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 16 }}>
            <Text style={{ color: '#dc2626' }}>{error}</Text>
          </View>
        )}

        {/* Confirm Button */}
        <TouchableOpacity
          disabled={booking}
          onPress={onConfirmBooking}
          style={{
            padding: 16,
            borderRadius: 12,
            backgroundColor: booking ? '#ccc' : '#1e64d4',
            alignItems: 'center',
            marginBottom: 20,
          }}
        >
          {booking ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: '#fff', fontWeight: '700' }}>{bookingMsg || 'Booking…'}</Text>
            </View>
          ) : (
            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>
              {paymentMethod === 'pay_at_clinic' ? 'Confirm Booking' : 'Proceed to Payment'}
            </Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Razorpay WebView */}
      {razorpayOptions && (
        <RazorpayWebView
          visible={showRazorpay}
          options={razorpayOptions}
          onSuccess={handleRazorpaySuccess}
          onError={handleRazorpayError}
          onCancel={handleRazorpayCancel}
        />
      )}
    </ScrollView>
  );
}
