// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { v4 as uuidv4 } from "https://esm.sh/uuid@9.0.1";

type CartItem = { product_id: string; variant_id?: string | null; qty: number };
type Req = { amount_in_paise: number; currency: 'INR'; user_id: string; cart: CartItem[] };

const ALLOW_ORIGINS = new Set([
  'http://localhost:19000',
  'http://localhost:8081',
  'exp://localhost:8081',
  'http://192.168.1.1:8081', // Add your local IP if testing on device
  // Allow all origins for now during development
]);

function json(data: any, init?: ResponseInit, origin?: string | null) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const o = origin && ALLOW_ORIGINS.has(origin) ? origin : '*';
  (headers as any)['Access-Control-Allow-Origin'] = o;
  (headers as any)['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
  (headers as any)['Access-Control-Allow-Headers'] = 'authorization, content-type';
  return new Response(JSON.stringify(data), { ...(init || {}), headers });
}

async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return json({}, { status: 200 }, origin);
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 }, origin);
  try {
    const body = (await req.json()) as Req;
    console.log('[create_razorpay_order] Request received:', { user_id: body.user_id, amount: body.amount_in_paise, cart_items: body.cart?.length });
    const keyId = Deno.env.get('RAZORPAY_KEY_ID');
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keyId || !keySecret) return json({ error: 'Missing Razorpay secrets' }, { status: 500 }, origin);

    // Auth: extract user id from JWT and compare with body.user_id
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return json({ error: 'Unauthorized' }, { status: 401 }, origin);
    let tokenUser: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      tokenUser = payload?.sub ?? null;
    } catch {}
    if (!tokenUser || tokenUser !== body.user_id) return json({ error: 'Unauthorized' }, { status: 401 }, origin);

    // Recompute total server-side from products table
    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supaUrl, supaKey, { global: { headers: { Authorization: `Bearer ${token}` } } });
    const ids = Array.from(new Set((body.cart || []).map((c) => c.product_id))).filter(Boolean);
    console.log('[create_razorpay_order] Product IDs:', ids);
    if (ids.length === 0) return json({ error: 'Empty cart' }, { status: 400 }, origin);
    const { data: prods, error: pe } = await supabase.from('products').select('id,price,in_stock').in('id', ids);
    if (pe) {
      console.error('[create_razorpay_order] DB error fetching products:', pe);
      return json({ error: `Pricing unavailable: ${pe.message}` }, { status: 400 }, origin);
    }
    console.log('[create_razorpay_order] Products found:', prods?.length, 'out of', ids.length);
    const priceMap = new Map<string, number>();
    (prods || []).forEach((p: any) => { if (p?.in_stock !== false) priceMap.set(p.id, Number(p.price || 0)); });
    console.log('[create_razorpay_order] Price map:', Object.fromEntries(priceMap));
    const computed = Math.max(0, Math.floor((body.cart || []).reduce((sum, it) => sum + (priceMap.get(it.product_id) || 0) * Math.max(1, it.qty), 0) * 100));
    console.log('[create_razorpay_order] Amount check:', { computed, received: body.amount_in_paise });
    if (computed <= 0 || computed !== Math.floor(body.amount_in_paise)) {
      const msg = `Amount mismatch: server calculated ₹${(computed/100).toFixed(2)}, client sent ₹${(body.amount_in_paise/100).toFixed(2)}`;
      console.error('[create_razorpay_order]', msg);
      return json({ error: msg }, { status: 400 }, origin);
    }
    const amount = computed;
    const basic = btoa(`${keyId}:${keySecret}`);
    // Generate short receipt ID (max 40 chars per Razorpay): use timestamp + random
    const receiptId = `shop_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`.substr(0, 40);
    console.log('[create_razorpay_order] Receipt ID:', receiptId, 'Length:', receiptId.length);
    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount, currency: body.currency, receipt: receiptId, payment_capture: 1 }),
    });
    const rzpResponse = await r.json();
    if (!r.ok) {
      const rzpError = rzpResponse?.error?.description || rzpResponse?.error || 'Failed to create order';
      console.error('[create_razorpay_order] Razorpay API error:', rzpResponse);
      return json({ error: `Razorpay error: ${rzpError}` }, { status: 400 }, origin);
    }
    console.log('[create_razorpay_order] Success! Order ID:', rzpResponse.id);
    return json({ order_id: rzpResponse.id, amount: rzpResponse.amount, currency: rzpResponse.currency }, { status: 200 }, origin);
  } catch (e) {
    console.error('[create_razorpay_order] Error:', e);
    const errorMsg = e instanceof Error ? e.message : 'Bad Request';
    return json({ error: errorMsg }, { status: 400 }, null);
  }
}

serve(handler);
