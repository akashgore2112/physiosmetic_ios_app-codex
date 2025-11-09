import Constants from 'expo-constants';

type PlaceSuggestion = {
  place_id: string;
  description: string;
  lat?: number;
  lng?: number;
  details?: PlaceDetails;
  provider?: 'google' | 'textsearch' | 'nominatim';
};

type PlaceDetails = {
  latitude: number;
  longitude: number;
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  formatted_address?: string;
  building?: string;
  unit?: string;
};

function parseComponents(components: any[]): Omit<PlaceDetails, 'latitude' | 'longitude'> {
  const byType = (t: string) => components.find((c) => (c.types || []).includes(t));
  const streetNumber = byType('street_number')?.long_name || '';
  const route = byType('route')?.long_name || '';
  const premise = byType('premise')?.long_name || '';
  const establishment = byType('establishment')?.long_name || '';
  const subpremise = byType('subpremise')?.long_name || '';
  const sublocality = byType('sublocality')?.long_name || byType('sublocality_level_1')?.long_name || '';
  const locality = byType('locality')?.long_name || byType('postal_town')?.long_name || '';
  const admin1 = byType('administrative_area_level_1')?.long_name || '';
  const country = byType('country')?.long_name || '';
  const postal = byType('postal_code')?.long_name || '';
  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim() || route || undefined;
  const line2 = [sublocality].filter(Boolean).join(', ').trim() || undefined;
  return {
    line1,
    line2,
    city: locality || undefined,
    state: admin1 || undefined,
    country: country || undefined,
    postal_code: postal || undefined,
    building: (premise || establishment) || undefined,
    unit: subpremise || undefined,
  };
}

export function getPlacesProvider(): 'google' | 'nominatim' {
  const expoConfig = (Constants as any)?.expoConfig as any;
  const PLACES_KEY = expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_PLACES_KEY || (process.env as any)?.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
  return PLACES_KEY ? 'google' : 'nominatim';
}

function getKey(): string | null {
  const expoConfig = (Constants as any)?.expoConfig as any;
  const PLACES_KEY = expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_PLACES_KEY || (process.env as any)?.EXPO_PUBLIC_GOOGLE_PLACES_KEY;
  const GEOCODE_KEY = expoConfig?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY || (process.env as any)?.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY;
  return PLACES_KEY || GEOCODE_KEY || null;
}

function getRegionBias(): string | null {
  const expoConfig = (Constants as any)?.expoConfig as any;
  const bias = expoConfig?.extra?.PLACES_REGION || null;
  return typeof bias === 'string' && bias.length <= 3 ? bias.toLowerCase() : null;
}

