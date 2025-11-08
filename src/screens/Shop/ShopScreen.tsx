import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, SectionList, FlatList, RefreshControl, Platform, ActionSheetIOS, Alert } from 'react-native';
import ProductCardCompact from '../../components/ProductCardCompact';
import { getProductsGroupedByCategory, searchProducts } from '../../services/productCatalogService';
import { getBestsellers } from '../../services/productCatalogService';

export default function ShopScreen({ navigation }: any): JSX.Element {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [groups, setGroups] = useState<Record<string, any[]>>({});
  const [refreshing, setRefreshing] = useState(false);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [priceStep, setPriceStep] = useState<null | 'p0' | 'p1' | 'p2'>(null);
  const [sortOption, setSortOption] = useState<'bestsellers' | 'price' | 'newest'>('bestsellers');
  const [rankMap, setRankMap] = useState<Record<string, number>>({});

  // Debounce search input
  useEffect(() => {
    const id = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(id);
  }, [search]);

  // Load grouped products when no query
  const loadGroups = useCallback(async () => {
    const m = await getProductsGroupedByCategory();
    setGroups(m);
  }, []);

  useEffect(() => {
    if (debounced) return; // search mode will run below
    let cancelled = false;
    (async () => {
      try {
        const m = await getProductsGroupedByCategory();
        if (!cancelled) setGroups(m);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  // Run product search when query present
  useEffect(() => {
    let cancelled = false;
    if (!debounced) { setResults([]); setSearching(false); return; }
    setSearching(true);
    (async () => {
      try {
        const rows = await searchProducts(debounced);
        if (!cancelled) setResults(rows);
      } finally {
        if (!cancelled) setSearching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [debounced]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      if (debounced) {
        const rows = await searchProducts(debounced);
        setResults(rows);
      } else {
        await loadGroups();
      }
    } finally {
      setRefreshing(false);
    }
  }, [debounced, loadGroups]);

  // Persisted filters/sort
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        const [a, b, c] = await Promise.all([
          AsyncStorage.getItem('shop_in_stock_only_v1'),
          AsyncStorage.getItem('shop_price_step_v1'),
          AsyncStorage.getItem('shop_sort_option_v1'),
        ]);
        setInStockOnly(a === '1');
        setPriceStep((b as any) || null);
        setSortOption((c as any) || 'bestsellers');
      } catch {}
    })();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('shop_in_stock_only_v1', inStockOnly ? '1' : '0');
      } catch {}
    })();
  }, [inStockOnly]);
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (priceStep) await AsyncStorage.setItem('shop_price_step_v1', priceStep);
        else await AsyncStorage.removeItem('shop_price_step_v1');
      } catch {}
    })();
  }, [priceStep]);
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await AsyncStorage.setItem('shop_sort_option_v1', sortOption);
      } catch {}
    })();
  }, [sortOption]);

  // Load bestseller ranks to support sorting
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const top = await getBestsellers(200);
        if (cancelled) return;
        const map: Record<string, number> = {};
        top.forEach((p, idx) => { map[p.id] = idx + 1; });
        setRankMap(map);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  const applyFilters = useCallback((arr: any[]) => {
    return arr.filter((p) => {
      if (inStockOnly && p.in_stock === false) return false;
      if (priceStep) {
        const price = typeof p.price === 'number' ? p.price : null;
        if (price == null) return false;
        if (priceStep === 'p0' && !(price >= 0 && price <= 999)) return false;
        if (priceStep === 'p1' && !(price >= 1000 && price < 2000)) return false;
        if (priceStep === 'p2' && !(price >= 2000)) return false;
      }
      return true;
    });
  }, [inStockOnly, priceStep]);

  const applySort = useCallback((arr: any[]) => {
    const list = arr.slice();
    if (sortOption === 'price') {
      list.sort((a: any, b: any) => (a.price ?? Infinity) - (b.price ?? Infinity));
      return list;
    }
    if (sortOption === 'newest') {
      list.sort((a: any, b: any) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
      return list;
    }
    // bestsellers: use ranking map; unknowns go to the end preserving relative order
    list.sort((a: any, b: any) => {
      const ra = rankMap[a.id] ?? Number.POSITIVE_INFINITY;
      const rb = rankMap[b.id] ?? Number.POSITIVE_INFINITY;
      if (ra === rb) return 0;
      return ra - rb;
    });
    return list;
  }, [sortOption, rankMap]);

  const resetAll = useCallback(() => {
    setSearch('');
    setInStockOnly(false);
    setPriceStep(null);
    setSortOption('bestsellers');
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await Promise.all([
          AsyncStorage.removeItem('shop_in_stock_only_v1'),
          AsyncStorage.removeItem('shop_price_step_v1'),
          AsyncStorage.removeItem('shop_sort_option_v1'),
        ]);
      } catch {}
    })();
  }, []);

  const searchActive = debounced.length > 0;

  if (searchActive) {
    const filteredSorted = useMemo(() => applySort(applyFilters(results)), [results, applyFilters, applySort]);
    return (
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        data={filteredSorted}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProductCardCompact
            id={item.id}
            name={item.name}
            description={item.description}
            price={item.price}
            image_url={item.image_url}
            category={item.category}
            in_stock={item.in_stock}
            onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
          />
        )}
        ListHeaderComponent={
          <View style={{ paddingBottom: 8 }}>
            <Text style={{ fontSize: 20, fontWeight: '800' }}>Shop Products</Text>
            <TextInput
              placeholder="Search products"
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10 }}
            />
            {/* Filters + Sort Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
              <Pressable accessibilityRole="switch" onPress={() => setInStockOnly((v) => !v)} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 9999, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                <Text>{inStockOnly ? 'In stock: ON' : 'In stock: OFF'}</Text>
              </Pressable>
              {[
                { k: 'p0', label: '₹0–999' },
                { k: 'p1', label: '₹1k–1.9k' },
                { k: 'p2', label: '₹2k+' },
              ].map((f: any) => (
                <Pressable key={f.k} onPress={() => setPriceStep((prev) => (prev === f.k ? null : (f.k as any)))} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: priceStep === f.k ? '#333' : '#ddd', backgroundColor: priceStep === f.k ? '#f2f2f2' : 'transparent', borderRadius: 9999, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                  <Text>{f.label}</Text>
                </Pressable>
              ))}
              <Pressable accessibilityRole="button" onPress={() => {
                const options = ['Bestsellers', 'Price (low→high)', 'Newest', 'Cancel'];
                const apply = (idx?: number | null) => {
                  if (idx === 0) setSortOption('bestsellers');
                  else if (idx === 1) setSortOption('price');
                  else if (idx === 2) setSortOption('newest');
                };
                if (Platform.OS === 'ios' && ActionSheetIOS) ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3 }, apply);
                else Alert.alert('Sort by', '', [
                  { text: 'Bestsellers', onPress: () => apply(0) },
                  { text: 'Price (low→high)', onPress: () => apply(1) },
                  { text: 'Newest', onPress: () => apply(2) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 9999, opacity: pressed ? 0.9 : 1 })}>
                <Text>Sort: {sortOption === 'bestsellers' ? 'Bestsellers' : sortOption === 'price' ? 'Price' : 'Newest'}</Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={resetAll} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginLeft: 8, opacity: pressed ? 0.9 : 1 })}>
                <Text>Reset</Text>
              </Pressable>
            </View>
            <Text style={{ color: '#666', marginTop: 6 }}>{searching ? 'Searching…' : `Showing ${results.length} products`}</Text>
          </View>
        }
        ListEmptyComponent={<Text>{searching ? 'Searching…' : 'No products found. Try a different keyword.'}</Text>}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />
    );
  }

  // Build sections from groups; auto-collapse empty categories
  const sections = useMemo(() => {
    const out: { title: string; data: any[] }[] = [];
    Object.keys(groups).sort((a, b) => a.localeCompare(b)).forEach((k) => {
      let arr = groups[k] || [];
      arr = applyFilters(arr);
      if (!arr || arr.length === 0) return; // auto-collapse
      arr = applySort(arr);
      out.push({ title: k, data: arr });
    });
    return out;
  }, [groups, applyFilters, applySort]);

  return (
    <SectionList
      style={{ flex: 1 }}
      contentContainerStyle={{ padding: 12 }}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <View style={{ paddingTop: 10, paddingBottom: 6 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>{section.title}</Text>
          <View style={{ height: 1, backgroundColor: '#eee', marginTop: 6 }} />
        </View>
      )}
      renderItem={({ item }) => (
        <ProductCardCompact
          id={item.id}
          name={item.name}
          description={item.description}
          price={item.price}
          image_url={item.image_url}
          category={item.category}
          in_stock={item.in_stock}
          onPress={() => navigation.navigate('ProductDetail', { id: item.id })}
        />
      )}
      ListHeaderComponent={
        <View style={{ paddingBottom: 8 }}>
          <Text style={{ fontSize: 20, fontWeight: '800' }}>Shop Products</Text>
          <TextInput
            placeholder="Search products"
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{ marginTop: 10, padding: 10, borderWidth: 1, borderColor: '#eee', borderRadius: 10 }}
          />
          {/* Filters + Sort Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            <Pressable accessibilityRole="switch" onPress={() => setInStockOnly((v) => !v)} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 9999, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
              <Text>{inStockOnly ? 'In stock: ON' : 'In stock: OFF'}</Text>
            </Pressable>
            {[
              { k: 'p0', label: '₹0–999' },
              { k: 'p1', label: '₹1k–1.9k' },
              { k: 'p2', label: '₹2k+' },
            ].map((f: any) => (
              <Pressable key={f.k} onPress={() => setPriceStep((prev) => (prev === f.k ? null : (f.k as any)))} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: priceStep === f.k ? '#333' : '#ddd', backgroundColor: priceStep === f.k ? '#f2f2f2' : 'transparent', borderRadius: 9999, marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
                <Text>{f.label}</Text>
              </Pressable>
            ))}
            <Pressable accessibilityRole="button" onPress={() => {
              const options = ['Bestsellers', 'Price (low→high)', 'Newest', 'Cancel'];
              const apply = (idx?: number | null) => {
                if (idx === 0) setSortOption('bestsellers');
                else if (idx === 1) setSortOption('price');
                else if (idx === 2) setSortOption('newest');
              };
              if (Platform.OS === 'ios' && ActionSheetIOS) ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3 }, apply);
              else Alert.alert('Sort by', '', [
                { text: 'Bestsellers', onPress: () => apply(0) },
                { text: 'Price (low→high)', onPress: () => apply(1) },
                { text: 'Newest', onPress: () => apply(2) },
                { text: 'Cancel', style: 'cancel' },
              ]);
            }} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 9999, opacity: pressed ? 0.9 : 1 })}>
              <Text>Sort: {sortOption === 'bestsellers' ? 'Bestsellers' : sortOption === 'price' ? 'Price' : 'Newest'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" onPress={resetAll} style={({ pressed }) => ({ paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, marginLeft: 8, opacity: pressed ? 0.9 : 1 })}>
              <Text>Reset</Text>
            </Pressable>
          </View>
        </View>
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={<Text>No products</Text>}
    />
  );
}
