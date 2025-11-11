import { supabase } from '../config/supabaseClient';
import { sb } from './api';
import type { Order } from '../types/order';
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

export type OrderItemWithProduct = OrderItem & {
  product?: { id: string; name: string; price: number; image_url?: string | null; in_stock?: boolean };
  variant_id?: string | null;
  variant_label?: string | null;
};

export async function getOrderItems(orderId: string): Promise<OrderItemWithProduct[]> {
  const data = await sb<any[]>(
    supabase
      .from('order_items')
      .select('id,order_id,product_id,variant_id,variant_label,qty,price_each, product:product_id(id,name,price,image_url,in_stock)')
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

export type ReorderCartItem = { id: string; line_id: string; name: string; price: number; qty: number; image_url?: string | null; variant_id?: string | null; variant_label?: string | null };

export async function getReorderItems(orderId: string): Promise<ReorderCartItem[]> {
  const items = await getOrderItems(orderId);
  // Skip unavailable products
  return items
    .filter((it) => it.product?.in_stock !== false)
    .map((it) => ({
      id: it.product_id,
      line_id: it.variant_id ? `${it.product_id}::${it.variant_id}` : it.product_id,
      name: it.product?.name ?? 'Product',
      price: it.product?.price ?? it.price_each ?? 0,
      qty: it.qty ?? 0,
      image_url: it.product?.image_url ?? null,
      variant_id: it.variant_id ?? null,
      variant_label: it.variant_label ?? null,
    }));
}

export type OrderDetail = Order & {
  total_amount?: number | null;
  discount_amount?: number | null;
  tax_amount?: number | null;
  shipping_amount?: number | null;
  payment_method?: string | null;
  payment_status?: string | null;
  gateway_payment_id?: string | null;
  coupon_code?: string | null;
  pickup?: boolean;
  shipping_address?: Record<string, any> | null;
  items: OrderItemWithProduct[];
};

export async function getOrderById(orderId: string): Promise<OrderDetail | null> {
  const { data, error } = await supabase
    .from('orders')
    .select('id,user_id,total_amount,discount_amount,tax_amount,shipping_amount,status,created_at,payment_method,payment_status,gateway_payment_id,coupon_code,pickup,shipping_address')
    .eq('id', orderId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const items = await getOrderItems(orderId);
  return { ...(data as any), items };
}

/**
 * Apply a coupon code to the cart (server-side validation)
 */
export async function applyCoupon(
  code: string,
  cart: Array<{ id: string; variant_id?: string | null; qty: number }>
): Promise<{
  valid: boolean;
  code?: string;
  discount?: number;
  subtotal?: number;
  total_after?: number;
  note?: string;
  error?: string;
  message: string;
}> {
  // Convert cart to RPC format
  const cartPayload = cart.map((item) => ({
    product_id: item.id,
    variant_id: item.variant_id || null,
    qty: item.qty,
  }));

  const { data, error } = await supabase.rpc('apply_coupon', {
    p_code: code,
    p_cart: cartPayload as any,
  });

  if (error) {
    console.error('[orderService] applyCoupon error:', error);
    throw new Error(error.message || 'Failed to apply coupon');
  }

  return data as any;
}

/**
 * Place order using server-side RPC (with server-side pricing validation)
 * SECURITY: This replaces client-side pricing with server-side validation
 */
export async function placeOrder(
  userId: string,
  items: ReorderCartItem[],
  opts?: {
    pickup?: boolean;
    address?: any;
    payment?: {
      payment_method?: string;
      payment_status?: string;
      payment_gateway?: string;
      gateway_order_id?: string;
      gateway_payment_id?: string;
    };
    couponCode?: string;
    idempotencyKey?: string;
  }
): Promise<{
  id: string;
  total?: number;
  subtotal?: number;
  discount?: number;
  tax?: number;
  shipping?: number;
}> {
  // Convert cart items to RPC format
  const cart = items.map((item) => ({
    product_id: item.id,
    variant_id: item.variant_id || null,
    qty: item.qty,
  }));

  // Call server-side place_order RPC
  const { data, error } = await supabase.rpc('place_order', {
    p_cart: cart as any,
    p_shipping_address: opts?.address || null,
    p_pickup: opts?.pickup || false,
    p_payment_method: opts?.payment?.payment_method || 'cod',
    p_coupon_code: opts?.couponCode || null,
    p_idempotency_key: opts?.idempotencyKey || null,
    p_payment_gateway: opts?.payment?.payment_gateway || null,
    p_gateway_order_id: opts?.payment?.gateway_order_id || null,
    p_gateway_payment_id: opts?.payment?.gateway_payment_id || null,
  });

  if (error) {
    console.error('[orderService] placeOrder RPC error:', error);
    throw new Error(error.message || 'Failed to place order');
  }

  // Handle response from RPC
  const result = data as any;

  if (!result.success) {
    // Server returned error in response body
    const errorMessage = result.message || 'Failed to place order';
    console.error('[orderService] placeOrder failed:', result);
    throw new Error(errorMessage);
  }

  return {
    id: result.order_id,
    total: result.total,
    subtotal: result.subtotal,
    discount: result.discount,
    tax: result.tax,
    shipping: result.shipping,
  };
}
