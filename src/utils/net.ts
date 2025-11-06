import * as Network from 'expo-network';

export async function getOnlineState(): Promise<boolean> {
  try {
    const st = await Network.getNetworkStateAsync();
    return Boolean(st.isConnected && (st.isInternetReachable ?? true));
  } catch {
    // Simulators / no perms: assume online to avoid hard-block
    return true;
  }
}

