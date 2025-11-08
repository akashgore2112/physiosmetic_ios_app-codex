type PlaceSuggestion = {
  place_id: string;
  description: string;
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
};

function parseComponents(components: any[]): Omit<PlaceDetails, 'latitude' | 'longitude'> {
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

function getKey(): string | null {
  return process.env.EXPO_PUBLIC_GOOGLE_PLACES_KEY || process.env.EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY || null;
}

export async function placesAutocomplete(input: string): Promise<PlaceSuggestion[]> {
  const key = getKey();
  if (!key) return [];
  const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&types=geocode&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json || json.status !== 'OK' || !Array.isArray(json.predictions)) return [];
    return json.predictions.map((p: any) => ({ place_id: p.place_id, description: p.description }));
  } catch {
    return [];
  }
}

export async function placeDetails(placeId: string): Promise<PlaceDetails | null> {
  const key = getKey();
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}&fields=formatted_address,geometry,address_component&key=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    const json = await res.json();
    if (!json || json.status !== 'OK' || !json.result) return null;
    const r = json.result;
    const lat = r.geometry?.location?.lat;
    const lng = r.geometry?.location?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;
    const parsed = parseComponents(r.address_components || []);
    return {
      latitude: lat,
      longitude: lng,
      formatted_address: r.formatted_address,
      ...parsed,
    };
  } catch {
    return null;
  }
}

export type { PlaceSuggestion, PlaceDetails };

