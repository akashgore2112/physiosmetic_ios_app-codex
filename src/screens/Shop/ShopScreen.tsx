import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, ScrollView, Pressable, SectionList, FlatList, RefreshControl, Platform, ActionSheetIOS, Alert } from 'react-native';
import ProductCardCompact from '../../components/ProductCardCompact';
import { getProductsGroupedByCategory, searchProducts } from '../../services/productCatalogService';
import { getBestsellers } from '../../services/productCatalogService';
import useNetworkStore from '../../store/useNetworkStore';
import { useTheme } from '../../theme';
import { Button, Card, Icon, Badge, Input, SectionHeader, Skeleton } from '../../components/ui';

export default function ShopScreen({ navigation }: any): JSX.Element {
  const theme = useTheme();
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
  const isOnline = useNetworkStore((s) => s.isOnline);

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

  // Auto-refresh catalog on reconnect
  useEffect(() => {
    if (isOnline) {
      (async () => {
        try {
          if (debounced) {
            const rows = await searchProducts(debounced);
            setResults(rows);
          } else {
            const m = await getProductsGroupedByCategory();
            setGroups(m);
          }
        } catch {}
      })();
    }
  }, [isOnline]);

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
        style={{ flex: 1, backgroundColor: theme.colors.darkBg }}
        contentContainerStyle={{ padding: theme.spacing.base }}
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
          <View style={{ paddingBottom: theme.spacing.sm }}>
            <Text style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md }}>Shop Products</Text>
            <TextInput
              placeholder="Search products"
              placeholderTextColor={theme.colors.textTertiary}
              value={search}
              onChangeText={setSearch}
              autoCapitalize="none"
              autoCorrect={false}
              style={{
                marginTop: theme.spacing.md,
                padding: theme.spacing.md,
                borderWidth: 1,
                borderColor: theme.colors.borderSecondary,
                borderRadius: theme.radius.md,
                backgroundColor: theme.colors.cardBg,
                color: theme.colors.textPrimary
              }}
            />
            {/* Filters + Sort Row */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, flexWrap: 'wrap', gap: theme.spacing.xs }}>
              <Button
                variant={inStockOnly ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => setInStockOnly((v) => !v)}
                accessibilityLabel="In stock only"
              >
                {inStockOnly ? 'In stock: ON' : 'In stock: OFF'}
              </Button>
              {[
                { k: 'p0', label: '₹0–999' },
                { k: 'p1', label: '₹1k–1.9k' },
                { k: 'p2', label: '₹2k+' },
              ].map((f: any) => (
                <Badge
                  key={f.k}
                  variant={priceStep === f.k ? 'primary' : 'secondary'}
                  size="sm"
                  shape="pill"
                  onPress={() => setPriceStep((prev) => (prev === f.k ? null : (f.k as any)))}
                >
                  {f.label}
                </Badge>
              ))}
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
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
                }}
                accessibilityLabel="Sort products"
              >
                Sort: {sortOption === 'bestsellers' ? 'Bestsellers' : sortOption === 'price' ? 'Price' : 'Newest'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onPress={resetAll}
                accessibilityLabel="Reset filters"
              >
                Reset
              </Button>
            </View>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginTop: theme.spacing.xs }}>
              {searching ? 'Searching…' : `Showing ${filteredSorted.length} products`}
            </Text>
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
      style={{ flex: 1, backgroundColor: theme.colors.darkBg }}
      contentContainerStyle={{ padding: theme.spacing.base }}
      sections={sections}
      keyExtractor={(item) => item.id}
      renderSectionHeader={({ section }) => (
        <SectionHeader
          title={section.title}
          style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }}
        />
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
        <View style={{ paddingBottom: theme.spacing.sm }}>
          <Text style={{ fontSize: theme.typography.fontSize['2xl'], fontWeight: theme.typography.fontWeight.bold, color: theme.colors.textPrimary, marginBottom: theme.spacing.md }}>Shop Products</Text>
          <TextInput
            placeholder="Search products"
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              marginTop: theme.spacing.md,
              padding: theme.spacing.md,
              borderWidth: 1,
              borderColor: theme.colors.borderSecondary,
              borderRadius: theme.radius.md,
              backgroundColor: theme.colors.cardBg,
              color: theme.colors.textPrimary
            }}
          />
          {/* Filters + Sort Row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: theme.spacing.sm, flexWrap: 'wrap', gap: theme.spacing.xs }}>
            <Button
              variant={inStockOnly ? 'primary' : 'secondary'}
              size="sm"
              onPress={() => setInStockOnly((v) => !v)}
              accessibilityLabel="In stock only"
            >
              {inStockOnly ? 'In stock: ON' : 'In stock: OFF'}
            </Button>
            {[
              { k: 'p0', label: '₹0–999' },
              { k: 'p1', label: '₹1k–1.9k' },
              { k: 'p2', label: '₹2k+' },
            ].map((f: any) => (
              <Badge
                key={f.k}
                variant={priceStep === f.k ? 'primary' : 'secondary'}
                size="sm"
                shape="pill"
                onPress={() => setPriceStep((prev) => (prev === f.k ? null : (f.k as any)))}
              >
                {f.label}
              </Badge>
            ))}
            <Button
              variant="secondary"
              size="sm"
              onPress={() => {
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
              }}
              accessibilityLabel="Sort products"
            >
              Sort: {sortOption === 'bestsellers' ? 'Bestsellers' : sortOption === 'price' ? 'Price' : 'Newest'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onPress={resetAll}
              accessibilityLabel="Reset filters"
            >
              Reset
            </Button>
          </View>
        </View>
      }
      refreshing={refreshing}
      onRefresh={onRefresh}
      ListEmptyComponent={<Text>No products</Text>}
    />
  );
}
