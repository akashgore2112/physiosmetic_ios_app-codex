import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getProduct, getRelatedByCategory } from '../../services/productService';
import { formatPrice } from '../../utils/formatPrice';
import QtyStepper from '../../components/QtyStepper';
import { useCartStore } from '../../store/useCartStore';
import { showToast } from '../../utils/toast';
import ProductCard from '../../components/ProductCard';

type Props = NativeStackScreenProps<any, 'ProductDetail'>;

export default function ProductDetailScreen({ route, navigation }: Props): JSX.Element {
  const id = route?.params?.id as string;
  const [loading, setLoading] = useState(true);
  const [p, setP] = useState<any | null>(null);
  const [qty, setQty] = useState(1);
  const [preview, setPreview] = useState(false);
  const [related, setRelated] = useState<any[]>([]);
  const add = useCartStore((s) => s.addItem);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getProduct(id);
        if (!cancelled) setP(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (p?.category) {
        try {
          const rel = await getRelatedByCategory(p.category, { excludeId: p.id, limit: 8 });
          if (!cancelled) setRelated(rel);
        } catch {}
      } else {
        setRelated([]);
      }
    })();
    return () => { cancelled = true; };
  }, [p?.id, p?.category]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!p) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Text>Product not found</Text>
      </View>
    );
  }

  const stockNum = typeof p?.in_stock === 'number' ? p.in_stock : (p?.in_stock === false ? 0 : 10);
  const inStock = (stockNum ?? 0) > 0;
  const maxQty = Math.max(1, Math.min(10, stockNum || 10));

  const onAdd = () => {
    add({ id: p.id, name: p.name, price: p.price, qty });
    showToast('Added to cart');
  };

  const onBuyNow = () => {
    onAdd();
    navigation.navigate('Cart');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Image with preview */}
      <Pressable onPress={() => setPreview(true)}>
        {p.image_url ? (
          <Image source={{ uri: p.image_url }} style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#eee' }} />
        ) : (
          <View style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
            <Text>No Image</Text>
          </View>
        )}
      </Pressable>

      {/* Basic info */}
      <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 12 }}>{p.name}</Text>
      {!!p.category && <Text style={{ color: '#666', marginTop: 4 }}>{p.category}</Text>}
      <Text style={{ color: '#111', fontSize: 16, fontWeight: '700', marginTop: 6 }}>{formatPrice(p.price)}</Text>
      <Text style={{ marginTop: 8, color: inStock ? '#2e7d32' : '#b00020' }}>{inStock ? 'In stock' : 'Out of stock'}</Text>

      {/* Purchase block */}
      <View style={{ marginTop: 14, padding: 12, borderWidth: 1, borderColor: '#eee', borderRadius: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <QtyStepper value={qty} min={1} max={maxQty} onChange={setQty} />
          <Pressable onPress={onAdd} disabled={!inStock} style={({ pressed }) => ({ paddingVertical: 12, paddingHorizontal: 16, backgroundColor: inStock ? '#1e64d4' : '#ccc', borderRadius: 10, opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Add to Cart</Text>
          </Pressable>
        </View>
        <Pressable onPress={onBuyNow} disabled={!inStock} style={({ pressed }) => ({ marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: inStock ? '#F37021' : '#ccc', opacity: pressed ? 0.9 : 1, alignItems: 'center' })}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>Buy Now</Text>
        </Pressable>
      </View>

      {/* Highlights */}
      {p.description && (
        <View style={{ marginTop: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 6 }}>Key highlights</Text>
          {p.description.split('.').filter((s: string) => s.trim()).slice(0, 4).map((s: string, idx: number) => (
            <Text key={`hl_${idx}`} style={{ color: '#444', marginBottom: 4 }}>• {s.trim()}</Text>
          ))}
        </View>
      )}

      {/* Collapsible sections (simple toggle) */}
      <Collapsible title="Product details/specs">
        <Text style={{ color: '#444' }}>{p.description || 'No additional details provided.'}</Text>
      </Collapsible>
      <Collapsible title="More info / care / usage">
        <Text style={{ color: '#444' }}>Care instructions and usage guidelines coming soon.</Text>
      </Collapsible>
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: '#666' }}>Delivery: 3–5 business days (placeholder)</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Returns: 7 days return policy (placeholder)</Text>
      </View>

      {/* Related products */}
      {related.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Related products</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {related.map((rp) => (
                <View key={rp.id} style={{ width: 200, marginRight: 12 }}>
                  <ProductCard
                    id={rp.id}
                    name={rp.name}
                    price={rp.price}
                    image_url={rp.image_url}
                    category={rp.category}
                    onPress={() => navigation.replace('ProductDetail', { id: rp.id })}
                  />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      )}

      {/* Preview Modal */}
      <Modal visible={preview} transparent animationType="fade" onRequestClose={() => setPreview(false)}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', alignItems: 'center', justifyContent: 'center' }} onPress={() => setPreview(false)}>
          {p.image_url ? (
            <Image source={{ uri: p.image_url }} style={{ width: '90%', height: '60%' }} resizeMode="contain" />
          ) : (
            <Text style={{ color: '#fff' }}>No Image</Text>
          )}
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function Collapsible({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ marginTop: 12 }}>
      <Pressable onPress={() => setOpen((o) => !o)} style={({ pressed }) => ({ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#eee', opacity: pressed ? 0.9 : 1 })}>
        <Text style={{ fontWeight: '700' }}>{title} {open ? '▲' : '▼'}</Text>
      </Pressable>
      {open && <View style={{ paddingTop: 8 }}>{children}</View>}
    </View>
  );
}
