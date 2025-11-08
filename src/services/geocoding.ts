import Constants from 'expo-constants';

type GeocodeResult = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  formatted_address?: string;
};

function parseComponents(components: any[]): GeocodeResult {
  const byType = (t: string) => components.find((c) => (c.types || []).includes(t));
  const streetNumber = byType('street_number')?.long_name || '';
  const route = byType('route')?.long_name || '';
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
  };
}

function readGeocodeKey(): string | null {
  const envKey = (process.env as any)?.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY as string | undefined;
  const extraKey = (Constants?.expoConfig as any)?.extra?.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY as string | undefined;
  return envKey || extraKey || null;
}

export async function geocodeLatLng(lat: number, lng: number, opts?: { timeoutMs?: number; signal?: AbortSignal }): Promise<GeocodeResult | null> {
  const key = readGeocodeKey();
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const ctrl = opts?.signal ? undefined : new AbortController();
  const id = setTimeout(() => ctrl?.abort(), timeoutMs);
  try {
    if (key) {
      const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`;
      const res = await fetch(url, { signal: opts?.signal ?? ctrl?.signal });
      const json = await res.json();
      if (json?.status !== 'OK' || !Array.isArray(json?.results) || json.results.length === 0) {
        if (__DEV__) console.warn('[geocode]', { status: json?.status, error_message: json?.error_message });
        return null;
      }
      const best = json.results[0];
      const parsed = parseComponents(best.address_components || []);
      return { ...parsed, formatted_address: best.formatted_address };
    }
    // Fallback: OpenStreetMap Nominatim for dev (no key)
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&addressdetails=1`;
    const res = await fetch(url, { signal: opts?.signal ?? ctrl?.signal, headers: { 'User-Agent': 'physiosmetic-app' } as any });
    const json = await res.json();
    const addr = json?.address;
    if (!addr) return { formatted_address: json?.display_name || undefined } as any;
    const line1 = [addr.house_number, addr.road].filter(Boolean).join(' ').trim() || undefined;
    const line2 = [addr.suburb || addr.neighbourhood || addr.village].filter(Boolean).join(', ').trim() || undefined;
    const city = addr.city || addr.town || addr.village || addr.county || undefined;
    const state = addr.state || undefined;
    const country = addr.country || undefined;
    const postal_code = addr.postcode || undefined;
    return { line1, line2, city, state, country, postal_code, formatted_address: json?.display_name || undefined };
  } catch (e: any) {
    if (e?.name === 'AbortError') return null;
    if (__DEV__) console.warn('[geocode]', { error: String(e) });
    return null;
  } finally {
    clearTimeout(id);
  }
}
