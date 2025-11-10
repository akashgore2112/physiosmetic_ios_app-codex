# SHOP End-to-End QA Checklist

**Version:** 1.0
**Date:** 2025-11-10
**Tester:** _______________
**Environment:** TEST (Razorpay TEST, Stripe TEST)

---

## Pre-Test Setup

- [ ] App installed on physical device or simulator
- [ ] Network connectivity available
- [ ] Test user account created and signed in
- [ ] Database migrations applied successfully
- [ ] Test coupons available (WELCOME10, FLAT50, SAVE20)

---

## 1. Product Catalog & Discovery

### 1.1 Shop Screen
- [ ] Products load and display correctly grouped by category
- [ ] Product images display properly (or show placeholder if missing)
- [ ] Product names, prices, and in-stock status visible
- [ ] **Search:** Enter product keyword → results filter correctly
- [ ] **Filters:** Toggle "In stock only" → out-of-stock products hidden
- [ ] **Price filters:** Select ₹0-999, ₹1k-1.9k, ₹2k+ → products filter correctly
- [ ] **Sort:** Test "Bestsellers", "Price (low→high)", "Newest" → order changes
- [ ] **Reset:** Tap "Reset" → all filters/sort reset to default
- [ ] **Pull-to-refresh:** Swipe down → loading indicator shown, catalog refreshes
- [ ] **Offline reconnect:** Go offline → go online → catalog auto-refreshes

### 1.2 Product Detail Screen
- [ ] Tap product card → Product detail screen opens
- [ ] Product image, name, description, price displayed correctly
- [ ] **Variants:** If product has variants, dropdown/picker shows options
- [ ] **Add to Cart:** Tap "Add to Cart" → Success toast shown
- [ ] **Add to Cart (with variant):** Select variant → Add → Item added with variant label
- [ ] **Quantity:** Increase/decrease quantity → Cart updated correctly
- [ ] **Out of stock:** If product out of stock → "Add to Cart" disabled

---

## 2. Shopping Cart

### 2.1 Cart Screen
- [ ] Navigate to Cart → All added items displayed
- [ ] Item name, variant label (if any), quantity, price shown
- [ ] **Increase quantity:** Tap "+" → Quantity increments, total updates
- [ ] **Decrease quantity:** Tap "-" → Quantity decrements, total updates
- [ ] **Remove item:** Tap "Remove" → Item removed from cart
- [ ] **Cart total:** Total price calculates correctly (sum of all items)
- [ ] **Empty cart:** Remove all items → "Your cart is empty" message shown

### 2.2 Cart Persistence (Offline Support)
- [ ] Add items to cart → Close app → Reopen app → Cart items still present
- [ ] Cart persists across app restarts

### 2.3 Price Reconciliation
- [ ] **Manual price change:** (Admin) Change product price in database
- [ ] Go offline in app → Go online → "Checking prices..." banner appears
- [ ] If price changed → Warning banner shows: "⚠️ Price Changes Detected"
- [ ] Banner lists items with old price → new price
- [ ] Banner message: "Cart prices are outdated. Server will use current prices at checkout."

---

## 3. Checkout Flow

### 3.1 Pre-Checkout
- [ ] Cart with items → Tap "Checkout" → Navigates to Checkout screen
- [ ] Not signed in → Prompted to sign in → Post-login, returns to checkout

### 3.2 Checkout Screen - Address & Delivery
- [ ] **Delivery toggle:** Default is delivery, pickup option available
- [ ] **Delivery selected:** Shipping address form displayed (Name, Phone, Address, City, State, Pincode, Country)
- [ ] **Pickup selected:** Shipping form hidden, shows "Free pickup" messaging
- [ ] Fill address → All fields validated (required fields checked)

### 3.3 Checkout Screen - Coupon Code
- [ ] **Apply coupon:** Enter "WELCOME10" → Tap "Apply" → Success message shown
- [ ] Coupon applied → Green banner shows: "WELCOME10" with discount details
- [ ] **Discount calculation:** Verify discount applied correctly (10% off, max ₹100)
- [ ] **Remove coupon:** Tap "Remove" → Coupon removed, totals recalculated
- [ ] **Invalid coupon:** Enter "INVALID123" → Error message: "Coupon not found or expired"
- [ ] **Minimum order:** Cart < ₹500 → Apply "WELCOME10" → Error: "Minimum order amount is ₹500"
- [ ] **Expired coupon:** (Admin) Set coupon expiry to past → Apply → Error: "Coupon expired"

