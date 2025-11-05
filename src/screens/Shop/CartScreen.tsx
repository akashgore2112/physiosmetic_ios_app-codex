import React from 'react';
import { View, Text, FlatList, TouchableOpacity } from 'react-native';
import { useCartStore } from '../../store/useCartStore';
import { formatPrice } from '../../utils/formatPrice';
import { useSessionStore } from '../../store/useSessionStore';
import { placeOrder } from '../../services/orderService';
import { useToast } from '../../components/feedback/useToast';

export default function CartScreen({ navigation }: any): JSX.Element {
  const items = useCartStore((s) => s.items);
  const inc = useCartStore((s) => s.inc);
  const dec = useCartStore((s) => s.dec);
  const remove = useCartStore((s) => s.removeItem);
  const total = useCartStore((s) => s.total());
  const clear = useCartStore((s) => s.clearCart);
  const { userId, isLoggedIn } = useSessionStore();
  const { show } = useToast();

  const canCheckout = total > 0;

  const onCheckout = async () => {
    if (!canCheckout) return;
    if (!isLoggedIn || !userId) { show('Please sign in to checkout'); return; }
    try {
      await placeOrder(userId, items);
      clear();
      navigation.navigate('OrderSuccess');
    } catch (e: any) {
      show(e?.message ?? 'Checkout failed');
    }
  };

  return (
    <View style={{ flex: 1, padding: 12 }}>
      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={{ backgroundColor: '#fff', borderRadius: 10, padding: 12, marginBottom: 8 }}>
            <Text style={{ fontWeight: '700' }}>{item.name}</Text>
            <Text style={{ color: '#666', marginTop: 4 }}>{formatPrice(item.price)} x {item.qty}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
              <TouchableOpacity onPress={() => dec(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 6 }}>
                <Text>-</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => inc(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#eee', borderRadius: 6 }}>
                <Text>+</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => remove(item.id)} style={{ paddingHorizontal: 12, paddingVertical: 8, backgroundColor: '#fdecea', borderRadius: 6 }}>
                <Text>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={<Text>Your cart is empty</Text>}
      />

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
  );
}
