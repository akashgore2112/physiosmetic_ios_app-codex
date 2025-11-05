import React from 'react';
import { View, Text, Image, Pressable } from 'react-native';
import { formatPrice } from '../utils/formatPrice';
import { showToast } from '../utils/toast';
import { useCartStore } from '../store/useCartStore';
import { getProductPlaceholder } from '../utils/productImages';
import { startSpan } from '../monitoring/instrumentation';

type Props = {
  id: string;
  name: string;
  price: number;
  image_url?: string | null;
  category?: string | null;
  in_stock?: boolean | number | null;
  clinic_only?: boolean | null;
  onPress?: () => void;
  onAdd?: () => void;
};

export default function ProductCard({ id, name, price, image_url, category, in_stock, clinic_only, onPress, onAdd }: Props) {
  const add = useCartStore((s) => s.addItem);
  const displayImage = image_url || getProductPlaceholder(category || undefined, name);
  const stockNum = typeof in_stock === 'number' ? in_stock : (in_stock === false ? 0 : undefined);
  const lowStock = typeof stockNum === 'number' && stockNum > 0 && stockNum <= 5;
  const outOfStock = stockNum === 0;
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flex: 1, margin: 6, borderWidth: 1, borderColor: '#e5e5e5', borderRadius: 8, overflow: 'hidden', opacity: pressed ? 0.85 : 1 })}
    >
      <Image source={{ uri: displayImage }} style={{ width: '100%', height: 120 }} resizeMode="cover" />
      <View style={{ padding: 8 }}>
        <Text numberOfLines={2} style={{ minHeight: 36 }}>{name}</Text>
        <Text style={{ marginTop: 4 }}>{formatPrice(price)}</Text>
        {lowStock && <Text style={{ color: '#d9822b', fontSize: 12, marginTop: 2 }}>Low stock</Text>}
        {outOfStock && <Text style={{ color: '#b00020', fontSize: 12, marginTop: 2 }}>Out of stock</Text>}
        <Text style={{ fontSize: 12, color: '#999', marginTop: 2 }}>★ 4.5</Text>
        <Pressable
          onPress={() => {
            const span = startSpan('cart.add');
            if (clinic_only) {
              showToast('Request sent to clinic');
              span.end();
              return;
            }
            if (onAdd) { onAdd(); span.end(); }
            else {
              if (outOfStock) { showToast('Out of stock'); return; }
              add({ id, name, price, qty: 1 });
              showToast('Added to cart');
              span.end();
            }
          }}
          hitSlop={8}
          style={({ pressed }) => ({ marginTop: 8, padding: 8, backgroundColor: '#222', borderRadius: 4, opacity: pressed ? 0.85 : 1 })}
        >
          <Text style={{ color: '#fff', textAlign: 'center' }}>{clinic_only ? 'Request to buy' : 'Add to cart'}</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}
