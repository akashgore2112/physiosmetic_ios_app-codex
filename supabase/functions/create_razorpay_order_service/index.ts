// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type Req = {
  amount_in_paise: number;
  currency: 'INR';
  user_id: string;
  service_id: string;
  therapist_id?: string;
  slot_id?: string;
};

const ALLOW_ORIGINS = new Set([
  'http://localhost:19000',
  'http://localhost:8081',
  'exp://localhost:8081',
  'http://192.168.1.1:8081',
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
    console.log('[create_razorpay_order_service] Request received:', {
      user_id: body.user_id,
      amount: body.amount_in_paise,
      service_id: body.service_id
    });

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

    // Recompute total server-side from services table
    const supaUrl = Deno.env.get('SUPABASE_URL')!;
    const supaKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supaUrl, supaKey, { global: { headers: { Authorization: `Bearer ${token}` } } });

    if (!body.service_id) return json({ error: 'Missing service_id' }, { status: 400 }, origin);

    const { data: service, error: se } = await supabase
      .from('services')
      .select('id,name,base_price,is_active')
      .eq('id', body.service_id)
      .single();

    if (se) {
      console.error('[create_razorpay_order_service] DB error fetching service:', se);
      return json({ error: `Service unavailable: ${se.message}` }, { status: 400 }, origin);
    }

    if (!service || service.is_active === false) {
      return json({ error: 'Service not available' }, { status: 400 }, origin);
    }

    console.log('[create_razorpay_order_service] Service found:', service.name, 'Price:', service.base_price);

    const serverPrice = Math.max(0, Math.floor(Number(service.base_price || 0) * 100));
    const clientPrice = Math.floor(body.amount_in_paise);

    console.log('[create_razorpay_order_service] Amount check:', { serverPrice, clientPrice });

    if (serverPrice <= 0 || serverPrice !== clientPrice) {
      const msg = `Amount mismatch: server calculated ₹${(serverPrice/100).toFixed(2)}, client sent ₹${(clientPrice/100).toFixed(2)}`;
      console.error('[create_razorpay_order_service]', msg);
      return json({ error: msg }, { status: 400 }, origin);
    }

    const amount = serverPrice;
    const basic = btoa(`${keyId}:${keySecret}`);

    // Generate short receipt ID (max 40 chars per Razorpay)
    const receiptId = `svc_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`.substr(0, 40);
    console.log('[create_razorpay_order_service] Receipt ID:', receiptId);

    const r = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${basic}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        amount,
        currency: body.currency,
        receipt: receiptId,
        payment_capture: 1
      }),
    });

    const rzpResponse = await r.json();
    if (!r.ok) {
      const rzpError = rzpResponse?.error?.description || rzpResponse?.error || 'Failed to create order';
      console.error('[create_razorpay_order_service] Razorpay API error:', rzpResponse);
      return json({ error: `Razorpay error: ${rzpError}` }, { status: 400 }, origin);
    }

    console.log('[create_razorpay_order_service] Success! Order ID:', rzpResponse.id);
    return json({
      order_id: rzpResponse.id,
      amount: rzpResponse.amount,
      currency: rzpResponse.currency
    }, { status: 200 }, origin);
  } catch (e) {
    console.error('[create_razorpay_order_service] Error:', e);
    const errorMsg = e instanceof Error ? e.message : 'Bad Request';
    return json({ error: errorMsg }, { status: 400 }, null);
  }
}

serve(handler);
