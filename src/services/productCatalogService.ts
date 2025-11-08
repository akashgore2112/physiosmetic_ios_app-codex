import { supabase } from '../config/supabaseClient';
import { sb } from './api';

export type CatalogProduct = {
  id: string;
  name: string;
  description?: string | null;
  price: number | null;
  image_url?: string | null;
  category?: string | null;
  in_stock?: boolean | null;
  has_variants?: boolean | null;
  created_at?: string | null;
};

async function trySelectProducts(selectStr: string) {
  // Attempt with is_active=true filter; if schema lacks the column, fall back without filter
  try {
    const q: any = supabase
      .from('products')
      .select(selectStr)
      .eq('is_active', true)
      .order('name');
    const data = await sb<any[]>(q);
    return data ?? [];
  } catch (_e) {
    try {
      const q2: any = supabase
        .from('products')
        .select(selectStr)
        .order('name');
      const data2 = await sb<any[]>(q2);
      return data2 ?? [];
    } catch {
      return null;
    }
  }
}

// 1) All active products with core fields (+ optional has_variants if available)
export async function getAllActiveProducts(): Promise<CatalogProduct[]> {
  // Try multiple shapes to be resilient to schema differences
  const a = await trySelectProducts('id,name,description,price,image_url,category,in_stock,has_variants,created_at');
  if (a && a.length > 0) return a as CatalogProduct[];
  const b = await trySelectProducts('id,name,description,price,image_url,category,in_stock,has_variants');
  if (b && b.length > 0) return (b as any[]).map((p) => ({ ...p, created_at: null })) as CatalogProduct[];
  const c = await trySelectProducts('id,name,description,price,image_url,category,in_stock,created_at');
  if (c && c.length > 0) return (c as any[]).map((p) => ({ ...p, has_variants: null })) as CatalogProduct[];
  const d = await trySelectProducts('id,name,description,price,image_url,category,in_stock');
  return (d ?? []).map((p: any) => ({ ...p, has_variants: null, created_at: null })) as CatalogProduct[];
}

// 1b) Grouped by category (dynamic from DB; order categories asc)
export async function getProductsGroupedByCategory(): Promise<Record<string, CatalogProduct[]>> {
  const rows = await getAllActiveProducts();
  const map: Record<string, CatalogProduct[]> = {};
  rows.forEach((p) => {
    const cat = (p.category ?? 'Uncategorized');
    if (!map[cat]) map[cat] = [];
    map[cat].push(p);
  });
  // Sort categories asc
  const ordered: Record<string, CatalogProduct[]> = {};
  Object.keys(map).sort((a, b) => a.localeCompare(b)).forEach((k) => { ordered[k] = map[k]; });
  return ordered;
}

// 2) case-insensitive search across name + description
export async function searchProducts(query: string): Promise<CatalogProduct[]> {
  const q = (query || '').trim();
  if (!q) return [];
  const ilike = `%${q}%`;
  // Helper to attempt a select, first with is_active filter, then without
  const attempt = async (selectStr: string) => {
    try {
      const data = await sb<any[]>(
        supabase
          .from('products')
          .select(selectStr)
          .eq('is_active', true)
          .or(`name.ilike.${ilike},description.ilike.${ilike}`) as any
      );
      return data ?? [];
    } catch {
      try {
        const data2 = await sb<any[]>(
          supabase
            .from('products')
            .select(selectStr)
            .or(`name.ilike.${ilike},description.ilike.${ilike}`) as any
        );
        return data2 ?? [];
      } catch {
        return [];
      }
    }
  };
  // Try with has_variants and created_at; fall back to basic fields if either missing
  const withHv = await attempt('id,name,description,price,image_url,category,in_stock,has_variants,created_at');
  if (withHv.length > 0) return withHv as CatalogProduct[];
  const basic = await attempt('id,name,description,price,image_url,category,in_stock,created_at');
  if ((basic ?? []).length > 0) return (basic ?? []).map((p: any) => ({ ...p, has_variants: null })) as CatalogProduct[];
  const final = await attempt('id,name,description,price,image_url,category,in_stock');
  return (final ?? []).map((p: any) => ({ ...p, has_variants: null, created_at: null })) as CatalogProduct[];
}