### 3.4 Checkout Screen - Order Summary (TotalsCard)
- [ ] **Subtotal:** Matches sum of cart item prices
- [ ] **Discount:** Shows coupon discount amount (if applied)
- [ ] **Tax (10%):** Calculated as 10% of (Subtotal - Discount)
- [ ] **Shipping:** ₹50 for delivery, ₹0 (FREE) for pickup
- [ ] **Total:** Subtotal - Discount + Tax + Shipping = correct final total

### 3.5 Payment Method Selection
- [ ] Three payment options displayed: Cash on Delivery, Razorpay (Test), Stripe (Test)
- [ ] Select payment method → Highlight changes to selected option

---

## 4. Payment Processing

### 4.1 Cash on Delivery (COD)
- [ ] Select "Cash on Delivery" → Tap "Place Order"
- [ ] Loading indicator shown → Success message: "Order placed!"
- [ ] Navigate to "My Orders" → New order visible with status "Pending"
- [ ] Order shows: Payment Method = COD, Payment Status = Pending

### 4.2 Razorpay (TEST Mode)
- [ ] Select "Razorpay (Test)" → Tap "Proceed to Payment"
- [ ] Razorpay WebView opens with test checkout
- [ ] **Test card:** 4111 1111 1111 1111, CVV: 123, Expiry: Any future date
- [ ] Enter card details → Submit payment → Success callback
- [ ] Order placed → Success message shown
- [ ] Navigate to "My Orders" → Order status "Paid", Payment Method = Razorpay
- [ ] Order details show: Gateway Payment ID populated

### 4.3 Stripe (TEST Mode)
- [ ] Select "Stripe (Test)" → Tap "Proceed to Payment"
- [ ] Stripe PaymentSheet opens
- [ ] **Test card:** 4242 4242 4242 4242, CVV: Any 3 digits, Expiry: Any future date
- [ ] Enter card details → Submit → Payment succeeds
- [ ] Order placed → Success message shown
- [ ] Navigate to "My Orders" → Order status "Paid", Payment Method = Stripe
- [ ] Order details show: Gateway Payment ID = "stripe_payment"

### 4.4 Payment Failure Handling
- [ ] **Razorpay failure:** Simulate payment failure → Error message shown, order not created
- [ ] **Stripe failure:** Cancel PaymentSheet → No order created, user remains on checkout

### 4.5 Idempotency (Duplicate Prevention)
- [ ] Place order with Razorpay → Immediately retry same payment → Only 1 order created (idempotency key prevents duplicates)

---

## 5. Order Management

### 5.1 My Orders Screen
- [ ] Navigate to Account → "Orders" → Orders list loads
- [ ] Each order card shows:
  - [ ] Order number (last 6 chars of ID)
  - [ ] Created date
  - [ ] Total amount
  - [ ] Status pill (color-coded: green=Delivered, red=Cancelled, blue=Shipped, orange=Pending/Processing)
  - [ ] Payment method badge (Razorpay, Stripe, COD)
  - [ ] Discount saved message (if coupon used): "💰 Saved ₹X with CODE"
- [ ] **Pull-to-refresh:** Swipe down → Orders refresh
- [ ] **Realtime updates:** (Admin) Update order status in DB → Status pill updates automatically without refresh
- [ ] **Reorder:** Tap "Reorder" button → Items added to cart, navigate to cart
- [ ] **Cancel order:** Tap "Cancel" → Confirmation prompt → Order status changes to "Cancelled"
- [ ] **Empty state:** No orders → "No orders yet" message shown

### 5.2 Order Detail Screen
- [ ] Tap order card → Order detail screen opens
- [ ] **Header:** Order number, status pill displayed
- [ ] **Payment Information:**
  - [ ] Payment method (COD, Razorpay, Stripe)
  - [ ] Payment status badge (Paid, Pending, Failed, Refunded) - color-coded
  - [ ] Transaction ID (if available)
- [ ] **Delivery/Pickup Details:**
  - [ ] If delivery: Full shipping address (Name, Phone, Line1, Line2, City, State, Pincode)
  - [ ] If pickup: "✓ Store Pickup" message
- [ ] **Order Items:**
  - [ ] Each item shows: Product name, Variant label (if any), Quantity, Price per item, Total price
- [ ] **Totals Breakdown (TotalsCard):**
  - [ ] Subtotal
  - [ ] Discount (with coupon code if applied)
  - [ ] Tax (10%)
  - [ ] Shipping (₹50 or FREE if pickup)
  - [ ] Total
