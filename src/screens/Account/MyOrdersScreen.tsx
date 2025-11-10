import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { useSessionStore } from '../../store/useSessionStore';
import { getMyOrders, getReorderItems, cancelOrder, getOrderItems } from '../../services/orderService';
import { useCartStore } from '../../store/useCartStore';
import { useToast } from '../../components/feedback/useToast';
import { formatPrice } from '../../utils/formatPrice';
import { startSpan } from '../../monitoring/instrumentation';
import useNetworkStore from '../../store/useNetworkStore';
import { supabase } from '../../config/supabaseClient';

type Row = {
  id: string;
  total_amount: number;
  status: string;
  created_at?: string;
  payment_method?: string;
  discount_amount?: number;
  coupon_code?: string;
};
type ItemRow = { product_id: string; qty: number; price_each: number; products?: { name?: string } };

export default function MyOrdersScreen({ navigation }: any): JSX.Element {
  const { userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const addItem = useCartStore((s) => s.addItem);
  const { show } = useToast();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [hadError, setHadError] = useState(false);

  async function fetchRows() {
    if (!userId) return setRows([]);
    setLoading(true);
    try {
      const data = await getMyOrders(userId);
      setRows(data as any);
      setHadError(false);
    } catch (e: any) {
      show(e?.message ?? 'Failed to load orders');
      setHadError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchRows();
  }, [userId]);

  // Auto-retry on reconnect
  useEffect(() => {
    if (isOnline && hadError) fetchRows();
  }, [isOnline]);

  // Realtime subscription for order updates
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('orders-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${userId}` }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setRows((prev) => [payload.new as Row, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setRows((prev) => prev.map((r) => (r.id === payload.new.id ? (payload.new as Row) : r)));
        } else if (payload.eventType === 'DELETE') {
          setRows((prev) => prev.filter((r) => r.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchRows();
    setRefreshing(false);
  };

  const onReorder = async (orderId: string) => {
    const span = startSpan('orders.reorder');
    try {
      const items = await getReorderItems(orderId);
      items.forEach((it) => addItem(it));
      show('Items added to cart');
      navigation.navigate('Shop', { screen: 'Cart' });
    } catch (e: any) {
      show(e?.message ?? 'Reorder failed');
    }
    span.end();
  };

  const onCancel = async (orderId: string) => {
    const span = startSpan('orders.cancel');
    try {
      await cancelOrder(orderId);
      show('Order cancelled');
      fetchRows();
    } catch (e: any) {
      show(e?.message ?? 'Cancel failed');
    }
    span.end();
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      {loading ? (
        <ActivityIndicator />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.id}
          initialNumToRender={8}
          maxToRenderPerBatch={8}
          windowSize={5}
          removeClippedSubviews
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          renderItem={({ item }) => {
            const cancelEligible = item.status === 'placed' || item.status === 'pending' || item.status === 'processing';
            const statusColor = item.status === 'delivered' ? '#16a34a' : item.status === 'cancelled' ? '#dc2626' : item.status === 'shipped' ? '#2563eb' : '#d97706';
            const paymentMethodLabel = item.payment_method === 'razorpay' ? 'Razorpay' : item.payment_method === 'stripe' ? 'Stripe' : item.payment_method === 'cod' ? 'COD' : '';
            const createdDate = item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

            return (
              <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 2 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontWeight: '700', fontSize: 15 }}>Order #{item.id.slice(-6)}</Text>
                  <View style={{ backgroundColor: statusColor, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                    <Text style={{ color: '#fff', fontSize: 11, fontWeight: '600', textTransform: 'uppercase' }}>{item.status}</Text>
                  </View>
                </View>
                {createdDate && <Text style={{ marginTop: 4, fontSize: 12, color: '#888' }}>{createdDate}</Text>}
                <View style={{ marginTop: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={{ fontSize: 16, fontWeight: '600' }}>{formatPrice(item.total_amount || 0)}</Text>
                  {paymentMethodLabel && (
                    <View style={{ backgroundColor: '#f0f9ff', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 5 }}>
                      <Text style={{ color: '#0369a1', fontSize: 11, fontWeight: '600' }}>{paymentMethodLabel}</Text>
                    </View>
                  )}
                </View>
                {item.discount_amount && item.discount_amount > 0 && (
                  <Text style={{ marginTop: 4, fontSize: 12, color: '#16a34a' }}>
                    💰 Saved {formatPrice(item.discount_amount)}{item.coupon_code ? ` with ${item.coupon_code}` : ''}
                  </Text>
                )}
                <OrderItems orderId={item.id} />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity onPress={() => onReorder(item.id)} style={{ padding: 10, backgroundColor: '#1e64d4', borderRadius: 8, flex: 1, alignItems: 'center' }}>
                    <Text style={{ color: '#fff', fontWeight: '600' }}>Reorder</Text>
                  </TouchableOpacity>
                  {cancelEligible && (
                    <TouchableOpacity onPress={() => onCancel(item.id)} style={{ padding: 10, backgroundColor: '#fee2e2', borderRadius: 8, flex: 1, alignItems: 'center' }}>
                      <Text style={{ color: '#dc2626', fontWeight: '600' }}>Cancel</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            hadError ? (
              <TouchableOpacity onPress={fetchRows} style={{ padding: 16, alignItems: 'center' }}>
                <Text style={{ color: '#1e64d4' }}>Tap to retry</Text>
              </TouchableOpacity>
            ) : (
              <Text style={{ textAlign: 'center', marginTop: 20, color: '#888' }}>No orders yet</Text>
            )
          }
        />
      )}
    </View>
  );
}

function OrderItems({ orderId }: { orderId: string }) {
  const [items, setItems] = React.useState<ItemRow[]>([]);
  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrderItems(orderId);
        if (!cancelled) setItems((data as any) || []);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [orderId]);
  if (!items.length) return null;
  return (
    <View style={{ marginTop: 8 }}>
      {items.map((it) => (
        <Text key={`${orderId}:${it.product_id}`} style={{ color: '#666' }}>• {it.products?.name || it.product_id} × {it.qty}</Text>
      ))}
    </View>
  );
}
