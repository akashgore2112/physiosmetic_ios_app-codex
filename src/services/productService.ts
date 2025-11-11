import { supabase } from '../config/supabaseClient';
import { sb } from './api';
import type { Product } from '../types/product';

export async function getActiveProducts(params?: { category?: string | null; search?: string | null }): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select('id,name,description,price,image_url,category,in_stock')
    .or('in_stock.is.null,in_stock.eq.true');
  if (params?.category) q = q.eq('category', params.category);
  if (params?.search) q = q.ilike('name', `%${params.search}%`);
  const data = await sb<Product[]>(q.order('name') as any);
  return data ?? [];
}

export async function getProductById(id: string): Promise<Product | null> {
  const data = await sb<Product | null>(
    supabase
      .from('products')
      .select('id,name,description,price,image_url,category,in_stock')
      .eq('id', id)
      .maybeSingle() as any
  );
  return data ?? null;
}

// Alias for progress-doc parity
export async function getProduct(id: string): Promise<Product | null> {
  return getProductById(id);
}

export async function getProductCategories(): Promise<string[]> {
  const data = await sb<any[]>(
    supabase
      .from('products')
      .select('category')
      .neq('category', null) as any
  );
  const set = new Set<string>();
  (data ?? []).forEach((r: any) => { if (r.category) set.add(r.category); });
  return Array.from(set).sort();
}

export async function getRelatedByCategory(category: string, opts?: { excludeId?: string; limit?: number }): Promise<Product[]> {
  let q = supabase
    .from('products')
    .select('id,name,description,price,image_url,category,in_stock')
    .eq('in_stock', true)
    .eq('category', category)
    .order('name');
  const data = await sb<Product[]>(q as any);
  let list = (data ?? []) as Product[];
  if (opts?.excludeId) list = list.filter((p) => p.id !== opts.excludeId);
  if (opts?.limit) list = list.slice(0, opts.limit);
  return list;
}

export type TopProduct = Pick<Product, 'id' | 'name' | 'price' | 'image_url'> & { total_qty?: number };

export async function getTopPurchasedProducts(limit = 4): Promise<TopProduct[]> {
  // Prefer RPC for aggregation due to RLS on order_items
  const { data, error } = await supabase.rpc('get_top_products', { limit_count: limit });
  if (error) {
    // Fallback: no data
    return [];
  }
  // data: [{ id, name, price, image_url, total_qty }]
  return (data ?? []) as TopProduct[];
}
