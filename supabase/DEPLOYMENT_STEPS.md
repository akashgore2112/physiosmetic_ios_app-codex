# Edge Functions Deployment Guide

## Prerequisites

✅ Supabase CLI installed (via Homebrew)
✅ Razorpay TEST Key ID: `rzp_test_Rde5IXKuG2BKiG` (found in app.json)

## Step 1: Get Your Credentials

### A. Razorpay Key Secret
1. Go to https://dashboard.razorpay.com/app/keys
2. Switch to **TEST Mode** (top-right toggle)
3. Copy your **Key Secret** (starts with something like `aBcDef1234...`)

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
RAZORPAY_KEY_ID=rzp_test_Rde5IXKuG2BKiG
RAZORPAY_KEY_SECRET=your_actual_secret_here
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

```bash
supabase functions deploy create_razorpay_order
supabase functions deploy verify_razorpay_payment
```

## Step 7: Verify Deployment

```bash
supabase functions list
```

You should see both functions listed with status "deployed".

## Step 8: Test Payment Flow

1. Open the app
2. Navigate to Shop → Add item to cart → Checkout
3. Select "Pay Online"
4. Use Razorpay TEST card:
   - Card: `4111 1111 1111 1111`
   - Expiry: Any future date (e.g., `12/25`)
   - CVV: Any 3 digits (e.g., `123`)
5. Complete payment
6. Verify order appears in Supabase `orders` table with `status='paid'`

## Troubleshooting

### Check Function Logs
```bash
supabase functions logs create_razorpay_order --tail
supabase functions logs verify_razorpay_payment --tail
```

### Verify Secrets
```bash
supabase secrets list
```

### Common Issues
- **"Access token not provided"**: Run `supabase login` or set `SUPABASE_ACCESS_TOKEN`
- **"Missing Razorpay secrets"**: Verify secrets are set with `supabase secrets list`
- **"Amount mismatch"**: Server recomputes total from DB; client amount must match
