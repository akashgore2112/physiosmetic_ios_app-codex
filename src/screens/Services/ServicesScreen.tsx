import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, ScrollView, Pressable, TextInput, FlatList, RefreshControl, Platform, ActionSheetIOS, Alert } from 'react-native';
import { useRoute, useFocusEffect } from '@react-navigation/native';
import { getServicesGroupedByCategory, getAllActiveServices } from '../../services/serviceCatalogService';
import type { Service } from '../../types/service';
import { useToast } from '../../components/feedback/useToast';
import ServiceCardLarge from '../../components/ServiceCardLarge';
import useNetworkStore from '../../store/useNetworkStore';
import { useSessionStore } from '../../store/useSessionStore';
import { primeNextSlotsForServices, getCachedNextSlot, getNextSlotsForServices, getNextSlotsLastUpdated } from '../../services/bookingService';
import { formatDate, formatTime } from '../../utils/formatDate';
import { light as hapticLight } from '../../utils/haptics';
import { useTheme } from '../../theme';
import { Button, Card, Icon, Badge, Input, SectionHeader, Skeleton } from '../../components/ui';

export default function ServicesScreen({ navigation }: any): JSX.Element {
  const theme = useTheme();
  type CategorySection = { category: string; data: (Service & { popularity_score?: number | null })[] };
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<Record<string, (Service & { popularity_score?: number | null })[]>>({});
  const [allServices, setAllServices] = useState<Array<Service & { popularity_score?: number | null }>>([]);
  const [search, setSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<Array<Service & { popularity_score?: number | null }>>([]);
  const [recent, setRecent] = useState<string[]>([]);
  const { show } = useToast();
  const route = useRoute<any>();
  const [highlight, setHighlight] = useState<string | null>(null);
  const [headerHeight, setHeaderHeight] = useState(0);
  const sectionY = useRef<Record<string, number>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const chipsListRef = useRef<FlatList<string>>(null);
  const isOnline = useNetworkStore((s) => s.isOnline);
  const [refreshing, setRefreshing] = useState(false);
  const isLoggedIn = useSessionStore((s) => s.isLoggedIn);
  const [nextMap, setNextMap] = useState<Record<string, { date: string; start_time: string } | null>>({});
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [sortKey, setSortKey] = useState<'name' | 'price' | 'duration'>('name');
  const [lastUpdatedMs, setLastUpdatedMs] = useState<number | null>(null);
  const [agoTick, setAgoTick] = useState(0);
  
  const [recentViewedIds, setRecentViewedIds] = useState<string[]>([]);
  const [priceFilter, setPriceFilter] = useState<null | 'p0' | 'p1' | 'p2'>(null); // p0: 0–999, p1: 1000–1999, p2: 2000+
  const [durationFilter, setDurationFilter] = useState<null | 'd30' | 'd45' | 'd60' | 'd60plus'>(null); // <=30, <=45, <=60, >60
  const [searchHeaderHeight, setSearchHeaderHeight] = useState(0);
  const [searchRowHeight, setSearchRowHeight] = useState<number>(300);
  const searchRowCountRef = useRef(0);
  const searchRowSumRef = useRef(0);
  const onMeasureSearchRow = useCallback((h: number) => {
    if (!h || h < 80 || h > 1200) return;
    searchRowSumRef.current += h;
    searchRowCountRef.current += 1;
    const avg = Math.round(searchRowSumRef.current / searchRowCountRef.current);
    if (Math.abs(avg - searchRowHeight) >= 8) setSearchRowHeight(avg);
  }, [searchRowHeight]);


  const loadData = async () => {
    const [g, all] = await Promise.all([getServicesGroupedByCategory(), getAllActiveServices()]);
    setGroups(g);
    setAllServices(all);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, all] = await Promise.all([getServicesGroupedByCategory(), getAllActiveServices()]);
        if (!cancelled) { setGroups(g); setAllServices(all); }
      } catch (e: any) {
        show(e?.message ?? 'Failed to load services');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Handle highlightCategory param on entry (scroll using SectionList)
  useEffect(() => {
    const cat = route?.params?.highlightCategory as string | undefined;
    if (cat) {
      setHighlight(cat);
      setTimeout(() => {
        // Reuse same jump logic to ensure consistent offset behavior
        handleJump(cat);
      }, 80);
    }
  }, [route?.params?.highlightCategory]);

  // Clear highlight when revisiting without param
  useFocusEffect(
    React.useCallback(() => {
      if (!route?.params?.highlightCategory) setHighlight(null);
    }, [route?.params?.highlightCategory])
  );

  const order = useMemo(
    () => [
      'Sports Performance Studio',
      'Physio Care',
      'Skin Care',
      'Hair Care',
      'Body Care',
      'Nutrition Care',
    ],
    []
  );

  const catToIndex = useMemo(() => {
    const m: Record<string, number> = {};
    order.forEach((c, i) => { m[c] = i; });
    return m;
  }, [order]);

  useEffect(() => {
    const t = setInterval(() => setAgoTick((x) => x + 1), 60000);
    return () => clearInterval(t);
  }, []);

  // Load recently viewed MRU from AsyncStorage
  const loadRecentViewed = useCallback(async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const raw = await AsyncStorage.getItem('recent_services_mru_v1');
      if (raw) {
        const arr = JSON.parse(raw) || [];
        if (Array.isArray(arr)) setRecentViewedIds(arr.map(String));
      } else setRecentViewedIds([]);
    } catch {
      setRecentViewedIds([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecentViewed();
      return () => {};
    }, [loadRecentViewed])
  );

  // Load persisted quick filters from AsyncStorage on focus
  const loadQuickFilters = useCallback(async () => {
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const [pf, df] = await Promise.all([
        AsyncStorage.getItem('services_price_filter_v1'),
        AsyncStorage.getItem('services_duration_filter_v1'),
      ]);
      setPriceFilter(pf ? (pf as any) : null);
      setDurationFilter(df ? (df as any) : null);
    } catch {}
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadQuickFilters();
      return () => {};
    }, [loadQuickFilters])
  );

  // Persist quick filters on change
  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (priceFilter) await AsyncStorage.setItem('services_price_filter_v1', priceFilter);
        else await AsyncStorage.removeItem('services_price_filter_v1');
      } catch {}
    })();
  }, [priceFilter]);

  useEffect(() => {
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        if (durationFilter) await AsyncStorage.setItem('services_duration_filter_v1', durationFilter);
        else await AsyncStorage.removeItem('services_duration_filter_v1');
      } catch {}
    })();
  }, [durationFilter]);

  // Sort + filter helpers
  const sortedFilteredServices = useMemo(() => {
    const base = onlineOnly ? allServices.filter((s) => s.is_online_allowed) : allServices.slice();
    const list = base.filter((s: any) => {
      if (priceFilter) {
        const price = typeof s.base_price === 'number' ? s.base_price : null;
        if (price == null) return false;
        if (priceFilter === 'p0' && !(price >= 0 && price <= 999)) return false;
        if (priceFilter === 'p1' && !(price >= 1000 && price < 2000)) return false;
        if (priceFilter === 'p2' && !(price >= 2000)) return false;
      }
      if (durationFilter) {
        const dur = typeof s.duration_minutes === 'number' ? s.duration_minutes : null;
        if (dur == null) return false;
        if (durationFilter === 'd30' && !(dur <= 30)) return false;
        if (durationFilter === 'd45' && !(dur <= 45)) return false;
        if (durationFilter === 'd60' && !(dur <= 60)) return false;
        if (durationFilter === 'd60plus' && !(dur > 60)) return false;
      }
      return true;
    });
    list.sort((a: any, b: any) => {
      if (sortKey === 'name') return (a.name || '').localeCompare(b.name || '');
      if (sortKey === 'price') {
        const av = typeof a.base_price === 'number' ? a.base_price : Number.POSITIVE_INFINITY;
        const bv = typeof b.base_price === 'number' ? b.base_price : Number.POSITIVE_INFINITY;
        return av - bv;
      }
      // duration
      const ad = typeof a.duration_minutes === 'number' ? a.duration_minutes : Number.POSITIVE_INFINITY;
      const bd = typeof b.duration_minutes === 'number' ? b.duration_minutes : Number.POSITIVE_INFINITY;
      return ad - bd;
    });
    return list;
  }, [allServices, onlineOnly, sortKey, priceFilter, durationFilter]);

  // Build grouped map from sorted+filtered
  const displayedGroups = useMemo(() => {
    const map: Record<string, (Service & { popularity_score?: number | null })[]> = {};
    order.forEach((c) => (map[c] = []));
    sortedFilteredServices.forEach((s) => {
      const cat = order.includes(s.category) ? s.category : null;
      if (cat) map[cat].push(s);
    });
    return map;
  }, [sortedFilteredServices, order]);

  const displayedCount = useMemo(() => {
    return Object.values(displayedGroups).reduce((acc, arr) => acc + ((arr?.length as number) || 0), 0);
  }, [displayedGroups]);

  // Sections structure (for empty/offline checks)
  const sections: CategorySection[] = useMemo(() => {
    return order.map((cat) => ({ category: cat, data: displayedGroups[cat] ?? [] }));
  }, [displayedGroups, order]);

  // no section index map needed now

  // Jump handler: ScrollView-based anchors; also highlight and center the active chip
  const handleJump = useCallback((category: string) => {
    try { hapticLight(); } catch {}
    setActiveCategory(category);
    // center the chip if possible
    try {
      const idx = order.indexOf(category);
      if (idx >= 0) chipsListRef.current?.scrollToIndex?.({ index: idx, animated: true, viewPosition: 0.5 });
    } catch {}
    const y = sectionY.current[category];
    const doScroll = (yy?: number) => {
      if (typeof yy !== 'number') return;
      // Align the chosen category to the very top of the screen
      const target = Math.max(0, yy);
      scrollRef.current?.scrollTo({ y: target, animated: true });
    };
    if (typeof y === 'number') {
      doScroll(y);
    } else {
      setTimeout(() => doScroll(sectionY.current[category]), 120);
    }
  }, [order]);

  const resetAll = useCallback(() => {
    setSearch('');
    setOnlineOnly(false);
    setSortKey('name');
    setRecent([]);
    setActiveCategory(null);
    setPriceFilter(null);
    setDurationFilter(null);
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await Promise.all([
          AsyncStorage.removeItem('services_price_filter_v1'),
          AsyncStorage.removeItem('services_duration_filter_v1'),
        ]);
      } catch {}
    })();
  }, []);

  const clearFiltersOnly = useCallback(() => {
    setOnlineOnly(false);
    setPriceFilter(null);
    setDurationFilter(null);
    (async () => {
      try {
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        await Promise.all([
          AsyncStorage.removeItem('services_price_filter_v1'),
          AsyncStorage.removeItem('services_duration_filter_v1'),
        ]);
      } catch {}
    })();
  }, []);

  // Debounced search (applies quick filters + sort)
  useEffect(() => {
    const q = search.trim().toLowerCase();
    if (!q) { setSearching(false); setResults([]); return; }
    setSearching(true);
    const id = setTimeout(() => {
      const list = sortedFilteredServices.filter((s) => {
        const name = (s.name || '').toLowerCase();
        const desc = (s.description || '').toLowerCase();
        return name.includes(q) || desc.includes(q);
      });
      setResults(list);
      // update recent searches (max 5)
      setRecent((prev) => {
        const next = [q, ...prev.filter((x) => x !== q)].slice(0, 5);
        return next;
      });
    }, 250);
    return () => clearTimeout(id);
  }, [search, sortedFilteredServices]);

  // Prime next slots cache for visible services (grouped view) with progressive warmup
  useEffect(() => {
    if (search.trim()) return;
    const allIds: string[] = [];
    Object.values(displayedGroups).forEach((arr) => arr?.forEach((s) => allIds.push((s as any).id)));
    const firstCats = order.slice(0, 2);
    const firstIds: string[] = [];
    firstCats.forEach((c) => (displayedGroups[c] || []).forEach((s) => firstIds.push((s as any).id)));
    const restIds = allIds.filter((id) => !firstIds.includes(id));
    (async () => {
      if (firstIds.length > 0) await getNextSlotsForServices(firstIds);
      const m: Record<string, { date: string; start_time: string } | null> = {};
      allIds.forEach((id) => {
        const v = getCachedNextSlot(id);
        if (v) m[id] = { date: v.date, start_time: v.start_time };
      });
      setNextMap(m);
      const lu = getNextSlotsLastUpdated();
      if (lu) setLastUpdatedMs(lu);
      if (restIds.length > 0) {
        setTimeout(async () => {
          await getNextSlotsForServices(restIds);
          const mm: Record<string, { date: string; start_time: string } | null> = {};
          allIds.forEach((id) => {
            const v = getCachedNextSlot(id);
            if (v) mm[id] = { date: v.date, start_time: v.start_time };
          });
          setNextMap(mm);
          const lu2 = getNextSlotsLastUpdated();
          if (lu2) setLastUpdatedMs(lu2);
        }, 800);
      }
    })();
  }, [displayedGroups, search, order]);

  // Prime cache for search results
  useEffect(() => {
    if (!search.trim()) return;
    const ids = results.map((s) => s.id);
    (async () => {
      await getNextSlotsForServices(ids);
      const m: Record<string, { date: string; start_time: string } | null> = {};
      ids.forEach((id) => {
        const v = getCachedNextSlot(id);
        if (v) m[id] = { date: v.date, start_time: v.start_time };
      });
      setNextMap(m);
      const lu = getNextSlotsLastUpdated();
      if (lu) setLastUpdatedMs(lu);
    })();
  }, [results, search]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.darkBg, padding: theme.spacing.base }}>
        <Skeleton variant="text" width="60%" height={32} style={{ marginBottom: theme.spacing.md }} />
        <Skeleton variant="rounded" height={48} style={{ marginBottom: theme.spacing.md }} />
        <View style={{ flexDirection: 'row', gap: theme.spacing.sm, marginBottom: theme.spacing.lg }}>
          <Skeleton variant="pill" width={100} height={36} />
          <Skeleton variant="pill" width={120} height={36} />
        </View>
        {[0, 1, 2, 3].map((i) => (
          <Card key={`skeleton-${i}`} variant="default" style={{ marginBottom: theme.spacing.md }}>
            <Skeleton variant="rounded" height={160} style={{ marginBottom: theme.spacing.md }} />
            <Skeleton variant="text" width="80%" height={20} style={{ marginBottom: theme.spacing.sm }} />
            <Skeleton variant="text" width="60%" height={16} style={{ marginBottom: theme.spacing.sm }} />
            <Skeleton variant="text" width="40%" height={16} />
          </Card>
        ))}
      </View>
    );
  }

  const cats = order;

  const searchActive = search.trim().length > 0;

  if (searchActive) {
    const highlightTokens = search.trim().split(/\s+/).filter(Boolean);
    const ROW_H = searchRowHeight; // dynamically averaged height for ServiceCardLarge
    return (
      <FlatList
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 12 }}
        data={results}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View onLayout={(e) => onMeasureSearchRow(e.nativeEvent.layout.height)}>
            <LazyNextCard s={item} navigation={navigation} next={nextMap[item.id]} highlightTokens={highlightTokens} />
          </View>
        )}
        getItemLayout={(_data, index) => ({ length: ROW_H, offset: searchHeaderHeight + index * ROW_H, index })}
        refreshing={refreshing}
        onRefresh={onRefresh}
        ListEmptyComponent={<Text>{searching ? 'Searching…' : 'No services match.'}</Text>}
        ListHeaderComponent={
          <View onLayout={(e) => setSearchHeaderHeight(e.nativeEvent.layout.height)}>
            <View style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
              <TextInput
                placeholder="Search services"
                placeholderTextColor={theme.colors.textTertiary}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
                accessibilityLabel="Search services"
                style={{
                  borderWidth: 1,
                  borderColor: theme.colors.borderSecondary,
                  borderRadius: theme.radius.md,
                  padding: theme.spacing.md,
                  paddingRight: 36,
                  backgroundColor: theme.colors.cardBg,
                  color: theme.colors.textPrimary
                }}
              />
              {!!search && (
                <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={({ pressed }) => ({ position: 'absolute', right: 4, top: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
                  <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>×</Text>
                </Pressable>
              )}
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.sm }}>
              <Button
                variant={onlineOnly ? 'primary' : 'secondary'}
                size="sm"
                onPress={() => { hapticLight(); setOnlineOnly((v) => !v); }}
                accessibilityLabel="Online only"
                accessibilityHint={onlineOnly ? 'Currently showing online services only' : 'Show online services only'}
              >
                {onlineOnly ? 'Online: ON' : 'Online: OFF'}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onPress={() => {
                  const options = ['Name A→Z', 'Price (low→high)', 'Duration (short→long)', 'Cancel'];
                  const apply = (idx: number | undefined | null) => {
                    if (idx === 0) { setSortKey('name'); hapticLight(); }
                    else if (idx === 1) { setSortKey('price'); hapticLight(); }
                    else if (idx === 2) { setSortKey('duration'); hapticLight(); }
                  };
                  if (Platform.OS === 'ios' && ActionSheetIOS) {
                    ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3 }, apply);
                  } else {
                    Alert.alert('Sort by', '', [
                      { text: 'Name A→Z', onPress: () => apply(0) },
                      { text: 'Price (low→high)', onPress: () => apply(1) },
                      { text: 'Duration (short→long)', onPress: () => apply(2) },
                      { text: 'Cancel', style: 'cancel' },
                    ]);
                  }
                }}
                accessibilityLabel="Sort services"
              >
                Sort: {sortKey === 'name' ? 'Name' : sortKey === 'price' ? 'Price' : 'Duration'}
              </Button>
            </View>
            {/* Live region announcing result count in search mode + Reset */}
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
              <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
                Showing {results.length}{searching ? '+' : ''} services
              </Text>
              <Button
                variant="ghost"
                size="sm"
                onPress={resetAll}
                accessibilityLabel="Reset filters"
              >
                Reset
              </Button>
            </View>
            {!isOnline && (
              <Card variant="elevated" padding="md" style={{ marginBottom: theme.spacing.sm }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Icon name="WifiOff" size={16} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                    <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>You're offline</Text>
                  </View>
                  <Button
                    variant="secondary"
                    size="sm"
                    onPress={loadData}
                    accessibilityLabel="Retry"
                  >
                    Retry
                  </Button>
                </View>
              </Card>
            )}
            {recent.length > 0 && (
              <View style={{ marginBottom: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.xs }}>Recent searches</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs }}>
                  {recent.map((r) => (
                    <Badge
                      key={r}
                      variant="secondary"
                      size="md"
                      shape="pill"
                      onPress={() => setSearch(r)}
                    >
                      {r}
                    </Badge>
                  ))}
                  <Badge
                    variant="ghost"
                    size="md"
                    shape="pill"
                    onPress={() => setRecent([])}
                  >
                    Clear history
                  </Badge>
                </View>
              </View>
            )}
            {/* Recently viewed chips in search mode */}
            {recentViewedIds.length > 0 && (
              <View style={{ marginBottom: theme.spacing.sm }}>
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.xs }}>Recently viewed</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs }}>
                  {recentViewedIds
                    .map((id) => ({ id, name: (allServices.find((s: any) => s.id === id)?.name) || 'View' }))
                    .map(({ id, name }) => (
                      <Badge
                        key={`rv-${id}`}
                        variant="primary"
                        size="md"
                        shape="pill"
                        onPress={() => navigation.navigate('Services', { screen: 'ServiceDetail', params: { serviceId: id } })}
                      >
                        {name}
                      </Badge>
                    ))}
                </View>
              </View>
            )}
            {/* Quick filters: Price & Duration */}
            <View style={{ marginBottom: theme.spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.xs, flexWrap: 'wrap', gap: theme.spacing.xs }}>
                <Text style={{ marginRight: theme.spacing.sm, color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>Price:</Text>
                {[
                  { k: 'p0', label: '₹0–999' },
                  { k: 'p1', label: '₹1k–1.9k' },
                  { k: 'p2', label: '₹2k+' },
                ].map((f: any) => (
                  <Badge
                    key={f.k}
                    variant={priceFilter === f.k ? 'primary' : 'secondary'}
                    size="sm"
                    shape="pill"
                    onPress={() => { hapticLight(); setPriceFilter((prev) => (prev === f.k ? null : (f.k as any))); }}
                  >
                    {f.label}
                  </Badge>
                ))}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: theme.spacing.xs }}>
                <Text style={{ marginRight: theme.spacing.sm, color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>Duration:</Text>
                {[
                  { k: 'd30', label: '≤30m' },
                  { k: 'd45', label: '≤45m' },
                  { k: 'd60', label: '≤60m' },
                  { k: 'd60plus', label: '>60m' },
                ].map((f: any) => (
                  <Badge
                    key={f.k}
                    variant={durationFilter === f.k ? 'primary' : 'secondary'}
                    size="sm"
                    shape="pill"
                    onPress={() => { hapticLight(); setDurationFilter((prev) => (prev === f.k ? null : (f.k as any))); }}
                  >
                    {f.label}
                  </Badge>
                ))}
              </View>
            </View>
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews
      />
    );
  }

  

  // If offline with no cache, show skeletons instead of empty grouped view
  if ((order.length === 0 || Object.values(displayedGroups).every((arr) => (arr?.length ?? 0) === 0)) && !isOnline && allServices.length === 0) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.colors.darkBg }} contentContainerStyle={{ padding: theme.spacing.base }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
        <View style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
          <TextInput
            placeholder="Search services"
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderSecondary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              paddingRight: 36,
              backgroundColor: theme.colors.cardBg,
              color: theme.colors.textPrimary
            }}
          />
        </View>
        {/* Offline notice */}
        <Card variant="elevated" padding="md" style={{ marginBottom: theme.spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Icon name="WifiOff" size={20} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
            <Text style={{ color: theme.colors.textPrimary, fontWeight: theme.typography.fontWeight.bold }}>You're offline</Text>
          </View>
          <Text style={{ color: theme.colors.textSecondary, marginTop: theme.spacing.xs }}>Loading cached data or check your connection</Text>
        </Card>
        {/* Skeleton loading states */}
        {[0, 1, 2, 3].map((i) => (
          <Card key={`skel-${i}`} variant="default" style={{ marginBottom: theme.spacing.md }}>
            <Skeleton variant="rounded" height={160} style={{ marginBottom: theme.spacing.md }} />
            <Skeleton variant="text" width="80%" height={20} style={{ marginBottom: theme.spacing.sm }} />
            <Skeleton variant="text" width="60%" height={16} style={{ marginBottom: theme.spacing.sm }} />
            <Skeleton variant="text" width="40%" height={16} />
          </Card>
        ))}
      </ScrollView>
    );
  }

  

  return (
    <ScrollView
      ref={scrollRef}
      style={{ flex: 1, backgroundColor: theme.colors.darkBg }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: theme.spacing.base }}
    >
      <View collapsable={false} style={{ paddingHorizontal: theme.spacing.base }} onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}>
        <View style={{ position: 'relative', marginBottom: theme.spacing.sm }}>
          <TextInput
            placeholder="Search services"
            placeholderTextColor={theme.colors.textTertiary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search services"
            style={{
              borderWidth: 1,
              borderColor: theme.colors.borderSecondary,
              borderRadius: theme.radius.md,
              padding: theme.spacing.md,
              paddingRight: 44,
              backgroundColor: theme.colors.cardBg,
              color: theme.colors.textPrimary
            }}
          />
          {!!search && (
            <Pressable accessibilityRole="button" accessibilityLabel="Clear search" onPress={() => setSearch('')} style={({ pressed }) => ({ position: 'absolute', right: 4, top: 4, paddingHorizontal: theme.spacing.md, paddingVertical: theme.spacing.md, borderRadius: theme.radius.md, minHeight: 44, minWidth: 44, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.8 : 1 })}>
              <Text style={{ fontSize: 16, color: theme.colors.textSecondary }}>×</Text>
            </Pressable>
          )}
        </View>
        {/* Quick filters */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: theme.spacing.sm, gap: theme.spacing.sm }}>
          <Button
            variant={onlineOnly ? 'primary' : 'secondary'}
            size="sm"
            onPress={() => { hapticLight(); setOnlineOnly((v) => !v); }}
            accessibilityLabel="Online only"
            accessibilityHint={onlineOnly ? 'Currently showing online services only' : 'Show online services only'}
          >
            {onlineOnly ? 'Online: ON' : 'Online: OFF'}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onPress={() => {
              const options = ['Name A→Z', 'Price (low→high)', 'Duration (short→long)', 'Cancel'];
              const apply = (idx: number | undefined | null) => {
                if (idx === 0) { setSortKey('name'); hapticLight(); }
                else if (idx === 1) { setSortKey('price'); hapticLight(); }
                else if (idx === 2) { setSortKey('duration'); hapticLight(); }
              };
              if (Platform.OS === 'ios' && ActionSheetIOS) {
                ActionSheetIOS.showActionSheetWithOptions({ options, cancelButtonIndex: 3 }, apply);
              } else {
                Alert.alert('Sort by', '', [
                  { text: 'Name A→Z', onPress: () => apply(0) },
                  { text: 'Price (low→high)', onPress: () => apply(1) },
                  { text: 'Duration (short→long)', onPress: () => apply(2) },
                  { text: 'Cancel', style: 'cancel' },
                ]);
              }
            }}
            accessibilityLabel="Sort services"
          >
            Sort: {sortKey === 'name' ? 'Name' : sortKey === 'price' ? 'Price' : 'Duration'}
          </Button>
        </View>
        {/* Recently viewed chips (if any) */}
        {recentViewedIds.length > 0 && (
          <View style={{ marginBottom: theme.spacing.sm }}>
            <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.xs }}>Recently viewed</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: theme.spacing.xs }}>
              {recentViewedIds
                .map((id) => ({ id, name: (allServices.find((s: any) => s.id === id)?.name) || 'View' }))
                .map(({ id, name }) => (
                  <Badge
                    key={`rv-${id}`}
                    variant="primary"
                    size="md"
                    shape="pill"
                    onPress={() => navigation.navigate('Services', { screen: 'ServiceDetail', params: { serviceId: id } })}
                  >
                    {name}
                  </Badge>
                ))}
            </View>
          </View>
        )}
        {/* Summary + Reset */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: theme.spacing.sm }}>
          <Text accessibilityLiveRegion="polite" style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>
            Showing {displayedCount} services
          </Text>
          <Button
            variant="ghost"
            size="sm"
            onPress={resetAll}
            accessibilityLabel="Reset filters"
          >
            Reset
          </Button>
        </View>
        {/* Category chips */}
        <ScrollView horizontal keyboardShouldPersistTaps="handled" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingBottom: theme.spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
            {order.map((cat) => (
              <Badge
                key={`chip-${cat}`}
                variant={activeCategory === cat ? 'primary' : 'secondary'}
                size="md"
                shape="pill"
                onPress={() => handleJump(cat)}
              >
                {cat}
              </Badge>
            ))}
          </View>
        </ScrollView>
        {!isOnline && (
          <Card variant="elevated" padding="md" style={{ marginBottom: theme.spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                <Icon name="WifiOff" size={16} color={theme.colors.warning} style={{ marginRight: theme.spacing.sm }} />
                <Text style={{ color: theme.colors.textSecondary, fontSize: theme.typography.fontSize.sm }}>You're offline</Text>
              </View>
              <Button
                variant="secondary"
                size="sm"
                onPress={loadData}
                accessibilityLabel="Retry"
              >
                Retry
              </Button>
            </View>
          </Card>
        )}
        {!!lastUpdatedMs && (
          <Text style={{ color: theme.colors.textTertiary, fontSize: theme.typography.fontSize.sm, marginBottom: theme.spacing.sm }}>
            Updated {Math.max(0, Math.floor((Date.now() - lastUpdatedMs) / 60000))}m ago
          </Text>
        )}
      </View>
      <View style={{ paddingHorizontal: theme.spacing.base }}>
        {order.map((cat) => {
          const data = displayedGroups[cat] ?? [];
          return (
            <View key={`sec-${cat}`} onLayout={(e) => { sectionY.current[cat] = e.nativeEvent.layout.y + 0; }}>
              <SectionHeader
                title={cat}
                style={{ marginTop: theme.spacing.sm, marginBottom: theme.spacing.sm }}
              />
              {(!data || data.length === 0) ? (
                activeCategory === cat ? (
                  <Card variant="default" padding="md" style={{ marginBottom: theme.spacing.md }}>
                    <Text style={{ color: theme.colors.textSecondary, marginBottom: theme.spacing.sm }}>No active services in {cat}.</Text>
                    <Button
                      variant="secondary"
                      size="sm"
                      onPress={clearFiltersOnly}
                      accessibilityLabel="View all services"
                      style={{ alignSelf: 'flex-start' }}
                    >
                      View all services
                    </Button>
                  </Card>
                ) : null
              ) : null}
              {data.map((item, idx) => (
                <View key={item.id} style={{ marginTop: idx === 0 ? 0 : 8 }}>
                  <LazyNextCard s={item} navigation={navigation} next={nextMap[item.id]} />
                </View>
              ))}
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

function highlightTokensInText(text: string | null | undefined, tokens: string[]): React.ReactNode {
  const src = text ?? '';
  if (!src || tokens.length === 0) return src;
  const esc = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const parts: React.ReactNode[] = [];
  const regex = new RegExp(`(${tokens.map(esc).join('|')})`, 'gi');
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let key = 0;
  while ((m = regex.exec(src)) !== null) {
    const start = m.index;
    const end = start + m[1].length;
    if (start > lastIndex) {
      parts.push(src.slice(lastIndex, start));
    }
    parts.push(<Text key={`b-${key++}`} style={{ fontWeight: '700' }}>{src.slice(start, end)}</Text>);
    lastIndex = end;
    if (regex.lastIndex === start) regex.lastIndex++; // safety against zero-width
  }
  if (lastIndex < src.length) parts.push(src.slice(lastIndex));
  return parts;
}

function LazyNextCard({ s, navigation, next, highlightTokens }: any) {
  const isLoggedIn = useSessionStore((st) => st.isLoggedIn);
  const onBook = () => {
    const category = s.category || '';
    const eligibleDual = !!s.is_online_allowed && category !== 'Sports Performance Studio' && category !== 'Physio Care';
    const go = (isOnline: boolean) => {
      if (!isLoggedIn) {
        useSessionStore.getState().setPostLoginIntent({ action: 'book_service', params: { serviceId: s.id, serviceName: s.name, isOnline } });
        navigation.navigate('Account', { screen: 'SignIn' });
      } else {
        navigation.navigate('Services', { screen: 'SelectTherapist', params: { serviceId: s.id, serviceName: s.name, isOnline } });
      }
    };
    if (!eligibleDual) {
      go(false);
      return;
    }
    if (Platform.OS === 'ios' && ActionSheetIOS) {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: ['Book In‑Clinic', 'Book Online', 'Cancel'], cancelButtonIndex: 2 },
        (idx) => {
          if (idx === 0) go(false);
          else if (idx === 1) go(true);
        }
      );
    } else {
      Alert.alert(
        'Choose booking type',
        '',
        [
          { text: 'Book In‑Clinic', onPress: () => go(false) },
          { text: 'Book Online', onPress: () => go(true) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
    }
  };
  const nameNode = highlightTokens && highlightTokens.length > 0 ? highlightTokensInText(s.name, highlightTokens) : undefined;
  const descriptionNode = highlightTokens && highlightTokens.length > 0 ? highlightTokensInText(s.description, highlightTokens) : undefined;
  const nextDate = next?.date ?? null;
  const nextTime = next?.start_time ?? null;
  return (
    <ServiceCardLarge
      key={s.id}
      id={s.id}
      name={s.name}
      description={s.description}
      nameNode={nameNode}
      descriptionNode={descriptionNode}
      base_price={s.base_price}
      duration_minutes={s.duration_minutes}
      is_online_allowed={s.is_online_allowed}
      image_url={s.image_url}
      nextSlotDate={nextDate}
      nextSlotTime={nextTime}
      onBook={onBook}
      onPress={() => {}}
    />
  );
}
