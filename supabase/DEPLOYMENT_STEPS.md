# Edge Functions Deployment Guide

## Prerequisites

✅ Supabase CLI installed (via Homebrew)
✅ Razorpay TEST Key ID: `rzp_test_Rde5IXKuG2BKiG` (found in app.json)
✅ Stripe TEST Publishable Key: `pk_test_xxx` (found in app.json)

## Step 1: Get Your Credentials

### A. Razorpay Key Secret
1. Go to https://dashboard.razorpay.com/app/keys
2. Switch to **TEST Mode** (top-right toggle)
3. Copy your **Key Secret** (starts with something like `aBcDef1234...`)

### B. Stripe Keys
1. Go to https://dashboard.stripe.com/test/apikeys
2. Ensure you're in **TEST Mode** (toggle on top-right)
3. Copy:
   - **Publishable key** (starts with `pk_test_...`) → Add to `app.json`
   - **Secret key** (starts with `sk_test_...`) → Add to `.env.local`
4. Go to https://dashboard.stripe.com/test/webhooks
5. Click "Add endpoint"
6. URL: `https://cjdchjdhrjcmtskkgngb.supabase.co/functions/v1/stripe_webhook`
7. Events to listen: `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`
8. Copy the **Signing secret** (starts with `whsec_...`) → Add to `.env.local`

### B. Supabase Access Token (for CLI)
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name like "CLI Deploy Token"
4. Copy the token (starts with `sbp_...`)

## Step 2: Authenticate Supabase CLI

Run one of these commands:

### Option A: Interactive Login
```bash
supabase login
```

### Option B: Use Access Token
```bash
export SUPABASE_ACCESS_TOKEN="your_token_here"
```

## Step 3: Create .env.local

```bash
cd supabase
cat > .env.local <<EOF
# Razorpay
RAZORPAY_KEY_ID=rzp_test_Rde5IXKuG2BKiG
RAZORPAY_KEY_SECRET=your_actual_razorpay_secret_here

# Stripe
STRIPE_SECRET_KEY=sk_test_your_actual_stripe_secret_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_MODE=TEST

# Supabase
SUPABASE_URL=https://cjdchjdhrjcmtskkgngb.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNqZGNoamRocmpjbXRza2tnbmdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIwODI2NDAsImV4cCI6MjA3NzY1ODY0MH0.3u3wLCh9naXeVy_vyHU0yp_8D7Zu9XjxRogtHL-wmQo
EOF
```

## Step 4: Link Project

```bash
supabase link --project-ref cjdchjdhrjcmtskkgngb
```

## Step 5: Set Secrets

```bash
cd supabase
supabase secrets set --env-file .env.local
```

## Step 6: Deploy Functions

### Razorpay Functions
```bash
supabase functions deploy create_razorpay_order
supabase functions deploy verify_razorpay_payment
```

### Stripe Functions
```bash
supabase functions deploy create_payment_intent
supabase functions deploy stripe_webhook
```

## Step 7: Verify Deployment

```bash
supabase functions list
```

You should see both functions listed with status "deployed".

## Step 8: Test Payment Flow

### Razorpay (Indian Cards)
1. Open the app
2. Navigate to Shop → Add item to cart → Checkout
3. Select "Razorpay"
4. Use Razorpay TEST card:
   - Card: `5267 3181 8797 5449` (Indian test card)
   - Expiry: Any future date (e.g., `12/25`)
   - CVV: Any 3 digits (e.g., `123`)
5. Complete payment
6. Verify order appears in Supabase `orders` table with `payment_gateway='razorpay'`

### Stripe (International Cards)
1. Open the app
2. Navigate to Shop → Add item to cart → Checkout
3. Select "Stripe (Test)"
4. Use Stripe TEST card:
   - Card: `4242 4242 4242 4242`
   - Expiry: Any future date (e.g., `12/25`)
   - CVV: Any 3 digits (e.g., `123`)
5. Complete payment
6. Verify order appears in Supabase `orders` table with `payment_gateway='stripe'`

## Troubleshooting

### Check Function Logs
```bash
# Razorpay
supabase functions logs create_razorpay_order --tail
supabase functions logs verify_razorpay_payment --tail

# Stripe
supabase functions logs create_payment_intent --tail
supabase functions logs stripe_webhook --tail
```

### Verify Secrets
```bash
supabase secrets list
```

### Common Issues

#### Razorpay
- **"Access token not provided"**: Run `supabase login` or set `SUPABASE_ACCESS_TOKEN`
- **"Missing Razorpay secrets"**: Verify secrets are set with `supabase secrets list`
- **"Amount mismatch"**: Server recomputes total from DB; client amount must match
- **"International cards not supported"**: Use Indian test card: `5267 3181 8797 5449`

#### Stripe
- **"Missing STRIPE_SECRET_KEY"**: Verify secrets are set with `supabase secrets list`
- **"Failed to initialize payment"**: Check `EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY` in `app.json`
- **"Invalid signature" (webhook)**: Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
- **Webhook not receiving events**: Ensure webhook URL is correct and endpoint is listening to correct events
