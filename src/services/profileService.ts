import { supabase } from '../config/supabaseClient';
import { sb } from './api';

type EnsureProfileResult = {
  id: string;
  full_name?: string | null;
  created?: boolean;
};

export async function ensureProfileExists(
  userId: string,
  fullName?: string | null,
  phone?: string | null
): Promise<EnsureProfileResult> {
  // 1) Try to find an existing profile first
  const existing = await sb<any>(
    supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', userId)
      .single() as any
  );

  if (!existingErr && existing?.id) {
    return { id: existing.id, full_name: (existing as any).full_name ?? null, created: false };
  }

  // 2) Not found: try to insert
  const inserted = await sb<any>(
    supabase
      .from('profiles')
      .insert({ id: userId, full_name: fullName ?? null, phone: phone ?? null, role: 'patient' })
      .select('id, full_name')
      .single() as any
  );

  if (!insertErr && inserted?.id) {
    return { id: inserted.id, full_name: (inserted as any).full_name ?? null, created: true };
  }

  // 3) Insert failed. If RLS blocked (42501), re-check once then proceed if found.
  const code = undefined as any; // sb threw; if we got here, we are handling fallback
  if (code === '42501') {
    const after = await sb<any>(
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('id', userId)
        .single() as any
    );
    if (after?.id) return { id: after.id, full_name: (after as any).full_name ?? null, created: false };
  }

  // If we get here, we truly cannot confirm or create a profile.
  throw insertErr ?? existingErr ?? new Error('Failed to ensure profile exists');
}

export async function fetchProfile(userId: string): Promise<{ id: string; full_name?: string | null; phone?: string | null } | null> {
  try {
    const data = await sb<any>(
      supabase
        .from('profiles')
        .select('id, full_name, phone')
        .eq('id', userId)
        .single() as any
    );
    return data as any;
  } catch (e) {
    console.error('fetchProfile error', e);
    return null;
  }
}

export async function updateProfile(userId: string, payload: { full_name?: string | null; phone?: string | null }) {
  try {
    const data = await sb<any>(
      supabase
        .from('profiles')
        .update({ full_name: payload.full_name ?? null, phone: payload.phone ?? null })
        .eq('id', userId)
        .select('id, full_name, phone')
        .single() as any
    );
    return { ok: true as const, profile: data as any };
  } catch (error) {
    console.error('updateProfile error', error);
    return { ok: false as const, error };
  }
}

// Aliases requested by spec naming
export const getMyProfile = fetchProfile;
export async function upsertMyProfile(params: { id: string; full_name?: string | null; phone?: string | null }) {
  return updateProfile(params.id, { full_name: params.full_name, phone: params.phone });
}
