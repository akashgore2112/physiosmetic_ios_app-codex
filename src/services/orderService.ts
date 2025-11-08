import { supabase } from '../config/supabaseClient';
import { sb } from './api';
import type { Order } from '../types/Order';
import type { OrderItem } from '../types/OrderItem';

export async function getMyOrders(userId: string): Promise<Order[]> {
  const data = await sb<any[]>(
    supabase
      .from('orders')
      .select('id,total_amount,status,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false }) as any
  );
  return data ?? [];
}

export async function getOrderItems(orderId: string): Promise<(OrderItem & { product?: { id: string; name: string; price: number; image_url?: string | null; in_stock?: boolean } })[]> {
  const data = await sb<any[]>(
    supabase
      .from('order_items')
      .select('id,order_id,product_id,qty,price_each, products:product_id(id,name,price,image_url,in_stock)')
      .eq('order_id', orderId) as any
  );
  return (data ?? []) as any;
}

export async function cancelOrder(orderId: string): Promise<void> {
  // Check current status first
  const data = await sb<any>(
    supabase
      .from('orders')
      .select('status')
      .eq('id', orderId)
      .maybeSingle() as any
  );
  const status = data?.status as string | undefined;
  const eligible = status === 'placed' || status === 'pending' || status === 'processing';
  if (!eligible) throw new Error('Order cannot be cancelled at this stage');
  await sb<any>(supabase.from('orders').update({ status: 'cancelled' }).eq('id', orderId) as any);
}

export type ReorderCartItem = { id: string; name: string; price: number; qty: number; image_url?: string | null };

export async function getReorderItems(orderId: string): Promise<ReorderCartItem[]> {
  const items = await getOrderItems(orderId);
  // Skip unavailable products
  return items
    .filter((it) => it.products?.in_stock !== false)
    .map((it) => ({
      id: it.product_id,
      name: it.products?.name ?? 'Product',
      price: it.products?.price ?? it.price_each ?? 0,
      qty: it.qty,
      image_url: it.products?.image_url ?? null,
    }));
}

export async function placeOrder(
  userId: string,
  items: ReorderCartItem[],
  opts?: { pickup?: boolean; address?: any }
): Promise<{ id: string }> {
  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);
  // Try insert with pickup/address if columns exist; on failure, fallback to minimal insert
  const tryInsert = async (payload: any) => {
    return await sb<any>(
      supabase
        .from('orders')
        .insert(payload)
        .select('id')
        .single() as any
    );
  };
  let order: any;
  try {
    order = await tryInsert({ user_id: userId, total_amount: total, status: 'placed', pickup: !!opts?.pickup, shipping_address: opts?.address ?? null });
  } catch (_e) {
    order = await tryInsert({ user_id: userId, total_amount: total, status: 'placed' });
  }
  const orderId = order.id as string;
  if (items.length > 0) {
    const rows = items.map((it) => ({ order_id: orderId, product_id: it.id, qty: it.qty, price_each: it.price }));
    await sb<any>(supabase.from('order_items').insert(rows) as any);
  }
  return { id: orderId };
}
