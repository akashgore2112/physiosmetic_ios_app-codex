import { supabase } from '../config/supabaseClient';
import type { Service } from '../types/Service';

export async function getAllActiveServices(): Promise<Service[]> {
  const { data, error } = await supabase
    .from('services')
    .select('id,name,category,description,duration_minutes,base_price,is_online_allowed,image_url,is_active')
    .eq('is_active', true)
    .order('name');
  if (error) throw error;
  return data ?? [];
}

export async function getServiceById(id: string): Promise<Service | null> {
  const { data, error } = await supabase
    .from('services')
    .select('id,name,category,description,duration_minutes,base_price,is_online_allowed,image_url')
    .eq('id', id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}
