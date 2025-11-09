// deno-lint-ignore-file no-explicit-any
import Stripe from 'npm:stripe@14.11.0';

type Req = { amountInPaise: number; currency?: 'INR' | 'AED' | 'USD' };

const ALLOW_ORIGINS = new Set([
  'http://localhost:19000',
  'http://localhost:8081',
  'exp://localhost:8081',
]);

function json(data: any, init?: ResponseInit, origin?: string | null) {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const o = origin && ALLOW_ORIGINS.has(origin) ? origin : '*';
  (headers as any)['Access-Control-Allow-Origin'] = o;
  (headers as any)['Access-Control-Allow-Methods'] = 'POST,OPTIONS';
  (headers as any)['Access-Control-Allow-Headers'] = 'authorization, content-type';
  return new Response(JSON.stringify(data), { ...(init || {}), headers });
}

Deno.serve(async (req: Request): Promise<Response> => {
  const origin = req.headers.get('origin');

  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return json({}, { status: 204 }, origin);
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method Not Allowed' }, { status: 405 }, origin);
  }

  try {
    const body = (await req.json()) as Req;
    console.debug('[create_payment_intent] Request:', { amount: body.amountInPaise, currency: body.currency });

    // Get Stripe secret key
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      console.error('[create_payment_intent] Missing STRIPE_SECRET_KEY');
      return json({ error: 'Payment configuration error' }, { status: 500 }, origin);
    }

    // JWT verification
    const auth = req.headers.get('authorization') || req.headers.get('Authorization') || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      console.error('[create_payment_intent] Missing authorization token');
      return json({ error: 'Unauthorized' }, { status: 401 }, origin);
    }

    // Decode JWT to get user_id (basic verification)
    let userId: string | null = null;
    try {
      const payload = JSON.parse(atob(token.split('.')[1] || ''));
      userId = payload?.sub ?? null;
    } catch (e) {
      console.error('[create_payment_intent] JWT decode error:', e);
    }

    if (!userId) {
      console.error('[create_payment_intent] Invalid JWT token');
      return json({ error: 'Unauthorized' }, { status: 401 }, origin);
    }

    // TODO: Re-price server-side from products/services table
    // For now, trusting client amount - IMPLEMENT BEFORE PRODUCTION
    const amount = Math.floor(body.amountInPaise);
    const currency = (body.currency || 'INR').toLowerCase();

    if (amount <= 0) {
      return json({ error: 'Invalid amount' }, { status: 400 }, origin);
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    console.debug('[create_payment_intent] Creating PaymentIntent:', { amount, currency });

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount, // Amount in smallest currency unit (paise for INR)
      currency,
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        user_id: userId,
      },
    });

    console.debug('[create_payment_intent] PaymentIntent created:', paymentIntent.id);

    return json(
      { clientSecret: paymentIntent.client_secret },
      { status: 200 },
      origin
    );
  } catch (e: any) {
    console.error('[create_payment_intent] Error:', e);
    return json(
      { error: e?.message || 'Payment intent creation failed' },
      { status: 500 },
      origin
    );
  }
});
