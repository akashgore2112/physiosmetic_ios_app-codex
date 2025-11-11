import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { formatPrice } from '../../utils/formatPrice';
import { showToast } from '../../utils/toast';
import { cancelOrder, getOrderById } from '../../services/orderService';
import TotalsCard from '../../components/TotalsCard';

export default function OrderDetailScreen(): JSX.Element {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const orderId = route.params?.id as string;
  const [loading, setLoading] = useState(true);
  const [order, setOrder] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const data = await getOrderById(orderId);
        setOrder(data);
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load order');
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId]);

  const eligibleToCancel = order && (String(order.status) === 'pending' || String(order.status) === 'placed');

  if (loading) return <View style={{ padding: 16 }}><ActivityIndicator /></View>;
  if (error || !order) return <View style={{ padding: 16 }}><Text>{error ?? 'Order not found'}</Text></View>;

  // Calculate totals from server data (prefer server fields over client calculation)
  const subtotal = (order.items ?? []).reduce((s: number, it: any) => s + it.qty * it.price_each, 0);
  const discount = order.discount_amount ?? 0;
  const tax = order.tax_amount ?? Math.round((subtotal - discount) * 0.10 * 100) / 100;
  const shipping = order.shipping_amount ?? (order.pickup ? 0 : 50);
  const total = order.total_amount ?? (subtotal - discount + tax + shipping);

  const statusColor = order.status === 'delivered' ? '#16a34a' : order.status === 'cancelled' ? '#dc2626' : order.status === 'shipped' ? '#2563eb' : '#d97706';
  const paymentMethodLabel = order.payment_method === 'razorpay' ? 'Razorpay' : order.payment_method === 'stripe' ? 'Stripe' : order.payment_method === 'cod' ? 'Cash on Delivery' : 'Unknown';
  const paymentStatusLabel = order.payment_status === 'paid' ? 'Paid' : order.payment_status === 'pending' ? 'Pending' : order.payment_status === 'failed' ? 'Failed' : order.payment_status === 'refunded' ? 'Refunded' : 'Unknown';
  const paymentStatusColor = order.payment_status === 'paid' ? '#16a34a' : order.payment_status === 'failed' ? '#dc2626' : order.payment_status === 'refunded' ? '#ea580c' : '#d97706';

  return (
    <ScrollView style={{ flex: 1 }}>
      <View style={{ padding: 16 }}>
        {/* Header */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 20, fontWeight: '700' }}>Order #{order.id.slice(-8)}</Text>
          <View style={{ backgroundColor: statusColor, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600', textTransform: 'uppercase' }}>{order.status}</Text>
          </View>
        </View>

        {/* Payment Info */}
        <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>Payment Information</Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text style={{ color: '#666' }}>Method:</Text>
            <Text style={{ fontWeight: '600' }}>{paymentMethodLabel}</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={{ color: '#666' }}>Status:</Text>
            <View style={{ backgroundColor: paymentStatusColor, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
              <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{paymentStatusLabel}</Text>
            </View>
          </View>
          {order.gateway_payment_id && (
            <Text style={{ color: '#666', fontSize: 11, marginTop: 6 }}>Transaction ID: {order.gateway_payment_id}</Text>
          )}
        </View>

        {/* Shipping/Pickup Info */}
        <View style={{ backgroundColor: '#f9fafb', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontWeight: '700', marginBottom: 8 }}>{order.pickup ? 'Pickup' : 'Delivery'} Details</Text>
          {order.pickup ? (
            <Text style={{ color: '#16a34a', fontWeight: '600' }}>✓ Store Pickup</Text>
          ) : order.shipping_address ? (
            <>
              <Text style={{ fontWeight: '600' }}>{order.shipping_address.name}</Text>
              <Text style={{ color: '#666', marginTop: 2 }}>{order.shipping_address.phone}</Text>
              <Text style={{ color: '#666', marginTop: 4 }}>
                {order.shipping_address.line1}
                {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
              </Text>
              <Text style={{ color: '#666' }}>
                {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
              </Text>
            </>
          ) : (
            <Text style={{ color: '#666' }}>No shipping address available</Text>
          )}
        </View>

        {/* Order Items */}
        <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 16, borderWidth: 1, borderColor: '#e5e7eb' }}>
          <Text style={{ fontWeight: '700', marginBottom: 12 }}>Order Items</Text>
          {(order.items ?? []).map((it: any, idx: number) => (
            <View key={`${order.id}-${idx}`} style={{ paddingVertical: 8, borderBottomWidth: idx < order.items.length - 1 ? 1 : 0, borderBottomColor: '#f3f4f6' }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ flex: 1, fontWeight: '600' }}>{it.product?.name ?? 'Product'}</Text>
                <Text style={{ fontWeight: '600' }}>{formatPrice(it.price_each * it.qty)}</Text>
              </View>
              {it.variant_label && (
                <Text style={{ fontSize: 12, color: '#666', marginTop: 2 }}>Variant: {it.variant_label}</Text>
              )}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                <Text style={{ fontSize: 12, color: '#666' }}>Qty: {it.qty}</Text>
                <Text style={{ fontSize: 12, color: '#666' }}>{formatPrice(it.price_each)} each</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Totals Breakdown */}
        <TotalsCard
          subtotal={subtotal}
          discount={discount}
          tax={tax}
          shipping={shipping}
          total={total}
          couponCode={order.coupon_code}
          pickup={order.pickup}
        />

        {/* Action Buttons */}
        {eligibleToCancel && (
          <TouchableOpacity
            disabled={cancelling}
            onPress={() => {
              Alert.alert('Cancel Order', 'Are you sure you want to cancel this order?', [
                { text: 'No' },
                {
                  text: 'Yes, Cancel',
                  style: 'destructive',
                  onPress: async () => {
                    setCancelling(true);
                    try {
                      await cancelOrder(order.id);
                      showToast('Order cancelled');
                      const data = await getOrderById(order.id);
                      setOrder(data);
                    } catch (err: any) {
                      showToast(err?.message ?? 'Unable to cancel order');
                    } finally {
                      setCancelling(false);
                    }
                  },
                },
              ]);
            }}
            style={{ marginTop: 16, padding: 14, backgroundColor: '#dc2626', borderRadius: 8 }}
          >
            <Text style={{ color: '#fff', textAlign: 'center', fontWeight: '600', fontSize: 15 }}>
              {cancelling ? 'Cancelling...' : 'Cancel Order'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={{ marginTop: 12, marginBottom: 20, padding: 14, borderWidth: 1, borderColor: '#d1d5db', borderRadius: 8 }}
        >
          <Text style={{ textAlign: 'center', fontWeight: '600', fontSize: 15 }}>Back to Orders</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