// 3) Bestsellers by total qty from order_items join → products
export async function getBestsellers(limit = 10): Promise<(CatalogProduct & { total_qty: number })[]> {
  // Fetch order_items with joined product; aggregate client-side to avoid DB RPC dependency here
  const rows = await sb<any[]>(
    supabase
      .from('order_items')
      .select('product_id,qty, products:product_id(id,name,description,price,image_url,category,in_stock,is_active)') as any
  );
  const agg = new Map<string, { total: number; prod: any }>();
  (rows ?? []).forEach((r: any) => {
    const p = r.products;
    if (!p || p.is_active !== true) return; // only active products
    const key = p.id;
    const rec = agg.get(key) || { total: 0, prod: p };
    rec.total += Number(r.qty || 0);
    rec.prod = p;
    agg.set(key, rec);
  });
  const list = Array.from(agg.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, limit))
    .map(({ total, prod }) => ({
      id: prod.id,
      name: prod.name,
      description: prod.description ?? null,
      price: prod.price ?? null,
      image_url: prod.image_url ?? null,
      category: prod.category ?? null,
      in_stock: prod.in_stock ?? null,
      has_variants: null,
      total_qty: total,
    }));
  return list;
}

export type ProductVariant = { id: string; label: string; price: number | null; in_stock?: boolean | number | null };

export async function getVariants(productId: string): Promise<ProductVariant[]> {
  if (!productId) return [];
  try {
    const rows = await sb<any[]>(
      supabase
        .from('product_variants')
        .select('id,label,price,in_stock,product_id')
        .eq('product_id', productId) as any
    );
    return (rows ?? []).map((r: any) => ({ id: r.id, label: r.label, price: r.price ?? null, in_stock: r.in_stock })) as ProductVariant[];
  } catch {
    return [];
  }
}

// Frequently bought together: products that co-occur in the same orders as productId
export async function getFrequentlyBoughtTogether(productId: string, limit = 4): Promise<CatalogProduct[]> {
  if (!productId) return [];
  // Step 1: find order_ids that include the given productId
  const orderIds = await (async () => {
    try {
      const rows = await sb<any[]>(
        supabase
          .from('order_items')
          .select('order_id')
          .eq('product_id', productId) as any
      );
      const set = new Set<string>();
      (rows ?? []).forEach((r: any) => { if (r?.order_id) set.add(String(r.order_id)); });
      return Array.from(set);
    } catch {
      return [] as string[];
    }
  })();
  if (orderIds.length === 0) return [];
  // Step 2: fetch other items in these orders and join products
  let others: any[] = [];
  try {
    others = await sb<any[]>(
      supabase
        .from('order_items')
        .select('product_id,qty, products:product_id(id,name,description,price,image_url,category,in_stock,is_active,created_at)')
        .in('order_id', orderIds) as any
    );
  } catch {
    // Fallback: try without is_active/created_at
    try {
      others = await sb<any[]>(
        supabase
          .from('order_items')
          .select('product_id,qty, products:product_id(id,name,description,price,image_url,category,in_stock)')
          .in('order_id', orderIds) as any
      );
    } catch {
      return [];
    }
  }
  const agg = new Map<string, { total: number; prod: any }>();
  (others ?? []).forEach((r: any) => {
    const pid = r?.product_id;
    const prod = r?.products;
    if (!pid || !prod) return;
    if (String(pid) === String(productId)) return; // exclude self
    if (prod.is_active === false) return;
    const rec = agg.get(pid) || { total: 0, prod };
    rec.total += Number(r.qty || 0);
    rec.prod = prod;
    agg.set(pid, rec);
  });
  const list = Array.from(agg.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, Math.max(0, limit))
    .map(({ prod }) => ({
      id: prod.id,
      name: prod.name,
      description: prod.description ?? null,
      price: prod.price ?? null,
      image_url: prod.image_url ?? null,
      category: prod.category ?? null,
      in_stock: prod.in_stock ?? null,
      has_variants: null,
      created_at: prod.created_at ?? null,
    }));
  return list;
}
