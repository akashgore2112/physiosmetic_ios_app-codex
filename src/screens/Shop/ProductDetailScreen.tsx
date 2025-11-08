import React, { useMemo, useState, useEffect, useRef } from 'react';
import { View, Text, Image, Pressable, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { getProduct, getRelatedByCategory } from '../../services/productService';
import { getFrequentlyBoughtTogether, getVariants } from '../../services/productCatalogService';
import { formatPrice } from '../../utils/formatPrice';
import QtyStepper from '../../components/QtyStepper';
import { useCartStore } from '../../store/useCartStore';
import { useSessionStore } from '../../store/useSessionStore';
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
  const [fbt, setFbt] = useState<any[]>([]);
  const add = useCartStore((s) => s.addItem);
  const { isLoggedIn } = useSessionStore();
  const [variants, setVariants] = useState<any[]>([]);
  const [selectedVar, setSelectedVar] = useState<string | null>(null);

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

  // Frequently bought together
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await getFrequentlyBoughtTogether(id, 4);
        if (!cancelled) setFbt(list);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [id]);

  // Load variants if product supports them
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (p?.has_variants) {
          const list = await getVariants(p.id);
          if (!cancelled) setVariants(list);
        } else {
          setVariants([]);
          setSelectedVar(null);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [p?.id, p?.has_variants]);

  // Image gallery (swipe)
  const gallery: string[] = useMemo(() => {
    const arr: string[] = [];
    if (Array.isArray(p?.images)) (p.images as any[]).forEach((u: any) => u && arr.push(String(u)));
    if (p?.image_url) arr.unshift(p.image_url);
    return Array.from(new Set(arr));
  }, [p?.images, p?.image_url]);
  const [idx, setIdx] = useState(0);
  const scrollRef = useRef<ScrollView | null>(null);
  const onScrollGallery = (e: any) => {
    try {
      const x = e.nativeEvent.contentOffset.x;
      const w = e.nativeEvent.layoutMeasurement.width;
      const i = Math.round(x / w);
      if (i !== idx) setIdx(i);
    } catch {}
  };

  // Derive price/stock from selected variant when applicable (must be before early returns to keep hook order stable)
  const activeVariant = useMemo(() => variants.find((v: any) => v.id === selectedVar) || null, [variants, selectedVar]);
  const displayPrice = typeof (activeVariant?.price ?? p?.price) === 'number' ? (activeVariant?.price ?? p?.price) : 0;
  const stockNumBase = typeof p?.in_stock === 'number' ? p.in_stock : (p?.in_stock === false ? 0 : 10);
  const stockVar = typeof activeVariant?.in_stock === 'number' ? activeVariant?.in_stock : (activeVariant?.in_stock === false ? 0 : undefined);
  const stockNum = (stockVar ?? stockNumBase) as number;
  const inStock = (stockNum ?? 0) > 0;
  const maxQty = Math.max(1, Math.min(10, stockNum || 10));

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

  const onAdd = () => {
    if (!isLoggedIn) {
      useSessionStore.getState().setPostLoginIntent({ action: 'add_to_cart', params: { productId: p.id, variantId: selectedVar, qty } });
      (navigation as any).navigate('Account', { screen: 'SignIn' });
      return;
    }
    add({ id: p.id, line_id: `${p.id}${selectedVar ? `::${selectedVar}` : ''}` , variant_id: selectedVar ?? null, variant_label: activeVariant?.label ?? null, name: p.name, price: displayPrice, qty, image_url: p.image_url });
    showToast('Added to cart');
  };

  const onBuyNow = () => {
    if (!isLoggedIn) {
      useSessionStore.getState().setPostLoginIntent({ action: 'buy_now', params: { productId: p.id, variantId: selectedVar, qty } });
      (navigation as any).navigate('Account', { screen: 'SignIn' });
      return;
    }
    // Single-line checkout: clear cart then add this line, go to Checkout
    const clear = require('../../store/useCartStore').useCartStore.getState().clearCart;
    clear();
    add({ id: p.id, line_id: `${p.id}${selectedVar ? `::${selectedVar}` : ''}` , variant_id: selectedVar ?? null, variant_label: activeVariant?.label ?? null, name: p.name, price: displayPrice, qty, image_url: p.image_url });
    navigation.navigate('Checkout');
  };

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
      {/* Image gallery */}
      <View>
        <ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScrollGallery}
          scrollEventThrottle={16}
          style={{ width: '100%', height: 260, borderRadius: 12, backgroundColor: '#eee' }}
        >
          {(gallery.length > 0 ? gallery : [null]).map((u, i) => (
            <Pressable key={`img-${i}`} onPress={() => setPreview(true)} style={{ width: '100%', height: 260 }}>
              {u ? (
                <Image source={{ uri: u }} style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#eee' }} />
              ) : (
                <View style={{ width: '100%', height: '100%', borderRadius: 12, backgroundColor: '#eee', alignItems: 'center', justifyContent: 'center' }}>
                  <Text>No Image</Text>
                </View>
              )}
            </Pressable>
          ))}
        </ScrollView>
        {gallery.length > 1 && (
          <View style={{ position: 'absolute', bottom: 8, alignSelf: 'center', flexDirection: 'row' }}>
            {gallery.map((_, i) => (
              <View key={`dot-${i}`} style={{ width: 8, height: 8, borderRadius: 9999, marginHorizontal: 3, backgroundColor: i === idx ? '#333' : '#ccc' }} />
            ))}
          </View>
        )}
      </View>

      {/* Basic info */}
      <Text style={{ fontSize: 18, fontWeight: '800', marginTop: 12 }}>{p.name}</Text>
      {!!p.category && <Text style={{ color: '#666', marginTop: 4 }}>{p.category}</Text>}
      <Text style={{ color: '#111', fontSize: 16, fontWeight: '700', marginTop: 6 }}>{formatPrice(displayPrice)}</Text>
      <Text style={{ marginTop: 8, color: inStock ? '#2e7d32' : '#b00020' }}>{inStock ? 'In stock' : 'Out of stock'}</Text>

      {/* Variants */}
      {p?.has_variants && variants.length > 0 && (
        <View style={{ marginTop: 10 }}>
          <Text style={{ fontWeight: '700', marginBottom: 6 }}>Variants</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {variants.map((v: any) => {
              const selected = selectedVar === v.id;
              const out = v.in_stock === false || v.in_stock === 0;
              return (
                <Pressable key={v.id} onPress={() => setSelectedVar(v.id)} disabled={out} style={({ pressed }) => ({ paddingHorizontal: 12, paddingVertical: 10, borderWidth: 1, borderColor: selected ? '#333' : '#ddd', backgroundColor: selected ? '#f2f2f2' : 'transparent', borderRadius: 9999, marginRight: 8, marginBottom: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>{v.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      )}

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

      {/* Content blocks */}
      <Collapsible title="Description">
        <Text style={{ color: '#444' }}>{p.description || 'No additional details provided.'}</Text>
      </Collapsible>
      {(p.usage || p.contraindications || p.usage_contraindications) && (
        <Collapsible title="Usage & Contraindications">
          {!!p.usage && <Text style={{ color: '#444', marginBottom: 8 }}>{p.usage}</Text>}
          {!!p.contraindications && <Text style={{ color: '#444', marginBottom: 8 }}>Contraindications: {p.contraindications}</Text>}
          {!!p.usage_contraindications && <Text style={{ color: '#444' }}>{p.usage_contraindications}</Text>}
        </Collapsible>
      )}
      {!!p.ingredients && (
        <Collapsible title="Ingredients">
          <Text style={{ color: '#444' }}>{p.ingredients}</Text>
        </Collapsible>
      )}
      <View style={{ marginTop: 12 }}>
        <Text style={{ color: '#666' }}>Delivery: 3–5 business days (placeholder)</Text>
        <Text style={{ color: '#666', marginTop: 4 }}>Returns: 7 days return policy (placeholder)</Text>
      </View>

      {/* Frequently bought together */}
      {fbt.length > 0 && (
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', marginBottom: 8 }}>Frequently bought together</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row' }}>
              {fbt.map((rp) => (
                <View key={rp.id} style={{ width: 180, marginRight: 12 }}>
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

      {/* Related products (category) */}
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
