# Payment Debugging Guide

## Current Status

✅ Edge Function redeployed with comprehensive logging
✅ Client-side error handling improved
✅ Detailed error messages enabled

## How to Debug Payment Issues

### Step 1: Check Console Logs (App Side)

Open your **browser console** or **React Native debugger** and look for logs starting with:
```
[paymentsApi] Creating Razorpay order:
[paymentsApi] Edge Function error:
[paymentsApi] Response has error:
[paymentsApi] Order created successfully:
```

### Step 2: Check Edge Function Logs (Server Side)

**Option A: Supabase Dashboard**
1. Go to: https://supabase.com/dashboard/project/cjdchjdhrjcmtskkgngb/functions
2. Click on `create_razorpay_order`
3. Go to "Logs" tab
4. Look for recent errors

**Option B: Real-time logs (if available)**
```bash
# From Supabase dashboard, use the Logs UI
# or check the Functions page for invocation history
```

### Step 3: Understand Error Messages

The Edge Function now returns **detailed error messages**:

#### Common Errors:

1. **"Missing Razorpay secrets"** (500)
   - Fix: Check secrets are set: `supabase secrets list`
   - Should see: RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET

2. **"Unauthorized"** (401)
   - Two possible causes:
     - No JWT token (user not logged in)
     - Token user ID doesn't match request user_id
   - Fix: Make sure user is logged in before checkout

3. **"Empty cart"** (400)
   - Cart has no items or all product_ids are null/undefined
   - Fix: Check cart store has valid items with `id` field

4. **"Pricing unavailable: [DB error]"** (400)
   - Database query failed
   - Fix: Check products table exists and has correct columns (id, price, in_stock)

5. **"Amount mismatch: server calculated ₹X, client sent ₹Y"** (400)
   - **Most common error!**
   - Server recalculates total from DB and it doesn't match client
   - Possible causes:
     - Products table price is different from cart item price
     - Rounding issue (server uses `Math.round(total * 100)`)
     - Out-of-stock items not filtered client-side
   - Fix:
     - Refresh cart prices before checkout
     - Use same rounding logic: `Math.round(total * 100)`

6. **"Razorpay error: [description]"** (400)
   - Razorpay API rejected the request
   - Common causes:
     - Invalid API keys (using TEST mode keys in LIVE mode or vice versa)
     - Amount too small (Razorpay minimum: ₹1.00)
     - API keys disabled
   - Fix: Check Razorpay dashboard, verify keys are active

### Step 4: Test Payment Flow

**A. Verify Cart Data**

Add this temporary log in CheckoutScreen before payment:
```typescript
// In CheckoutScreen.tsx, line ~198
const cart = items.map((it) => ({ product_id: it.id, qty: it.qty }));
console.log('[Checkout] Cart being sent:', cart);
console.log('[Checkout] Total amount:', total, 'Paise:', Math.round(total * 100));
```

Expected output:
```json
{
  "cart": [
    { "product_id": "uuid-here", "qty": 2 },
    { "product_id": "uuid-here", "qty": 1 }
  ],
  "total": 1500,
  "paise": 150000
}
```

**B. Test Minimal Order**

1. Clear cart
2. Add ONE product
3. Go to checkout
4. Try payment
5. Check logs for exact error

**C. Verify Products Table**

Run this in Supabase SQL Editor:
```sql
-- Check products have correct price structure
SELECT id, name, price, in_stock
FROM products
LIMIT 5;
```

Expected: `price` column should be a number (e.g., 1500.00 for ₹1500)

### Step 5: Quick Fixes

#### Fix #1: Force Price Refresh

Update CheckoutScreen to fetch latest prices before payment:

```typescript
// Before creating Razorpay order, refresh cart prices
const { data: freshPrices } = await supabase
  .from('products')
  .select('id, price')
  .in('id', items.map(it => it.id));

// Verify total matches DB
const serverTotal = items.reduce((sum, it) => {
  const fresh = freshPrices?.find(p => p.id === it.id);
  return sum + (fresh?.price || 0) * it.qty;
}, 0);

console.log('Client total:', total, 'Server total:', serverTotal);
```

#### Fix #2: Exact Rounding Match

Ensure client and server use identical rounding:

```typescript
// CheckoutScreen.tsx line ~197
const amountPaise = Math.round(total * 100);  // ✅ Correct

// NOT:
// const amountPaise = Math.floor(total * 100);  // ❌ Wrong
// const amountPaise = total * 100;  // ❌ Wrong (may have decimals)
```

### Step 6: Get Exact Error

The app should now show the EXACT error message from the server. Look for:

**In app screen:**
```
Payment unavailable. Try Cash on Delivery.
```

**In console:**
```
[paymentsApi] Edge Function error: {
  message: "Amount mismatch: server calculated ₹1500.00, client sent ₹1499.99"
}
```

---

## Testing Checklist

Before reporting issue:

- [ ] User is logged in (check session in Account tab)
- [ ] Cart has items with valid product IDs
- [ ] Products exist in database
- [ ] Console shows `[paymentsApi]` logs
- [ ] Tried with ONE simple product (no variants)
- [ ] Checked Supabase Function logs for errors
- [ ] Verified Razorpay keys are TEST mode (not LIVE)
- [ ] App was refreshed after function deployment

---

## Need More Help?

**Share these details:**

1. **Console logs** from `[paymentsApi]`
2. **Exact error message** shown in app
3. **Cart state:** Number of items, total amount
4. **Edge Function logs** from Supabase dashboard
5. **Test case:** "Added Product X (₹1500), qty 1, tried to pay online"

**Example good bug report:**
```
Cart: 1 item (Product "Facial Cream" ₹1500, qty 1)
Total: ₹1500.00
Error in app: "Edge Function returned a non-2xx status code"
Console log: [paymentsApi] Edge Function error: { message: "Amount mismatch: server calculated ₹1500.00, client sent ₹1499.00" }
```

This tells me the exact problem: rounding mismatch!

---

## Next Test (After Reading This)

1. **Clear app cache/restart**
2. **Add ONE product to cart**
3. **Check console for `[paymentsApi]` logs**
4. **Try checkout → Pay Online**
5. **Copy the EXACT error message and share with me**

The detailed logs will show exactly what's failing! 🔍
