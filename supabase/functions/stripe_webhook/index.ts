// deno-lint-ignore-file no-explicit-any
import Stripe from 'npm:stripe@14.11.0';

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
  (headers as any)['Access-Control-Allow-Headers'] = 'stripe-signature, content-type';
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
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!stripeSecretKey || !webhookSecret) {
      console.error('[stripe_webhook] Missing Stripe configuration');
      return json({ error: 'Webhook configuration error' }, { status: 500 }, origin);
    }

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get('stripe-signature');

    if (!signature) {
      console.error('[stripe_webhook] Missing stripe-signature header');
      return json({ error: 'Missing signature' }, { status: 400 }, origin);
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-11-20.acacia',
    });

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.debug('[stripe_webhook] Webhook verified:', event.type);
    } catch (err: any) {
      console.error('[stripe_webhook] Webhook signature verification failed:', err.message);
      return json({ error: 'Invalid signature' }, { status: 400 }, origin);
    }

    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[stripe_webhook] Payment succeeded:', paymentIntent.id);
        console.log('[stripe_webhook] Amount:', paymentIntent.amount, paymentIntent.currency);
        console.log('[stripe_webhook] Metadata:', paymentIntent.metadata);

        // TODO: Mark order/appointment as paid in database
        // 1. Extract order_id or appointment_id from paymentIntent.metadata
        // 2. Update orders/appointments table: payment_status = 'paid', gateway_payment_id = paymentIntent.id
        // 3. Send confirmation email/notification to user

        break;
      }

      case 'payment_intent.payment_failed': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.error('[stripe_webhook] Payment failed:', paymentIntent.id);
        console.error('[stripe_webhook] Error:', paymentIntent.last_payment_error?.message);

        // TODO: Update order/appointment status to 'failed'
        // TODO: Notify user of payment failure

        break;
      }

      case 'payment_intent.canceled': {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log('[stripe_webhook] Payment canceled:', paymentIntent.id);

        // TODO: Update order/appointment status to 'canceled'

        break;
      }

      default:
        console.debug('[stripe_webhook] Unhandled event type:', event.type);
    }

    return json({ received: true }, { status: 200 }, origin);
  } catch (e: any) {
    console.error('[stripe_webhook] Error:', e);
    return json(
      { error: e?.message || 'Webhook processing failed' },
      { status: 500 },
      origin
    );
  }
});
