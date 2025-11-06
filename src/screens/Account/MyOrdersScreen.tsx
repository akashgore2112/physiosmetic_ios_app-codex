import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useSessionStore } from '../../store/useSessionStore';
import { getMyOrders, getReorderItems, cancelOrder, getOrderItems } from '../../services/orderService';
import { useCartStore } from '../../store/useCartStore';
import { useToast } from '../../components/feedback/useToast';
import { formatPrice } from '../../utils/formatPrice';
import { startSpan } from '../../monitoring/instrumentation';
import useNetworkStore from '../../store/useNetworkStore';

type Row = { id: string; total_amount: number; status: string; created_at?: string };
type ItemRow = { product_id: string; qty: number; price_each: number; products?: { name?: string } };

export default function MyOrdersScreen({ navigation }: any): JSX.Element {
  const { userId } = useSessionStore();
  const [loading, setLoading] = useState(false);
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
          renderItem={({ item }) => {
            const cancelEligible = item.status === 'placed' || item.status === 'pending' || item.status === 'processing';
            return (
              <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
                <Text style={{ fontWeight: '700' }}>Order #{item.id.slice(-6)}</Text>
                <Text style={{ marginTop: 6 }}>Total: {formatPrice(item.total_amount || 0)}</Text>
                <Text style={{ marginTop: 6, color: '#666' }}>Status: {item.status}</Text>
                <OrderItems orderId={item.id} />
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 10 }}>
                  <TouchableOpacity onPress={() => onReorder(item.id)} style={{ padding: 10, backgroundColor: '#1e64d4', borderRadius: 8 }}>
                    <Text style={{ color: '#fff' }}>Reorder</Text>
                  </TouchableOpacity>
                  {cancelEligible && (
                    <TouchableOpacity onPress={() => onCancel(item.id)} style={{ padding: 10, backgroundColor: '#eee', borderRadius: 8 }}>
                      <Text>Cancel</Text>
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
              <Text>No orders</Text>
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
