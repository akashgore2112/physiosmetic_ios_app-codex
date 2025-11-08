import { supabase } from '../config/supabaseClient';
import { ensureProfileExists, fetchProfile } from './profileService';
import { useSessionStore } from '../store/useSessionStore';

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No user session');
  // hydrate store
  useSessionStore.getState().setSession(user.id, user.email ?? null);
  try { await ensureProfileExists(user.id, null, null); } catch {}
  const prof = await fetchProfile(user.id);
  useSessionStore.getState().setProfile(prof, { email: user.email ?? null, user_metadata: user.user_metadata as any });
}

export async function signUp(email: string, password: string, opts?: { fullName?: string | null; phone?: string | null }) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;
  const user = data.user;
  if (!user) throw new Error('No user');
  // ensure profile row under RLS
  try { await ensureProfileExists(user.id, opts?.fullName ?? null, opts?.phone ?? null); } catch {}
  // hydrate store
  useSessionStore.getState().setSession(user.id, user.email ?? null);
  const prof = await fetchProfile(user.id);
  useSessionStore.getState().setProfile(prof, { email: user.email ?? null, user_metadata: user.user_metadata as any });
}

export async function signOut() {
  await supabase.auth.signOut();
  useSessionStore.getState().clearSession();
}
