import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable } from 'react-native';
import ProductCard from '../../components/ProductCard';
import { getActiveProducts, getProductCategories } from '../../services/productService';

export default function ShopScreen({ navigation }: any): JSX.Element {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string | null>(null);
  const [categories, setCategories] = useState<string[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cats = await getProductCategories();
        if (!cancelled) setCategories(cats);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await getActiveProducts({ category, search: search.trim() || null });
        if (!cancelled) setProducts(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [category, search]);

  const filtered = useMemo(() => products, [products]);

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '800' }}>Shop Products</Text>
      <TextInput
        placeholder="Search products"
        value={search}
        onChangeText={setSearch}
        style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10 }}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
        <View style={{ flexDirection: 'row' }}>
          {[null, ...categories].map((cat) => (
            <Pressable key={cat ?? 'all'} onPress={() => setCategory(cat)} style={({ pressed }) => ({ paddingVertical: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: category === cat ? '#1e64d4' : '#ddd', backgroundColor: category === cat ? '#e6f2ff' : '#fff', borderRadius: 16, marginRight: 8, opacity: pressed ? 0.85 : 1 })}>
              <Text>{cat ?? 'All'}</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 10 }}>
        {filtered.map((p) => (
          <View key={p.id} style={{ width: '48%', margin: '1%' }}>
            <ProductCard
              id={p.id}
              name={p.name}
              price={p.price}
              image_url={p.image_url}
              category={p.category}
              in_stock={p.in_stock as any}
              onPress={() => navigation.navigate('ProductDetail', { id: p.id })}
            />
          </View>
        ))}
        {!loading && filtered.length === 0 && <Text>No products</Text>}
      </View>
    </ScrollView>
  );
}
