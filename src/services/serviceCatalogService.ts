import { supabase } from '../config/supabaseClient';
import type { Service } from '../types/Service';

// Returns active services only. Attempts to include optional popularity_score when present.
export async function getAllActiveServices(): Promise<(Service & { popularity_score?: number | null })[]> {
  // Try selecting popularity_score (optional); fall back if column missing
  let data: any[] | null = null;
  let error: any = null;
  // Primary: include popularity_score
  let res = await supabase
    .from('services')
    .select('id,name,category,description,duration_minutes,base_price,is_online_allowed,image_url,popularity_score')
    .eq('is_active', true);
  if (res.error) {
    error = res.error;
  } else {
    data = res.data as any[] | null;
  }
  // Fallback: column may not exist – query without it
  if (error) {
    const fb = await supabase
      .from('services')
      .select('id,name,category,description,duration_minutes,base_price,is_online_allowed,image_url')
      .eq('is_active', true);
    if (fb.error) throw fb.error;
    data = fb.data as any[] | null;
  }
  const list = (data ?? []) as Array<Service & { popularity_score?: number | null }>;
  // Sort: by popularity_score desc when present; otherwise by name asc
  const hasPop = list.some((s) => typeof (s as any).popularity_score === 'number');
  if (hasPop) {
    list.sort((a: any, b: any) => {
      const av = a.popularity_score ?? 0;
      const bv = b.popularity_score ?? 0;
      if (av !== bv) return bv - av;
      return (a.name || '').localeCompare(b.name || '');
    });
  } else {
    list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }
  return list;
}

export async function getServiceById(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('id,name,category,description,duration_minutes,base_price,is_online_allowed,image_url')
    .eq('id', id)
    .eq('is_active', true)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

// Group services by the 6 primary categories in a fixed order.
export async function getServicesGroupedByCategory(): Promise<Record<string, (Service & { popularity_score?: number | null })[]>> {
  const order = [
    'Sports Performance Studio',
    'Physio Care',
    'Skin Care',
    'Hair Care',
    'Body Care',
    'Nutrition Care',
  ];
  const list = await getAllActiveServices();
  const out: Record<string, (Service & { popularity_score?: number | null })[]> = {};
  for (const cat of order) out[cat] = [];
  const other: (Service & { popularity_score?: number | null })[] = [];
  for (const s of list) {
    const key = order.includes(s.category) ? s.category : 'Other';
    if (key === 'Other') other.push(s); else out[key].push(s);
  }
  // Remove empty categories from output and append Other at end if any
  const cleaned: Record<string, (Service & { popularity_score?: number | null })[]> = {};
  for (const cat of order) {
    if (out[cat] && out[cat].length > 0) cleaned[cat] = out[cat];
  }
  if (other.length > 0) cleaned['Other'] = other;
  return cleaned;
}
