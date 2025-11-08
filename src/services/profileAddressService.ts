import { supabase } from '../config/supabaseClient';
import { sb } from './api';

export type Address = {
  name: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  pincode: string;
  state: string;
  country: string;
  label?: string | null; // e.g., Home, Work
};

export type AddressWithId = Address & { id: string; is_default?: boolean };

export async function getAddresses(userId: string): Promise<AddressWithId[]> {
  try {
    const row = await sb<any>(
      supabase
        .from('profiles')
        .select('addresses')
        .eq('id', userId)
        .maybeSingle() as any
    );
    const arr = (row?.addresses ?? []) as AddressWithId[];
    if (Array.isArray(arr)) return arr as AddressWithId[];
    return [];
  } catch {
    return [];
  }
}

function ensureId(addr: Partial<AddressWithId>): AddressWithId {
  const id = addr.id || `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  return {
    id,
    is_default: !!addr.is_default,
    name: addr.name || '',
    phone: addr.phone || '',
    line1: addr.line1 || '',
    line2: addr.line2 || '',
    city: addr.city || '',
    pincode: addr.pincode || '',
    state: addr.state || '',
    country: addr.country || 'India',
    label: addr.label ?? null,
  };
}

export async function saveAddress(userId: string, addr: Address, opts?: { setDefault?: boolean }): Promise<AddressWithId[]> {
  try {
    const current = await getAddresses(userId);
    const withId = ensureId(addr);
    let list: AddressWithId[] = [withId, ...current];
    if (opts?.setDefault) {
      list = list.map((a, idx) => ({ ...a, is_default: a.id === withId.id }));
    }
    const next = list.slice(0, 10);
    await sb<any>(
      supabase
        .from('profiles')
        .update({ addresses: next })
        .eq('id', userId) as any
    );
    return next;
  } catch {
    return [];
  }
}

export async function updateAddress(userId: string, addr: AddressWithId, opts?: { setDefault?: boolean }): Promise<AddressWithId[]> {
  try {
    const current = await getAddresses(userId);
    let next = current.map((a) => (a.id === addr.id ? { ...a, ...addr } : a));
    if (opts?.setDefault) next = next.map((a) => ({ ...a, is_default: a.id === addr.id }));
    await sb<any>(supabase.from('profiles').update({ addresses: next }).eq('id', userId) as any);
    return next;
  } catch {
    return [];
  }
}

export async function deleteAddress(userId: string, id: string): Promise<AddressWithId[]> {
  try {
    const current = await getAddresses(userId);
    const next = current.filter((a) => a.id !== id);
    await sb<any>(supabase.from('profiles').update({ addresses: next }).eq('id', userId) as any);
    return next;
  } catch {
    return [];
  }
}

export async function setDefaultAddress(userId: string, id: string): Promise<AddressWithId[]> {
  try {
    const current = await getAddresses(userId);
    const next = current.map((a) => ({ ...a, is_default: a.id === id }));
    await sb<any>(supabase.from('profiles').update({ addresses: next }).eq('id', userId) as any);
    return next;
  } catch {
    return [];
  }
}
