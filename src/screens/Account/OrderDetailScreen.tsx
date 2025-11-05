import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, Alert } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { formatPrice } from '../../utils/formatPrice';
import { showToast } from '../../utils/toast';
import { cancelOrder, getOrderById } from '../../services/orderService';

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

  const subtotal = (order.items ?? []).reduce((s: number, it: any) => s + it.qty * it.price_each, 0);

  return (
    <View style={{ padding: 16 }}>
      <Text style={{ fontSize: 18, marginBottom: 8 }}>Order #{order.id}</Text>
      <Text>Status: {order.status}</Text>
      <Text style={{ marginTop: 8, fontWeight: '600' }}>Items</Text>
      {(order.items ?? []).map((it: any, idx: number) => (
        <View key={`${order.id}-${idx}`} style={{ paddingVertical: 6 }}>
          <Text>{it.product?.name} × {it.qty}</Text>
          <Text>{formatPrice(it.price_each)}</Text>
        </View>
      ))}
      <View style={{ marginTop: 12 }}>
        <Text>Subtotal: {formatPrice(subtotal)}</Text>
        <Text>Total: {formatPrice(order.total_amount ?? subtotal)}</Text>
      </View>
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
                  const res = await cancelOrder(order.id);
                  if (res.ok) {
                    showToast('Order cancelled');
                    const data = await getOrderById(order.id);
                    setOrder(data);
                  } else showToast('Unable to cancel order');
                  setCancelling(false);
                },
              },
            ]);
          }}
          style={{ marginTop: 16, padding: 12, backgroundColor: '#b00020' }}
        >
          <Text style={{ color: '#fff', textAlign: 'center' }}>{cancelling ? 'Cancelling...' : 'Cancel Order'}</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 12, padding: 12, borderWidth: 1, borderColor: '#ccc' }}>
        <Text style={{ textAlign: 'center' }}>Back</Text>
      </TouchableOpacity>
    </View>
  );
}
