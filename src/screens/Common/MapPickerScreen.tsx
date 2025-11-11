import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, Platform, ActivityIndicator, TextInput, FlatList, InteractionManager } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { geocodeLatLng } from '../../services/geocoding';
import { placesAutocomplete, placeDetails, PlaceSuggestion, PlaceDetails, getPlacesProvider } from '../../services/places';
import { getCurrentCoords } from '../../services/location';
import { light as hapticLight } from '../../utils/haptics';

type Coords = { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };

import { useMapPickerStore } from '../../store/useMapPickerStore';

export default function MapPickerScreen({ navigation, route }: any): JSX.Element {
  const [ready, setReady] = useState(false);
  const [region, setRegion] = useState<Coords>({ latitude: 19.076, longitude: 72.8777, latitudeDelta: 0.05, longitudeDelta: 0.05 });
  const [marker, setMarker] = useState<{ latitude: number; longitude: number } | null>(null);
  const initial = route?.params?.initial as { latitude?: number; longitude?: number } | undefined;
  const setSelection = useMapPickerStore((s) => s.setSelection);

  useEffect(() => {
    if (initial?.latitude && initial?.longitude) {
      setRegion({ latitude: initial.latitude, longitude: initial.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      setMarker({ latitude: initial.latitude, longitude: initial.longitude });
    }
    setReady(true);
    console.debug('MapPicker mounted');
  }, []);

  const openExternalMaps = () => {
    const url = Platform.select({
      ios: `https://maps.apple.com/?ll=${region.latitude},${region.longitude}`,
      android: `https://maps.google.com/?q=${region.latitude},${region.longitude}`,
      default: `https://maps.google.com/?q=${region.latitude},${region.longitude}`,
    });
    try { Linking.openURL(url || 'https://maps.google.com'); } catch {}
  };

  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [loadingCurrent, setLoadingCurrent] = useState(false);
  const [locCode, setLocCode] = useState<string | undefined>(undefined);
  const [isSelecting, setIsSelecting] = useState(false);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingAddr, setPendingAddr] = useState<any | null>(null);
  const debounceRef = React.useRef<any>(null);
  const LocRef = React.useRef<any>(null);
  const idleRef = React.useRef<any>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const makeToken = () => `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const StorageRef = React.useRef<any>(null);
  const [recents, setRecents] = useState<Array<{ place_id?: string; description: string; details?: PlaceDetails; ts: number }>>([]);
  const sessionExpiryRef = React.useRef<any>(null);
  const [centerDirty, setCenterDirty] = useState(false);
  const searchAbortRef = React.useRef<AbortController | null>(null);
  const geocodeAbortRef = React.useRef<AbortController | null>(null);
  const cacheRef = React.useRef<Map<string, { ts: number; items: PlaceSuggestion[] }>>(new Map());
  const detailsAbortRef = React.useRef<AbortController | null>(null);
  const prefetchingIdRef = React.useRef<string | null>(null);
  const [prefetchingId, setPrefetchingId] = useState<string | null>(null);
  const geoCacheRef = React.useRef<Map<string, { ts: number; addr: any }>>(new Map());
  const mapRef = React.useRef<MapView | null>(null);
  const searchSeqRef = React.useRef(0);
  const [searchMsg, setSearchMsg] = useState<string | null>(null);
  const lastQueryRef = React.useRef<string>('');
  const selectionTimerRef = React.useRef<any>(null);
  const centerResolveTimerRef = React.useRef<any>(null);
  const [centerResolving, setCenterResolving] = useState(false);

  // Lazy load async-storage; load recents
  useEffect(() => {
    (async () => {
      try {
        if (!StorageRef.current) {
          // eslint-disable-next-line @typescript-eslint/no-var-requires
          StorageRef.current = require('@react-native-async-storage/async-storage').default;
        }
        const raw = await StorageRef.current.getItem('map_recents_v1');
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) setRecents(arr);
        }
      } catch {}
    })();
  }, []);

  const persistRecents = async (arr: typeof recents) => {
    setRecents(arr);
    try { await StorageRef.current?.setItem('map_recents_v1', JSON.stringify(arr)); } catch {}
  };

  const addRecent = async (item: { place_id?: string; description: string; details?: PlaceDetails }) => {
    const now = Date.now();
    // dedupe by place_id or description
    const filtered = recents.filter((r) => (item.place_id ? r.place_id !== item.place_id : r.description !== item.description));
    const next = [{ ...item, ts: now }, ...filtered].slice(0, 10);
    await persistRecents(next);
  };

  const clearRecents = async () => {
    await persistRecents([]);
  };

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setPendingAddr(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (idleRef.current) clearTimeout(idleRef.current);
    const trimmed = (text || '').trim();
    if (trimmed === lastQueryRef.current) {
      return; // ignore identical consecutive queries
    }
    if (!trimmed || trimmed.length < 3) {
      setSuggestions([]);
      setSessionToken(null);
      setSearchMsg(null);
      return;
    }
    lastQueryRef.current = trimmed;
    if (!sessionToken) setSessionToken(makeToken());
    // Setup token expiry after 3 minutes of inactivity
    if (sessionExpiryRef.current) clearTimeout(sessionExpiryRef.current);
    sessionExpiryRef.current = setTimeout(() => setSessionToken(null), 3 * 60 * 1000);
    const thisSeq = ++searchSeqRef.current;
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        setSearchMsg(null);
        console.debug('[places] q=\'' + trimmed + '\' start');
        // Serve cached suggestions immediately if fresh (<= 30s)
        const cached = cacheRef.current.get(trimmed);
        const now = Date.now();
        if (cached && now - cached.ts <= 30000) {
          React.startTransition?.(() => setSuggestions(cached.items));
        }
        // Abort previous search
        if (searchAbortRef.current) { try { searchAbortRef.current.abort(); } catch {} }
        searchAbortRef.current = new AbortController();
        const res = await placesAutocomplete(trimmed, { sessionToken: sessionToken ?? undefined, signal: searchAbortRef.current.signal, location: { lat: region.latitude, lng: region.longitude } });
        if (thisSeq !== searchSeqRef.current) return; // stale response
        cacheRef.current.set(trimmed, { ts: now, items: res });
        React.startTransition?.(() => setSuggestions(res));
        if (res.length === 0) {
          setSearchMsg('Search unavailable. Try again.');
        }
        // schedule idle auto-pick of top suggestion after 1s if user stops typing
        if (idleRef.current) clearTimeout(idleRef.current);
        idleRef.current = setTimeout(async () => {
          // ensure query hasn't changed since we scheduled
          if (thisSeq === searchSeqRef.current && trimmed === lastQueryRef.current && res.length > 0) {
            await onPickSuggestion(res[0]);
          }
        }, 1000);
        // Prefetch details for top suggestion to speed selection
        if (detailsAbortRef.current) { try { detailsAbortRef.current.abort(); } catch {} }
        if (res[0]?.place_id && !res[0]?.details) {
          detailsAbortRef.current = new AbortController();
          prefetchingIdRef.current = res[0].place_id;
          setPrefetchingId(res[0].place_id);
          placeDetails(res[0].place_id, { sessionToken: sessionToken ?? undefined, signal: detailsAbortRef.current.signal })
            .then((det) => {
              if (!det) return;
              const curr = cacheRef.current.get(trimmed);
              if (!curr) return;
              const enriched = curr.items.map((it) => it.place_id === res[0].place_id ? { ...it, details: det } : it);
              cacheRef.current.set(trimmed, { ts: Date.now(), items: enriched });
              if (lastQueryRef.current === trimmed && thisSeq === searchSeqRef.current) {
                React.startTransition?.(() => setSuggestions(enriched));
              }
            })
            .catch(() => {})
            .finally(() => { if (prefetchingIdRef.current === res[0].place_id) { prefetchingIdRef.current = null; setPrefetchingId(null); } });
        }
      } finally {
        setSearching(false);
      }
    }, 350);
  };

  const onPickSuggestion = React.useCallback(async (s: PlaceSuggestion) => {
    try { hapticLight(); } catch {}
    setSearching(true);
    // If suggestion already has details (OSM fallback), use them
    let det = s.details ?? null;
    if (!det) {
      det = await placeDetails(s.place_id, { sessionToken: sessionToken ?? undefined });
      // Google details failed? fallback to Nominatim by text description
      if (!det && s.description) {
        try {
          const fb = await placesAutocomplete(s.description, {});
          const first = fb.find((x) => x.details);
          det = first?.details ?? null;
        } catch {}
      }
    }
    setSearching(false);
    if (!det) return;
    setIsSelecting(true);
    setSessionToken(null);
    if (sessionExpiryRef.current) { clearTimeout(sessionExpiryRef.current); sessionExpiryRef.current = null; }
    const nextReg = { latitude: det.latitude, longitude: det.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 } as any;
    setRegion(nextReg);
    setMarker({ latitude: det.latitude, longitude: det.longitude });
    setPendingAddr(det);
    setCenterDirty(false);
    try {
      InteractionManager.runAfterInteractions(() => {
        try { mapRef.current?.animateToRegion(nextReg, 400); } catch {}
      });
    } catch {}
    await addRecent({ place_id: s.place_id, description: s.description, details: det });
    if (selectionTimerRef.current) clearTimeout(selectionTimerRef.current);
    selectionTimerRef.current = setTimeout(() => { setSuggestions([]); setIsSelecting(false); }, 420);
  }, [sessionToken]);

  const onPickRecent = React.useCallback(async (r: { place_id?: string; description: string; details?: PlaceDetails }) => {
    try { hapticLight(); } catch {}
    let det = r.details ?? null;
    if (!det && r.place_id) {
      setSearching(true);
      det = await placeDetails(r.place_id, { sessionToken: sessionToken ?? undefined });
      setSearching(false);
    }
    if (!det) return;
    setRegion({ latitude: det.latitude, longitude: det.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    setMarker({ latitude: det.latitude, longitude: det.longitude });
    setPendingAddr(det);
    await addRecent({ place_id: r.place_id, description: r.description, details: det });
  }, [sessionToken]);

  const onSubmitQuery = async () => {
    if (suggestions.length > 0) {
      await onPickSuggestion(suggestions[0]);
    }
  };

  const geoKey = (lat: number, lng: number) => {
    const cell = 0.0025; // ~275m cells
    const rl = (v: number) => Math.round(v / cell) * cell;
    return `${rl(lat).toFixed(4)}|${rl(lng).toFixed(4)}`;
  };

  const enforceGeoCacheLimit = () => {
    const max = 64;
    const m = geoCacheRef.current;
    if (m.size <= max) return;
    const firstKey = m.keys().next().value;
    if (firstKey) m.delete(firstKey);
  };

  const kickReverseGeocode = async (lat: number, lng: number) => {
    setSearching(true);
    if (geocodeAbortRef.current) { try { geocodeAbortRef.current.abort(); } catch {} }
    geocodeAbortRef.current = new AbortController();
    const key = geoKey(lat, lng);
    const cached = geoCacheRef.current.get(key);
    const now = Date.now();
    if (cached && now - cached.ts <= 5 * 60 * 1000) {
      setSearching(false);
      setPendingAddr(cached.addr);
      return;
    }
    const addr = await geocodeLatLng(lat, lng, { timeoutMs: 8000, signal: geocodeAbortRef.current.signal });
    setSearching(false);
    if (addr) {
      geoCacheRef.current.set(key, { ts: now, addr });
      enforceGeoCacheLimit();
      setPendingAddr(addr);
    }
  };

  const onUseCurrentLocation = async () => {
    // Reset any search UI so the overlay doesn't hide map changes
    if (idleRef.current) clearTimeout(idleRef.current);
    if (searchAbortRef.current) { try { searchAbortRef.current.abort(); } catch {} }
    setSuggestions([]);
    setSearchMsg(null);
    // Begin locating
    setLoadingCurrent(true);
    setLocCode(undefined);
    const r = await getCurrentCoords();
    setLoadingCurrent(false);
    if (!r.ok) {
      setLocCode(r.code);
      return;
    }
    const reg = { latitude: r.lat, longitude: r.lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    setRegion(reg);
    setMarker({ latitude: r.lat, longitude: r.lng });
    setCenterDirty(false);
    try { InteractionManager.runAfterInteractions(() => { try { mapRef.current?.animateToRegion(reg as any, 400); } catch {} }); } catch {}
    console.debug('[mapPicker] useCurrent ok', { lat: r.lat, lng: r.lng });
    await kickReverseGeocode(r.lat, r.lng);
  };
  const onConfirm = async () => {
    if (isGeocoding) return; // debounce
    if (!marker) { Alert.alert('Select a location', 'Tap the map to drop a pin.'); return; }
    setIsGeocoding(true);
    setGeoMsg('Looking up address…');
    const timer = setTimeout(() => setGeoMsg("Couldn't fetch address. You can fill it manually."), 6500);
    try {
      // If we already have parsed details from placeDetails, use that
      // Use region center as source of truth to support drag-to-adjust UX
      const lat = region.latitude;
      const lng = region.longitude;
      // If user dragged, ignore any pendingAddr and reverse geocode the new center.
      // If not dragged and we have a pendingAddr near this center, reuse it.
      let addr = pendingAddr as any | null;
      if (centerDirty || !addr) {
        addr = await geocodeLatLng(lat, lng, { timeoutMs: 8000 });
      }
      if (addr) {
        console.debug('MapPicker selection with address');
        setSelection({
          latitude: lat,
          longitude: lng,
          formatted_address: addr.formatted_address,
          ...addr,
        });
      } else {
        console.debug('MapPicker selection without address (fallback)');
        setSelection({
          latitude: lat,
          longitude: lng,
          line2: `Dropped pin: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        });
      }
      // Go to refine screen for final confirmation/edit
      navigation.navigate('RefineAddress');
    } finally {
      clearTimeout(timer);
      setIsGeocoding(false);
    }
  };

  if (!ready) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  const iosKey = (Constants?.expoConfig as any)?.ios?.config?.googleMapsApiKey;
  const androidKey = (Constants?.expoConfig as any)?.android?.config?.googleMaps?.apiKey;

  // Guard: if MapView is unexpectedly undefined (import errors), show guidance
  if (!MapView) {
    return (
      <View style={{ flex: 1, padding: 16 }}>
        <Text style={{ fontSize: 20, fontWeight: '800' }}>Choose From Map</Text>
        <Text style={{ marginTop: 10, color: '#555' }}>
          Install react-native-maps to enable the in-app picker. For now, open your Maps app and drop a pin.
        </Text>
        <Text style={{ marginTop: 6, color: iosKey || androidKey ? '#444' : '#b45309' }}>
          {iosKey || androidKey ? 'API keys detected in app.json.' : 'No Google Maps API key detected in app.json.'}
        </Text>
        <View style={{ flexDirection: 'row', marginTop: 12 }}>
          <Pressable onPress={openExternalMaps} style={({ pressed }) => ({ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', opacity: pressed ? 0.9 : 1, marginRight: 8 })}>
            <Text>Open Maps App</Text>
          </Pressable>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => ({ padding: 12, borderRadius: 8, backgroundColor: '#1e64d4', opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>Back</Text>
          </Pressable>
        </View>
        <View style={{ marginTop: 20 }}>
          <Text style={{ fontWeight: '700' }}>Enable in-app picker:</Text>
          <Text style={{ marginTop: 6, color: '#666' }}>1) npm i react-native-maps</Text>
          <Text style={{ color: '#666' }}>2) Add Google Maps SDK/API keys (iOS/Android)</Text>
          <Text style={{ color: '#666' }}>3) Rebuild app</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Search bar */}
      <View style={{ position: 'absolute', top: 12, left: 12, right: 12, zIndex: 10, backgroundColor: 'rgba(255,255,255,0.95)', padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#eee' }}>
        <Text style={{ fontWeight: '700', marginBottom: 4 }}>Search address</Text>
        {__DEV__ && (
          <Text style={{ color: '#666', marginBottom: 4, fontSize: 12 }}>
            {`PLACES: ${getPlacesProvider()==='google' ? 'ON' : 'OFF'}  •  GEOCODE: ${(require('expo-constants').default.expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY) ? 'ON' : 'OFF'}  •  Provider: ${getPlacesProvider()}`}
          </Text>
        )}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ marginRight: 8 }}>🔎</Text>
          <TextInput
            placeholder="Type to search places…"
            value={query}
            onChangeText={onChangeQuery}
            style={{ flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, paddingHorizontal: 10, paddingVertical: 8 }}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={onSubmitQuery}
            editable={!searching}
          />
          {!!query && (
          <Pressable onPress={() => { setQuery(''); setSuggestions([]); setSearchMsg(null); lastQueryRef.current=''; }} style={({ pressed }) => ({ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, opacity: pressed ? 0.9 : 1 })}>
            <Text>✕</Text>
          </Pressable>
          )}
          <Pressable disabled={loadingCurrent} onPress={onUseCurrentLocation} style={({ pressed }) => ({ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, opacity: pressed || loadingCurrent ? 0.7 : 1 })}>
            <Text>{loadingCurrent ? 'Locating…' : 'Use current'}</Text>
          </Pressable>
        </View>
        {!!locCode && (
          <Text style={{ marginTop: 6, color: '#b45309' }}>
            {locCode === 'LOC:DENIED' ? 'Location permission denied. On simulator, set Features → Location → Custom Location.' : locCode === 'LOC:TIMEOUT' ? 'Could not get GPS fix. Try again or move near a window.' : 'Location unavailable.'}
          </Text>
        )}
        {searching && <Text style={{ marginTop: 6, color: '#666' }}>Searching…</Text>}
        {!!searchMsg && !searching && query.trim().length >= 3 && (
          <Text style={{ marginTop: 6, color: '#b45309' }}>{searchMsg}</Text>
        )}
      </View>
      {/* Small inline preview under search */}
      {!!pendingAddr && (
        <View style={{ position: 'absolute', top: 84, left: 12, right: 12, zIndex: 9 }}>
          <Text style={{ color: '#444' }}>
            {pendingAddr.formatted_address || [pendingAddr.line1, pendingAddr.line2, [pendingAddr.city, pendingAddr.state].filter(Boolean).join(', '), pendingAddr.postal_code].filter(Boolean).join(', ')}
          </Text>
        </View>
      )}
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        scrollEnabled={!(suggestions.length > 0 && !isSelecting)}
        onRegionChangeComplete={(r: any) => {
          // Detect meaningful movement to mark center dirty
          const dLat = Math.abs((r?.latitude ?? 0) - region.latitude);
          const dLng = Math.abs((r?.longitude ?? 0) - region.longitude);
          const moved = dLat > 0.0005 || dLng > 0.0005; // ~50m threshold to reduce churn
          setRegion(r);
          if (moved) {
            setCenterDirty(true);
            setPendingAddr(null);
            if (centerResolveTimerRef.current) clearTimeout(centerResolveTimerRef.current);
            centerResolveTimerRef.current = setTimeout(() => {
              InteractionManager.runAfterInteractions(async () => {
                setCenterResolving(true);
                if (geocodeAbortRef.current) { try { geocodeAbortRef.current.abort(); } catch {} }
                geocodeAbortRef.current = new AbortController();
                const addr = await geocodeLatLng(r.latitude, r.longitude, { timeoutMs: 8000, signal: geocodeAbortRef.current.signal });
                setCenterResolving(false);
                if (addr) setPendingAddr(addr);
              });
            }, 800);
          }
        }}
      />
      {/* Fixed center pin */}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ fontSize: 24 }}>📍</Text>
      </View>
      {/* Drag guideline */}
      <View pointerEvents="none" style={{ position: 'absolute', top: 48, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9999, borderWidth: 1, borderColor: '#eee' }}>
        <Text style={{ color: '#444' }}>Drag map to adjust</Text>
      </View>
      {/* Suggestions overlay */}
      {suggestions.length > 0 && !isSelecting && (
        <View style={{ position: 'absolute', top: 68, left: 12, right: 12, zIndex: 20 }} onStartShouldSetResponder={() => true}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', maxHeight: 300 }}>
            <Pressable onPress={onUseCurrentLocation} onPressIn={() => { if (idleRef.current) clearTimeout(idleRef.current); }} style={({ pressed }) => ({ padding: 10, borderBottomWidth: 1, borderColor: '#f0f0f0', opacity: pressed ? 0.9 : 1, flexDirection: 'row', alignItems: 'center' })}>
              <Text style={{ marginRight: 8 }}>📍</Text>
              <Text>Use current location</Text>
            </Pressable>
            <FlatList
              data={suggestions}
              keyExtractor={(item) => item.place_id}
              renderItem={({ item, index }) => (
                <Pressable onPressIn={() => { if (idleRef.current) clearTimeout(idleRef.current); }} onPress={() => onPickSuggestion(item)} style={({ pressed }) => ({ padding: 10, borderTopWidth: 1, borderColor: '#f0f0f0', opacity: pressed ? 0.9 : 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' })}>
                  <Text numberOfLines={2} style={{ flex: 1, paddingRight: 8 }}>{item.description}</Text>
                  {prefetchingId === item.place_id && <ActivityIndicator size="small" />}
                </Pressable>
              )}
              getItemLayout={(_d, i) => ({ length: 44, offset: 44 * i, index: i })}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      )}
      {/* Recent searches (show when query empty) */}
      {(!query || query.trim().length === 0) && recents.length > 0 && (
        <View style={{ position: 'absolute', top: 68, left: 12, right: 12, zIndex: 15 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', maxHeight: 260 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 10, paddingVertical: 8 }}>
              <Text style={{ fontWeight: '700' }}>Recent searches</Text>
              <Pressable onPress={clearRecents} style={({ pressed }) => ({ paddingHorizontal: 8, paddingVertical: 6, borderWidth: 1, borderColor: '#eee', borderRadius: 6, opacity: pressed ? 0.9 : 1 })}>
                <Text>Clear</Text>
              </Pressable>
            </View>
            <FlatList
              data={recents}
              keyExtractor={(item) => item.place_id ?? String(item.ts)}
              renderItem={({ item }) => (
                <Pressable onPressIn={() => { if (idleRef.current) clearTimeout(idleRef.current); }} onPress={() => onPickRecent(item)} style={({ pressed }) => ({ padding: 10, borderTopWidth: 1, borderColor: '#f0f0f0', opacity: pressed ? 0.9 : 1 })}>
                  <Text numberOfLines={2}>🕘 {item.description}</Text>
                </Pressable>
              )}
              getItemLayout={(_d, i) => ({ length: 44, offset: 44 * i, index: i })}
              initialNumToRender={8}
              maxToRenderPerBatch={10}
              windowSize={5}
              keyboardShouldPersistTaps="handled"
            />
          </View>
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Text style={{ marginBottom: 8 }}>{marker ? `Lat: ${marker.latitude.toFixed(6)}  Lng: ${marker.longitude.toFixed(6)}` : 'Tap on map to drop a pin'}</Text>
        {/* Compact structured preview with icons */}
        {pendingAddr && (
          <View style={{ marginBottom: 8 }}>
            {!!pendingAddr.line1 && <Text>🏠 {pendingAddr.line1}</Text>}
            {!!pendingAddr.line2 && <Text>➕ {pendingAddr.line2}</Text>}
            {!!pendingAddr.city && <Text>🏙️ {pendingAddr.city}</Text>}
            {!!pendingAddr.state && <Text>🗺️ {pendingAddr.state}</Text>}
            {!!pendingAddr.postal_code && <Text>📮 {pendingAddr.postal_code}</Text>}
            {!!pendingAddr.country && <Text>🌎 {pendingAddr.country}</Text>}
            {!pendingAddr.line1 && pendingAddr.formatted_address && <Text>📍 {pendingAddr.formatted_address}</Text>}
          </View>
        )}
        {centerResolving && <Text style={{ marginBottom: 8, color: '#666' }}>Updating…</Text>}
        {geoMsg && <Text style={{ marginBottom: 8, color: '#666' }}>{geoMsg}</Text>}
        <View style={{ flexDirection: 'row' }}>
          <Pressable onPress={() => navigation.goBack()} style={({ pressed }) => ({ padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', marginRight: 8, opacity: pressed ? 0.9 : 1 })}>
            <Text>Cancel</Text>
          </Pressable>
          <Pressable disabled={isGeocoding} onPress={onConfirm} style={({ pressed }) => ({ padding: 12, borderRadius: 8, backgroundColor: isGeocoding ? '#9bbcf0' : '#1e64d4', opacity: pressed ? 0.9 : 1 })}>
            <Text style={{ color: '#fff', fontWeight: '700' }}>{isGeocoding ? 'Please wait…' : 'Use this location'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}
