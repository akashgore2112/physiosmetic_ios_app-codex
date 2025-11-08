import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Linking, Alert, Platform, ActivityIndicator, TextInput } from 'react-native';
import Constants from 'expo-constants';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { geocodeLatLng } from '../../services/geocoding';
import { placesAutocomplete, placeDetails, PlaceSuggestion } from '../../services/places';
import { light as hapticLight } from '../../utils/haptics';

type Coords = { latitude: number; longitude: number; latitudeDelta?: number; longitudeDelta?: number };

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
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingAddr, setPendingAddr] = useState<any | null>(null);
  const debounceRef = React.useRef<any>(null);
  const LocRef = React.useRef<any>(null);

  const onChangeQuery = (text: string) => {
    setQuery(text);
    setPendingAddr(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!text || text.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await placesAutocomplete(text.trim());
        setSuggestions(res);
      } finally {
        setSearching(false);
      }
    }, 250);
  };

  const onPickSuggestion = async (s: PlaceSuggestion) => {
    try { hapticLight(); } catch {}
    setSearching(true);
    const det = await placeDetails(s.place_id);
    setSearching(false);
    if (!det) return;
    setSuggestions([]);
    setRegion({ latitude: det.latitude, longitude: det.longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
    setMarker({ latitude: det.latitude, longitude: det.longitude });
    setPendingAddr(det);
  };

  const onSubmitQuery = async () => {
    if (suggestions.length > 0) {
      await onPickSuggestion(suggestions[0]);
    }
  };

  const onUseCurrentLocation = async () => {
    try {
      // lazy load expo-location
      if (!LocRef.current) {
        try { LocRef.current = require('expo-location'); } catch { LocRef.current = null; }
      }
      const Location = LocRef.current;
      if (!Location) {
        Alert.alert('Location', 'expo-location not installed');
        return;
      }
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { Alert.alert('Permission denied', 'Allow location to use this feature'); return; }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;
      setRegion({ latitude, longitude, latitudeDelta: 0.02, longitudeDelta: 0.02 });
      setMarker({ latitude, longitude });
      setSearching(true);
      const addr = await geocodeLatLng(latitude, longitude, { timeoutMs: 8000 });
      setSearching(false);
      if (addr) setPendingAddr(addr);
    } catch (e) {
      setSearching(false);
    }
  };
  const onConfirm = async () => {
    if (isGeocoding) return; // debounce
    if (!marker) { Alert.alert('Select a location', 'Tap the map to drop a pin.'); return; }
    setIsGeocoding(true);
    setGeoMsg('Looking up address…');
    const timer = setTimeout(() => setGeoMsg("Couldn't fetch address. You can fill it manually."), 6500);
    try {
      // If we already have parsed details from placeDetails, use that
      const addr = pendingAddr || await geocodeLatLng(marker.latitude, marker.longitude, { timeoutMs: 8000 });
      if (addr) {
        console.debug('MapPicker selection with address');
        setSelection({
          latitude: marker.latitude,
          longitude: marker.longitude,
          formatted_address: addr.formatted_address,
          ...addr,
        });
      } else {
        console.debug('MapPicker selection without address (fallback)');
        setSelection({
          latitude: marker.latitude,
          longitude: marker.longitude,
          line2: `Dropped pin: ${marker.latitude.toFixed(5)}, ${marker.longitude.toFixed(5)}`,
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
          />
          {!!query && (
            <Pressable onPress={() => { setQuery(''); setSuggestions([]); }} style={({ pressed }) => ({ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, opacity: pressed ? 0.9 : 1 })}>
              <Text>✕</Text>
            </Pressable>
          )}
          <Pressable onPress={onUseCurrentLocation} style={({ pressed }) => ({ marginLeft: 8, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, opacity: pressed ? 0.9 : 1 })}>
            <Text>Use current</Text>
          </Pressable>
        </View>
        {searching && <Text style={{ marginTop: 6, color: '#666' }}>Searching…</Text>}
      </View>
      <MapView
        style={{ flex: 1 }}
        provider={PROVIDER_GOOGLE}
        initialRegion={region}
        onPress={(e: any) => {
          const { coordinate } = e.nativeEvent;
          setMarker({ latitude: coordinate.latitude, longitude: coordinate.longitude });
        }}
      >
        {marker && <Marker coordinate={marker} />}
      </MapView>
      {/* Suggestions overlay */}
      {suggestions.length > 0 && (
        <View style={{ position: 'absolute', top: 68, left: 12, right: 12, backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#eee', maxHeight: 240 }}>
          {suggestions.map((s, i) => (
            <Pressable key={s.place_id} onPress={() => onPickSuggestion(s)} style={({ pressed }) => ({ padding: 10, borderTopWidth: i === 0 ? 0 : 1, borderColor: '#f0f0f0', opacity: pressed ? 0.9 : 1 })}>
              <Text>{s.description}</Text>
            </Pressable>
          ))}
        </View>
      )}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: 12, backgroundColor: 'rgba(255,255,255,0.95)', borderTopLeftRadius: 12, borderTopRightRadius: 12 }}>
        <Text style={{ marginBottom: 8 }}>{marker ? `Lat: ${marker.latitude.toFixed(6)}  Lng: ${marker.longitude.toFixed(6)}` : 'Tap on map to drop a pin'}</Text>
        {/* Compact preview */}
        {pendingAddr && (
          <Text style={{ marginBottom: 8, color: '#444' }}>{pendingAddr.formatted_address || [pendingAddr.line1, pendingAddr.line2, [pendingAddr.city, pendingAddr.state].filter(Boolean).join(', '), pendingAddr.postal_code].filter(Boolean).join(', ')}</Text>
        )}
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
