import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useCartStore } from '../../store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import { useSessionStore } from '../../store/useSessionStore';
import { placeOrder } from '../../services/orderService';
import { useToast } from '../../components/feedback/useToast';
import useNetworkStore from '../../store/useNetworkStore';
import { getProductById } from '../../services/productService';

type PriceMismatch = {
  line_id: string;
  name: string;
  old_price: number;
  new_price: number;
};

export default function CartScreen({ navigation }: any): JSX.Element {
  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.removeItem);
  const total = useCartStore((s) => s.total());
  const clear = useCartStore((s) => s.clearCart);
  const { userId, isLoggedIn } = useSessionStore();
  const { show } = useToast();
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [priceMismatches, setPriceMismatches] = useState<PriceMismatch[]>([]);
  const [reconciling, setReconciling] = useState(false);

  const canCheckout = total > 0;

  // Price reconciliation: validate cart prices against server
  const reconcilePrices = useCallback(async () => {
    if (items.length === 0) return;
    setReconciling(true);
    try {
      const mismatches: PriceMismatch[] = [];
      await Promise.all(
        items.map(async (item) => {
          try {
            const product = await getProductById(item.id);
            if (product && product.price !== item.price) {
              mismatches.push({
                line_id: item.line_id,
                name: item.name,
                old_price: item.price,
                new_price: product.price,
              });
            }
          } catch {}
        })
      );
      setPriceMismatches(mismatches);
      if (mismatches.length > 0) {
        show(`${mismatches.length} price(s) changed. Please review cart.`);
      }
    } catch (e: any) {
      // Silently fail - don't show error for reconciliation
    } finally {
      setReconciling(false);
    }
  }, [items, show]);

  // Auto-reconcile prices on reconnect
  useEffect(() => {
    if (isOnline && items.length > 0) {
      reconcilePrices();
    }
  }, [isOnline]);

  const onCheckout = async () => {
    if (!canCheckout) return;
    if (!isLoggedIn || !userId) {
      show('Please sign in to checkout');
      const { useSessionStore } = require('../../store/useSessionStore');
      useSessionStore.getState().setPostLoginIntent({ action: 'checkout' });
      navigation.navigate('Account', { screen: 'SignIn' });
      return;
    }
    navigation.navigate('Checkout');
  };

  return (
    <View style={{ flex: 1 }}>
      <FlatList
        contentContainerStyle={{ padding: 12, paddingBottom: 16 }}
        data={items}
        keyExtractor={(i) => i.line_id}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={5}
        removeClippedSubviews
        ListHeaderComponent={
          reconciling ? (
            <View style={{ backgroundColor: '#fef3c7', padding: 12, borderRadius: 8, marginBottom: 12, flexDirection: 'row', alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#d97706" style={{ marginRight: 8 }} />
              <Text style={{ color: '#92400e', fontSize: 13 }}>Checking prices...</Text>
            </View>
          ) : priceMismatches.length > 0 ? (
            <View style={{ backgroundColor: '#fee2e2', padding: 12, borderRadius: 8, marginBottom: 12 }}>
              <Text style={{ fontWeight: '700', color: '#991b1b', marginBottom: 6 }}>⚠️ Price Changes Detected</Text>
              {priceMismatches.map((m) => (
                <Text key={m.line_id} style={{ fontSize: 12, color: '#7f1d1d', marginTop: 2 }}>
                  • {m.name}: {formatPrice(m.old_price)} → {formatPrice(m.new_price)}
                </Text>
              ))}
              <Text style={{ fontSize: 12, color: '#7f1d1d', marginTop: 6, fontStyle: 'italic' }}>
                Cart prices are outdated. Server will use current prices at checkout.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700' }}>{item.name}</Text>
            {!!item.variant_label && <Text style={{ color: '#555', marginTop: 2 }}>{item.variant_label}</Text>}
            <Text style={{ color: '#666', marginTop: 4 }}>{formatPrice(item.price)} x {item.qty}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity onPress={() => dec(item.line_id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 6 }}>
                <Text>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inc(item.line_id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 6 }}>
                <Text>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.line_id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fdecea', borderRadius: 6 }}>
                <Text>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>Your cart is empty</Text>}
        ListFooterComponent={
          <View style={{ paddingTop: 8 }}>
            <View style={{ padding: 12, borderTopWidth: 1, borderTopColor: '#eee' }}>
              <Text style={{ fontSize: 16, fontWeight: '700' }}>Total: {formatPrice(total)}</Text>
              <TouchableOpacity
                disabled={!canCheckout}
                onPress={onCheckout}
                style={{ marginTop: 12, padding: 16, borderRadius: 12, alignItems: 'center', backgroundColor: canCheckout ? '#1e64d4' : '#ccc' }}
              >
                <Text style={{ color: '#fff', fontWeight: '700' }}>Checkout</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />
    </View>
  );
}
