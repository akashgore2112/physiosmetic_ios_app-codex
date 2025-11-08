export async function getCurrentCoords(): Promise<{ ok: true; lat: number; lng: number } | { ok: false; code: 'LOC:DENIED' | 'LOC:TIMEOUT' | 'LOC:EXCEPTION'; canAskAgain?: boolean } > {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Location = require('expo-location');
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, code: 'LOC:DENIED', canAskAgain: perm.canAskAgain };
    try {
      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        maximumAge: 15000,
        timeout: 8000,
      });
      return { ok: true, lat: pos.coords.latitude, lng: pos.coords.longitude };
    } catch {
      const last = await Location.getLastKnownPositionAsync();
      if (last) return { ok: true, lat: last.coords.latitude, lng: last.coords.longitude };
      return { ok: false, code: 'LOC:TIMEOUT' };
    }
  } catch (e) {
    return { ok: false, code: 'LOC:EXCEPTION' };
  }
}

