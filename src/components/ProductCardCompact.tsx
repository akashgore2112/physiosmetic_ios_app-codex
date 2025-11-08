import React from 'react';
import { View, Text, Pressable } from 'react-native';
import CachedImage from './CachedImage';
import { formatPrice } from '../utils/formatPrice';
import { getProductPlaceholder } from '../utils/productImages';

type Props = {
  id: string;
  name: string;
  description?: string | null;
  price?: number | null;
  image_url?: string | null;
  category?: string | null;
  in_stock?: boolean | number | null;
  onPress: () => void;
};

export default function ProductCardCompact({ id, name, description, price, image_url, category, in_stock, onPress }: Props) {
  const displayImage = image_url || getProductPlaceholder(category || undefined, name);
  const stockNum = typeof in_stock === 'number' ? in_stock : (in_stock === false ? 0 : undefined);
  const outOfStock = stockNum === 0;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`View product ${name}`}
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', paddingVertical: 10, opacity: pressed ? 0.85 : 1 })}
    >
      <CachedImage source={{ uri: displayImage }} style={{ width: 64, height: 64, borderRadius: 8, backgroundColor: '#eee' }} contentFit="cover" fadeIn />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text numberOfLines={2} style={{ fontWeight: '600' }}>{name}</Text>
        {!!description && <Text numberOfLines={2} style={{ color: '#555', marginTop: 2 }}>{description}</Text>}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
          {typeof price === 'number' && <Text style={{ marginRight: 10 }}>{formatPrice(price)}</Text>}
          <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 9999, borderWidth: 1, borderColor: outOfStock ? '#b00020' : '#cbd5e1', backgroundColor: outOfStock ? '#fee2e2' : '#f1f5f9' }}>
            <Text style={{ fontSize: 12, color: outOfStock ? '#7f1d1d' : '#0f172a' }}>{outOfStock ? 'Out of stock' : 'In stock'}</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