export async function placesAutocomplete(input: string, opts?: { sessionToken?: string; signal?: AbortSignal; location?: { lat: number; lng: number } }): Promise<PlaceSuggestion[]> {
  const key = getKey();
  const provider = getPlacesProvider();
  if (provider === 'google' && key) {
    const regionBias = getRegionBias();
    // Request mixed results (addresses + establishments). Avoid restricting to geocode only.
    const loc = opts?.location ? `&location=${opts.location.lat},${opts.location.lng}&radius=50000` : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}${regionBias ? `&components=country:${regionBias}` : ''}${loc}&key=${encodeURIComponent(key)}${opts?.sessionToken ? `&sessiontoken=${encodeURIComponent(opts.sessionToken)}` : ''}`;
    try {
      const res = await fetch(url, { signal: opts?.signal });
      const json = await res.json();
      if (!json || json.status !== 'OK' || !Array.isArray(json.predictions)) {
        if (__DEV__) console.debug(`[places] q='${input}' provider=google results=0`);
        // Try Google Text Search for POIs before Nominatim
        try {
          const ts = await googleTextSearch(input, key, regionBias);
          if (ts.length > 0) {
            if (__DEV__) console.debug(`[places] q='${input}' provider=textsearch results=${ts.length}`);
            return ts;
          }
          const fb = await nominatimSuggestions(input);
          if (__DEV__) console.debug(`[places] q='${input}' provider=nominatim results=${fb.length}`);
          return fb;
        } catch {
          return [];
        }
      }
      const results = json.predictions.map((p: any) => ({ place_id: p.place_id, description: p.description, provider: 'google' as const }));
      if (__DEV__) console.debug(`[places] q='${input}' provider=${provider} results=${results.length}`);
      return results;
    } catch (e: any) {
      if (e?.name === 'AbortError') return [];
      // Network/other error → fallback to Nominatim
      try {
        const ts = await googleTextSearch(input, key, getRegionBias(), opts?.signal, opts?.location);
        if (ts.length > 0) {
          if (__DEV__) console.debug(`[places] q='${input}' provider=textsearch results=${ts.length}`);
          return ts;
        }
        const fb = await nominatimSuggestions(input, opts?.signal);
        if (__DEV__) console.debug(`[places] q='${input}' provider=nominatim results=${fb.length}`);
        return fb;
      } catch {
        return [];
      }
    }
  }
  // Fallback to Nominatim (dev)
  try {
    const results = await nominatimSuggestions(input, opts?.signal);
    if (__DEV__) console.debug(`[places] q='${input}' provider=${provider} results=${results.length}`);
    return results;
  } catch (e: any) {
    return [];
  }
}

export async function placeDetails(placeId: string, opts?: { sessionToken?: string; signal?: AbortSignal }): Promise<PlaceDetails | null> {
  const key = getKey();
  if (getPlacesProvider() === 'google' && key) {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,address_component&key=${encodeURIComponent(key)}${opts?.sessionToken ? `&sessiontoken=${encodeURIComponent(opts.sessionToken)}` : ''}`;
    try {
      const res = await fetch(url, { signal: opts?.signal });
      const json = await res.json();
      if (!json || json.status !== 'OK' || !json.result) return null;
      const r = json.result;
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      if (typeof lat !== 'number' || typeof lng !== 'number') return null;
      const parsed = parseComponents(r.address_components || []);
      const out = {
        latitude: lat,
        longitude: lng,
        formatted_address: r.formatted_address,
        ...parsed,
      };
      if (__DEV__) console.debug('[places]', { provider: 'google', details: true });
      return out;
    } catch (e: any) {
      if (e?.name === 'AbortError') return null;
      return null;
    }
  }
  // Fallback for osm:* ids cannot fetch more details without another call; return null and rely on suggestion.details
  return null;
}

async function nominatimSuggestions(input: string, signal?: AbortSignal): Promise<PlaceSuggestion[]> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(input)}&addressdetails=1&limit=5`;
  const res = await fetch(url, { headers: { 'User-Agent': 'physiosmetic-app' } as any, signal });
  const rows = await res.json();
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any) => ({
    place_id: `osm:${r.place_id}`,
    description: r.display_name,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
    details: {
      latitude: parseFloat(r.lat),
      longitude: parseFloat(r.lon),
      formatted_address: r.display_name,
      city: r.address?.city || r.address?.town || r.address?.village,
      state: r.address?.state,
      country: r.address?.country,
      postal_code: r.address?.postcode,
      building: r.address?.building,
      unit: r.address?.house_number,
    } as PlaceDetails,
    provider: 'nominatim' as const,
  }));
}

async function googleTextSearch(input: string, key: string | null, region?: string | null, signal?: AbortSignal, location?: { lat: number; lng: number } | null): Promise<PlaceSuggestion[]> {
  if (!key) return [];
  const loc = location ? `&location=${location.lat},${location.lng}&radius=50000` : '';
  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(input)}${region ? `&region=${encodeURIComponent(region)}` : ''}${loc}&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url, { signal });
    const json = await res.json();
    if (!json || json.status !== 'OK' || !Array.isArray(json.results)) return [];
    return json.results.slice(0, 8).map((r: any) => {
      const lat = r.geometry?.location?.lat;
      const lng = r.geometry?.location?.lng;
      const name = r.name || '';
      const addr = r.formatted_address || '';
      const description = addr ? `${name} — ${addr}` : name;
      const details: PlaceDetails | undefined = (typeof lat === 'number' && typeof lng === 'number')
        ? { latitude: lat, longitude: lng, formatted_address: addr }
        : undefined;
      return { place_id: r.place_id || `text:${name}:${addr}`, description, lat, lng, details, provider: 'textsearch' as const } as PlaceSuggestion;
    });
  } catch {
    return [];
  }
}

export type { PlaceSuggestion, PlaceDetails };