- [ ] **Cancel button:** If order status = "Pending" or "Placed" → "Cancel Order" button shown
- [ ] Tap "Cancel Order" → Confirmation alert → Order cancelled, status updates

---

## 6. Security & Server-Side Validation

### 6.1 Server-Side Pricing
- [ ] **Client price manipulation:** (Dev tools) Modify cart item price in client → Place order → Server uses DB prices, ignores client
- [ ] **RPC validation:** Verify order_items table has RLS blocking direct INSERT → Only `place_order` RPC can insert
- [ ] **Stock validation:** (Admin) Set product stock to 0 → Try to order → Error: "Product out of stock"

### 6.2 Coupon Validation
- [ ] **Server-side discount:** Apply coupon → Verify discount calculated server-side, not client-side
- [ ] **Usage limit:** (Admin) Set coupon usage_limit = 1 → Use coupon → Try to use again → Error: "Coupon usage limit exceeded"
- [ ] **Date validation:** (Admin) Set coupon valid_until to past date → Try to apply → Error: "Coupon expired"

---

## 7. Offline Support & Reconnection

### 7.1 Offline Behavior
- [ ] Go offline (airplane mode) → Offline banner appears at top
- [ ] Cart still accessible (persisted via AsyncStorage)
- [ ] Add items to cart offline → Items saved locally
- [ ] Try to checkout offline → Error or graceful message

### 7.2 Reconnection
- [ ] Go online → Offline banner disappears
- [ ] ShopScreen auto-refreshes catalog data
- [ ] CartScreen reconciles prices (checks server for updates)
- [ ] MyOrdersScreen auto-retries if had error before

---

## 8. Deeplinks

### 8.1 Product Deeplink
- [ ] **URL:** `physiosmetic://shop/<product_id>`
- [ ] Open URL → App navigates to Product Detail screen for that product
- [ ] Product details load correctly

### 8.2 Cart Deeplink
- [ ] **URL:** `physiosmetic://cart`
- [ ] Open URL → App navigates to Cart screen
- [ ] Cart items display correctly

---

## 9. Edge Cases & Error Handling

### 9.1 Network Errors
- [ ] **Poor connection:** Simulate slow network → Loading states shown, eventual timeout or error message
- [ ] **Request retry:** If request fails → User can retry via pull-to-refresh or retry button

### 9.2 Empty States
- [ ] Empty cart → "Your cart is empty" message
- [ ] No orders → "No orders yet" message
- [ ] No search results → "No products found" message

### 9.3 Invalid Data
- [ ] **Missing product:** Deeplink to non-existent product ID → Graceful error: "Product not found"
- [ ] **Missing order:** Try to view order that doesn't exist → Error: "Order not found"

---

## 10. Performance & UX

### 10.1 Loading States
- [ ] Product loading → Skeleton or ActivityIndicator shown
- [ ] Orders loading → ActivityIndicator shown
- [ ] Price reconciliation → "Checking prices..." banner with spinner

### 10.2 Responsiveness
- [ ] All buttons respond immediately to taps (no double-tap issues)
- [ ] Scrolling is smooth (FlatList optimization working)
- [ ] No UI freezes during network requests

---

## 11. Final End-to-End Test

**Complete User Journey:**
1. [ ] Open app → Browse products → Search for "massage"
2. [ ] Filter by price ₹1k-1.9k → Select product with variant
3. [ ] Add 2 quantities to cart → Navigate to cart
4. [ ] Increase quantity to 3 → Verify total updates
5. [ ] Tap "Checkout" → Sign in if needed
6. [ ] Select "Delivery" → Fill address form
7. [ ] Enter coupon "WELCOME10" → Apply → Verify discount shown
8. [ ] Select Razorpay → Proceed to payment
9. [ ] Use test card 4111 1111 1111 1111 → Complete payment
10. [ ] Order placed → Navigate to "My Orders"
11. [ ] Verify new order shows: Paid status, Razorpay badge, discount saved
12. [ ] Tap order → Order detail screen shows complete breakdown
13. [ ] Verify TotalsCard matches expected values
14. [ ] Go offline → Go online → Price reconciliation runs
15. [ ] Reorder same items → Items added to cart
16. [ ] Close app → Reopen → Cart items still present

---

## Sign-Off

**Tester Signature:** _______________
**Date:** _______________
**Result:** ☐ PASS  ☐ FAIL
**Critical Issues Found:** _______________
**Notes:** _______________

---

**END OF CHECKLIST**
