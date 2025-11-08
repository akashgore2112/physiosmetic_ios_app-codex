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

export async function geocodeLatLng(lat: number, lng: number, opts?: { timeoutMs?: number }): Promise<GeocodeResult | null> {
  const key = process.env.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY;
  if (!key) {
    return null; // no key configured; caller should fallback to manual entry
  }
  const timeoutMs = opts?.timeoutMs ?? 8000;
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${encodeURIComponent(key)}`;
    const res = await fetch(url, { signal: ctrl.signal });
    const json = await res.json();
    if (json?.status !== 'OK' || !Array.isArray(json?.results) || json.results.length === 0) {
      return null;
    }
    const best = json.results[0];
    const parsed = parseComponents(best.address_components || []);
    return { ...parsed, formatted_address: best.formatted_address };
  } catch (e) {
    return null;
  } finally {
    clearTimeout(id);
  }
}

