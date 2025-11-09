// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const ALLOW_ORIGINS = new Set([
  'http://localhost:19000',
  'http://localhost:8081',
]);

function json(data: any, init?: ResponseInit, origin?: string | null) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const o = origin && ALLOW_ORIGINS.has(origin) ? origin : '*';
  (headers as any)['Access-Control-Allow-Origin'] = o;
  (headers as any)['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
  (headers as any)['Access-Control-Allow-Headers'] = 'authorization, content-type';
  return new Response(JSON.stringify(data), { ...(init || {}), headers });
}

type Req = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };

async function hmacSHA256(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data));
  const bytes = new Uint8Array(sig);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function handler(req: Request): Promise<Response> {
  const origin = req.headers.get('origin');
  if (req.method === 'OPTIONS') return json({}, { status: 200 }, origin);
  if (req.method !== 'POST') return json({ error: 'Method Not Allowed' }, { status: 405 }, origin);
  try {
    const body = (await req.json()) as Req;
    const keySecret = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!keySecret) return json({ ok: false, error: 'Missing secret' }, { status: 500 }, origin);
    const payload = `${body.razorpay_order_id}|${body.razorpay_payment_id}`;
    const expected = await hmacSHA256(keySecret, payload);
    const ok = expected === body.razorpay_signature;
    if (!ok) return json({ ok: false }, { status: 401 }, origin);
    return json({ ok: true }, { status: 200 }, origin);
  } catch (e) {
    return json({ ok: false }, { status: 400 }, origin);
  }
}

serve(handler);
