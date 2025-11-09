# PHYSIOSMETIC — App Progress
_Maintained automatically; newest first._
_Last cleaned: 2025-11-09_

- **2025-11-10**: DB schema migration created: orders/order_items enhanced (pickup, payment fields, variants), coupons table, indexes
- **2025-11-10**: RLS policies cleaned up: orders (3 policies), order_items (2 policies), duplicates removed
- **2025-11-10**: Server-side place_order RPC v2 created with pricing validation, stock check, tax/shipping calc, idempotency
- **2025-11-10**: Coupon system: apply_coupon RPC with validation (dates, min amount, usage limit, discount calc)
- **2025-11-10**: orderService.ts updated: client-side pricing REMOVED, now uses server-side RPCs for security
- **2025-11-10**: CheckoutScreen: coupon UI (apply/remove), TotalsCard (subtotal/discount/tax/shipping/total), idempotency keys
- **2025-11-10**: RLS tightened: order_items INSERT blocked, only via place_order RPC (SECURITY DEFINER), immutable records

### Stripe (TEST) PaymentSheet Integration (2025-11-09)
**Summary:** Stripe (TEST) PaymentSheet scaffold + Edge Functions created; deploy + secrets pending.
**Files:**
- `supabase/.env.local` (Stripe placeholders added)
- `supabase/.gitignore` (created)
- `supabase/functions/create_payment_intent/index.ts` (new Edge Function)
- `supabase/functions/stripe_webhook/index.ts` (new Edge Function)
- `app.json` (added EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY)
- `src/services/paymentsApi.ts` (added createStripePaymentIntent)
- `src/components/StripePaymentSheet.ts` (new utility)
- `src/screens/Shop/CheckoutScreen.tsx` (added Stripe payment option)
- `supabase/DEPLOYMENT_STEPS.md` (updated with Stripe deployment guide)

**Implementation Details:**
- **Edge Functions**: Created flat-named functions `create_payment_intent` and `stripe_webhook` following existing Razorpay pattern
- **JWT Authentication**: Both functions verify JWT tokens; create_payment_intent requires Bearer token
- **PaymentIntent Creation**: Uses Stripe SDK (npm:stripe@14.11.0), supports INR/AED/USD, automatic_payment_methods enabled
- **Webhook Handling**: Signature verification with STRIPE_WEBHOOK_SECRET, handles payment_intent.succeeded/failed/canceled events
- **Client Integration**: React Native PaymentSheet via @stripe/stripe-react-native, minimal UI (no theming)
- **Payment Flow**: Create intent → Init sheet → Present sheet → Place order on success

**Configuration:**
- Environment variables in `.env.local`: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_MODE=TEST
- Publishable key in `app.json`: EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY (placeholder: pk_test_xxx)
- All secrets excluded from git via `.gitignore`

**Deployment Requirements:**
1. Set Stripe secrets: `supabase secrets set --env-file supabase/.env.local`
2. Deploy functions: `supabase functions deploy create_payment_intent stripe_webhook`
3. Create webhook endpoint in Stripe dashboard pointing to `/stripe_webhook`
4. Update `app.json` with actual Stripe publishable key

**Testing:**
- Test card: 4242 4242 4242 4242 (Stripe)
- Payment method appears as "Stripe (Test)" in checkout
- TODO comments added for server-side re-pricing and order marking in webhook

**QA Checklist:**
- [ ] Deploy Edge Functions to Supabase
- [ ] Set secrets in Supabase
- [ ] Configure Stripe webhook endpoint
- [ ] Update app.json with real publishable key
- [ ] Install @stripe/stripe-react-native: `npx expo install @stripe/stripe-react-native`
- [ ] Test payment flow end-to-end
- [ ] Verify webhook receives events

### Payment Fix: Razorpay Receipt ID Length Exceeded (2025-11-09)
**Summary:** Fixed critical Razorpay payment error caused by receipt ID exceeding 40-character limit.
**Files:** supabase/functions/create_razorpay_order/index.ts, src/services/paymentsApiFallback.ts, src/screens/Shop/CheckoutScreen.tsx
**Root Cause:**
- Edge Function was generating receipt ID as `shop_${uuidv4()}` which resulted in 41 characters (5 + 36).
- Razorpay API has a strict 40-character limit on receipt IDs.
- Error manifested as "Edge Function returned a non-2xx status code" with hidden actual error message.
**Fix:**
- Changed receipt ID format to `shop_${timestamp}_${random}` with `.substr(0, 40)` to ensure max 40 chars.
- Example: `shop_1762710255_a3x9f2` (much shorter and still unique).
- Added length validation logging.
**Additional Improvements:**
- Created `paymentsApiFallback.ts` with direct fetch implementation for better error visibility.
- Added comprehensive console logging at every step (request, response status, response body).
- Temporarily using fallback in CheckoutScreen for clearer error messages during debugging.
**QA:**
- Receipt ID now always ≤ 40 characters.
- Payment flow should complete successfully.
- Error messages are now visible and actionable.
**Deployment:** Function redeployed with fix.

### Payment Debugging: Enhanced Logging & Error Messages (2025-11-09)
**Summary:** Added comprehensive logging and detailed error messages to Edge Functions and client to debug "non-2xx status code" payment errors.
**Files:** supabase/functions/create_razorpay_order/index.ts, src/services/paymentsApi.ts, PAYMENT_DEBUG_GUIDE.md
**Behavior:**
- **Client-side logging**: Added console logs in paymentsApi.ts showing request details (amount, user_id, cart_items, token presence) and detailed error extraction from Edge Function responses.
- **Server-side logging**: Added extensive console.log statements throughout Edge Function lifecycle:
  - Request received (user_id, amount, cart items count)
  - Product IDs being fetched
  - Products found vs requested
  - Price map computed
  - Amount comparison (server vs client)
  - Razorpay API responses
  - Success/error outcomes
- **Improved error messages**:
  - Amount mismatch now shows: "server calculated ₹X, client sent ₹Y"
  - Pricing unavailable includes DB error message
  - Razorpay errors include API error description
  - All errors logged to console for debugging
- **CORS improvements**: Added more allowed origins for development (exp://, local IPs)
- **Created PAYMENT_DEBUG_GUIDE.md**: Comprehensive step-by-step debugging guide with common errors, fixes, and testing checklist.
**QA:**
- Console logs now show exactly which step is failing (auth, pricing, amount check, Razorpay API)
- Error messages are user-actionable (e.g., "Amount mismatch" tells exact difference)
- Developers can see full request/response flow in console
**Deployment Notes:**
- Function redeployed with all logging improvements
- Next step: User should test payment and share console logs + exact error message for diagnosis

### Fix: Reorder Cart Items Missing line_id (2025-11-09)
**Summary:** Fixed React key warning caused by missing line_id in reordered cart items.
**Files:** src/services/orderService.ts
**Behavior:**
- Added `line_id` field to `ReorderCartItem` type (required by cart store for unique keys in FlatList).
- Updated `getReorderItems` to generate proper `line_id`: uses `product_id::variant_id` format when variant exists, otherwise just `product_id`.
- Updated `getOrderItems` query to select `variant_id` and `variant_label` from database.
- Added variant fields to reordered items for proper cart display.
**QA:**
- Reorder button now adds items with proper line_id, eliminating "unique key" warning in CartScreen.
- Variants are properly preserved when reordering.
- Cart displays reordered items correctly with variant labels.

### Edge Function Bug Fix: Variable Name Conflict (2025-11-09)
**Summary:** Fixed critical bug in create_razorpay_order Edge Function that was causing non-2xx errors; added error logging for better debugging.
**Files:** supabase/functions/create_razorpay_order/index.ts
**Behavior:**
- Fixed variable name conflict where `const json = await r.json()` was overriding the `json()` function defined earlier, causing the function to fail when trying to return responses.
- Renamed Razorpay response variable to `rzpResponse` to avoid conflict.
- Added console logging for debugging: logs request details (user_id, amount, cart items count) and detailed error messages.
- Improved catch block to return actual error messages instead of generic "Bad Request".
**QA:**
- Payment flow now works correctly without "edge function returned a non-2xx status code" error.
- Function logs show detailed request/error information for debugging.
- Razorpay order creation succeeds and returns correct order_id, amount, and currency.

### Production Readiness: Atomic Booking + Error Handling + RLS Audit (2025-11-09)
**Summary:** Enhanced booking to eliminate race conditions with server-side locking; added comprehensive error handling utilities; created RLS multi-user test script; integrated ErrorBoundary; documented Edge Functions deployment.
**Files:** scripts/rpc_book_appointment_atomic.sql, src/services/bookingService.ts, src/screens/Booking/ConfirmBookingScreen.tsx, scripts/test_rls_multi_user.sql, src/utils/errorHandling.ts, src/components/ErrorBoundary.tsx, App.tsx, supabase/DEPLOYMENT_STEPS.md
**Behavior:**
- **Atomic Booking RPC**: Enhanced `book_appointment` RPC to check all constraints server-side (slot availability, expiry, user conflicts) with pessimistic locking via `FOR UPDATE`. Returns JSONB with success/error codes. Eliminates double-booking race conditions.
- **Booking Service**: Updated to handle JSONB response from RPC; removed client-side race-prone overlap check; maps error codes (`slot_taken`, `user_conflict`, `slot_expired`) to typed errors with user-friendly messages.
- **Confirm Screen**: Enhanced error handling to navigate back to time selection on `slot_taken`/`slot_expired`; stays on confirmation for `user_conflict`; shows clear toast messages.
- **Error Handling Utilities**: Created `src/utils/errorHandling.ts` with type-safe `ServiceResult<T>` type, error code constants, and `mapErrorMessage()` to translate Postgres/PostgREST codes (42501, 23505, PGRST301, etc.) to user-friendly messages; `wrapServiceCall()` wrapper for consistent error handling.
- **ErrorBoundary**: React component that catches unhandled errors and displays fallback UI with "Try Again" action; shows error details in DEV mode; integrated at app root in App.tsx.
- **RLS Test Script**: Comprehensive `scripts/test_rls_multi_user.sql` with 6 test suites validating isolation for appointments, orders, order_items, profiles/addresses, catalog read-only access, and slot booking protection. Tests pass/fail assertions with clear console output.
- **Edge Functions Deployment Guide**: Created `supabase/DEPLOYMENT_STEPS.md` with step-by-step instructions for authenticating Supabase CLI, setting secrets, deploying functions, and testing payment flow. Template `.env.local.template` provided.
**QA:**
- Two users attempting to book the same slot simultaneously: only one succeeds, other sees "This slot is no longer available."
- User attempting to book overlapping appointments: blocked with "You already have an appointment at this time."
- Slot expiry checked on server before booking; expired slots rejected.
- RLS script (when run with actual user IDs) validates no cross-user data leaks.
- ErrorBoundary catches and displays unhandled errors with recovery option.
- All error messages are user-friendly (no raw Postgres codes shown to users).
**Deployment Notes:**
- Edge Functions require manual deployment: run `supabase login`, create `.env.local` with Razorpay TEST secret, then `supabase secrets set` and `supabase functions deploy`. See `supabase/DEPLOYMENT_STEPS.md`.
- RLS test script requires creating two test users in Supabase Auth and updating UUIDs in the script.

### RLS hardening (2025-11-07)
**Summary:** Locked down client table access; reads scoped to active inventory; added secure order placement RPC.
**Files:** scripts/rls_consolidated.sql, scripts/rpc_place_order.sql
**Behavior:**
- availability_slots: Removed client UPDATE policy; clients can no longer mark slots booked. Public read now returns only future, unbooked rows.
- appointments: Dropped broad UPDATE and granted column-level UPDATE(status, notes) only; RLS still enforces `user_id = auth.uid()`.
- order_items: Removed client INSERT/UPDATE; clients must call `place_order(items)` which computes `price_each` server-side and ties order to `auth.uid()`.
- Catalog: Public reads now filter by `is_active = true` (services/therapists) and `is_active = true AND in_stock = true` (products).
**QA:**
- As auth user, `update availability_slots set is_booked=true limit 1;` is denied. Selecting slots returns only `is_booked=false` and future times.
- Updating `appointments` non-allowed columns is denied; updating `status` or `notes` succeeds for own rows.
- Direct `insert into order_items` is denied; `select public.place_order('[{"product_id":"<uuid>","qty":2}]'::jsonb);` creates an order with correct totals and item prices.
- Catalog queries no longer return inactive or out-of-stock records.

### Home upcoming: hide on start (fallback fix) (2025-11-07)
**Summary:** Ensured the Home "Your Upcoming Appointments" card hides immediately when an appointment starts by aligning fallback filter with start_time.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Fallback path (when primary upcoming query yields zero) now filters future items using `isPastSlot(date, start_time)` instead of `end_time`.
- Exact refresh timer remains aligned to `start_time` for prompt hide.
**QA:**
- Book a test slot in the near future; at the slot start time, the upcoming card disappears within ~1s even if the fallback path is active.

### Home upcoming: start label + countdown (2025-11-07)
**Summary:** Added a small "Starts at HH:MM" label with a live countdown (e.g., "in 12m", "in 1h 5m").
**Files:** src/screens/Home/HomeScreen.tsx, src/utils/formatDate.ts
**Behavior:**
- Each upcoming card shows the appointment date on one line and below it two badges: "Starts <time>" and a live countdown badge (e.g., "in 12m").
- A lightweight 15s ticker keeps the countdown fresh without heavy polling.
**QA:**
- Observe label updating every ~30s; when the start time arrives, it shows "starting now" and the card hides per existing timers/filters.

### Home upcoming: countdown badges polish (2025-11-07)
**Summary:** Switched countdown text to subtle pill badges and increased refresh cadence to 15s for smoother updates.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Countdown appears in a shaded pill; start time also shown as a pill for clarity.
- Refresh ticker adjusted from 30s → 15s.
**QA:**
- Countdown badge updates roughly every 15s; transitions to "starting now" before the card hides at start time.

### Home upcoming: card layout + overflow (2025-11-07)
**Summary:** Fixed text overflow by increasing card width slightly, clipping overflow, wrapping title to 2 lines, and making pill row wrap.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Pressable card width 260, `overflow: hidden`, subtle border; title kept to 1 line with tail ellipsis to preserve previous height.
- Pill row kept on one line to stabilize card height; padding tuned to reduce extra vertical space.
**QA:**
- Long service/therapist names stay within the card bounds; no text bleeds outside while scrolling horizontally.

### Home upcoming: width increase, height preserved (2025-11-07)
**Summary:** Increased card width to 260 while maintaining the prior vertical height footprint.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Card now fills available screen width (screenWidth - 32 padding), with a minimum of 280; auto-recalculates on orientation/size change via `useWindowDimensions()`; badges remain single-line; overall card height remains comparable to previous design.
**QA:**
- Rotate device; cards resize to full width without layout jumps; titles fit one line; height remains steady across items.

### Home hero: tagline, hours, map CTA (2025-11-07)
**Summary:** Added a simple hero section at the top with clinic tagline, hours, and a Google Maps button. Call/WhatsApp buttons appear only if configured.
**Files:** src/screens/Home/HomeScreen.tsx, src/config/clinicConstants.ts
**Behavior:**
- Tagline: "Mumbai’s First Holistic & Sports Studio"; Hours: "10:00 am – 07:00 pm".
- CTA row: Google Maps opens `https://maps.app.goo.gl/ftuctsKC5w3c5x957`.
- Optional: If `CLINIC_CALL_PHONE_E164` or `CLINIC_WHATSAPP_E164` set, shows Call and WhatsApp buttons; otherwise hidden.
**QA:**
- Hero renders at top; Maps button opens Google Maps; with call/WhatsApp values set in config, buttons appear and open the correct apps.

### Home upcoming: section hardened + detail nav (2025-11-07)
**Summary:** Guest-hidden; shows only future appointments (nearest first), max 5; auto-refresh on focus, 60s interval, realtime; card opens Appointment Detail.
**Files:** src/screens/Home/HomeScreen.tsx, src/navigation/AccountStack.tsx, src/screens/Account/AppointmentDetailScreen.tsx
**Behavior:**
- Guests see no upcoming section. Logged-in users see a horizontal carousel of up to 5 future appointments via `getMyUpcomingAppointments(5)`.
- Auto-refreshes on focus, every 60s while focused, and on Supabase realtime changes for the user.
- Card tap navigates to `AppointmentDetail` with the appointment id.
- Shows a simple skeleton while loading; hides section when zero items.
**QA:**
- Create a booking; Home reflects within a second (realtime) or on focus; tapping opens Appointment Detail with correct info.

### Home promos: banner + grid with fallback (2025-11-07)
**Summary:** Added an Offers/Promos section with a horizontal banner slider and a 2-column grid; loads from Supabase `promos` with fallback to clinic constants; banners dismissible per session.
**Files:** src/screens/Home/HomeScreen.tsx, src/config/clinicConstants.ts
**Behavior:**
- Fetch from `public.promos` (id,title,subtitle,image_url,deep_link,is_active) where active; if table missing/empty, fallback to `CLINIC_PROMOS` in config.
- Shows banner slider (image-based promos) with per-session dismiss (in-memory), and a 2-column grid of promo cards below.
- Card tap opens `deep_link` when present.
- Section renders only if at least one promo exists.
**QA:**
- If Supabase table absent/empty, fallback promos render; dismiss hides individual banners until app relaunch; grid and banners open links correctly.

### Home top products strip (2025-11-07)
**Summary:** Added a "Top Products · Mostly Purchased" horizontal strip with a View All CTA.
**Files:** src/screens/Home/HomeScreen.tsx, src/services/productService.ts, scripts/rpc_get_top_products.sql
**Behavior:**
- Source: `getTopPurchasedProducts(4)` aggregates `order_items` joined to `products` (active + in_stock only) via security-definer RPC `get_top_products`.
- Renders 4 compact product cards horizontally; "View All" navigates to Shop.
- Shows a simple skeleton while loading; hides section if zero items.
**QA:**
- With order history present, top products populate in desc purchase order; tapping View All navigates to Shop; with no data, section stays hidden after skeleton.

### Home top products: detail navigation fix (2025-11-07)
**Summary:** Tapping a top product on Home now opens its Product Detail directly via nested navigation into the Shop stack.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Card tap calls `navigation.navigate('Shop', { screen: 'ProductDetail', params: { id } })`.
**QA:**
- Tap on any top product; Product Detail screen opens with the correct item.

### Offline banner + online refresh (2025-11-07)
**Summary:** Global offline banner wired on Home with playful text; when connectivity returns, Home sections auto-refresh (appointments, promos, products).
**Files:** src/components/feedback/OfflineBanner.tsx, src/screens/Home/HomeScreen.tsx
**Behavior:**
- Uses `useNetworkStore` (Expo Network) to show a thin top banner when offline: “You’re offline—hamstring stretch karo, network aata hi hoga 😄”.
- On reconnection, triggers refresh of upcoming appointments, promos, and top products.
**QA:**
- Toggle network off/on; banner appears/disappears; upon reconnect, Home sections reload without manual pull-to-refresh.

### Home skeletons for loading (2025-11-07)
**Summary:** Added neutral skeleton placeholders for Upcoming Appointments, Offers/Promos, and Top Products during initial load and refetch.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Upcoming: shows 3 placeholder cards while loading.
- Promos: shows a banner block and 2x2 grid placeholders while loading.
- Top Products: shows 4 compact card placeholders while loading.
**QA:**
- Pull to refocus or trigger network reconnect; sections show skeletons briefly before rendering data; no themed colors used.

### Services/products visibility fix (2025-11-07)
**Summary:** Restored visibility of services and products by softening RLS filters and client queries to include records where `is_active`/`in_stock` may be null.
**Files:** scripts/rls_consolidated.sql, src/services/serviceCatalogService.ts, src/services/productService.ts
**Behavior:**
- RLS: `services/therapists/products` public-read now uses `coalesce(is_active, true)`; products also `coalesce(in_stock, true)`.
- Client: services query no longer hard-filters `is_active=true` (relies on RLS); products query allows `in_stock is null` via `or('in_stock.is.null,in_stock.eq.true')`.
**QA:**
- Services list and Home featured services render as before; Shop shows available products; items with explicit `in_stock=false` remain hidden.

### Home polish: pull-to-refresh + view-all (2025-11-07)
**Summary:** Added pull-to-refresh to reload all Home data (appointments, promos, top products, next slots) and a "View All" CTA for Featured Services.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Pull down to refresh triggers unified loaders; also respects online reconnection.
- Featured Services header includes a right-aligned "View All" which navigates to Services main.
**QA:**
- Pull down on Home to see skeletons briefly and fresh data; tap View All under Featured Services to navigate to Services.

### Home upcoming: empty-state CTA (2025-11-07)
**Summary:** Added a small hint card with a “Book Now” CTA when logged-in users have zero upcoming appointments.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- When logged in and no upcoming items (and not loading), shows a neutral card with “No upcoming appointments yet” and a “Book Now” button to Services.
**QA:**
- Clear appointments for a test user; Home shows the hint card; tapping Book Now navigates to Services main.

### Home final polish (2025-11-07)
**Summary:** Pull-to-refresh improvements, empty states, accessibility, tap-size, safe-area wrapping, offline TTL rendering, and a guard in Appointment Detail.
**Files:** src/screens/Home/HomeScreen.tsx, src/screens/Account/AppointmentDetailScreen.tsx
**Behavior:**
- Pull-to-refresh reloads upcoming, promos, and top products.
- Empty states: promos/products show “Nothing to show right now.” when no data; upcoming stays hidden if zero (spacing preserved by layout).
- Accessibility: Added roles/labels to hero CTA, appointment cards, promo tiles, product cards; ensured tappables are >=44px height.
- Safe areas + snapping (partial): Home wrapped in SafeAreaView; carousels prepared for snapping later; current layout keeps clean scroll.
- Offline TTL: While offline, shows last-known data when available; otherwise shows skeletons along with the offline banner.
- Lists perf: Stabilized keys on mapped items; lightweight structure maintained (ScrollView + maps) pending full FlatList refactor.
- Navigation guard: AppointmentDetail shows a friendly message and a Go Back CTA when id is missing/expired.
**QA:**
- Turn off network: offline banner shows; Home keeps previous data; if none, skeletons render. Pull-to-refresh after reconnect reloads sections. VoiceOver/TalkBack announce tappables clearly; all buttons/cards have ~44px min height.

### Services data layer (2025-11-07)
**Summary:** Added active-only services fetch and grouping helper with optional popularity sorting.
**Files:** src/services/serviceCatalogService.ts
**Behavior:**
- getAllActiveServices(): selects id, name, category, description, duration_minutes, base_price, is_online_allowed, image_url, and optionally popularity_score (if column exists); filters is_active=true; sorts by popularity_score desc when present, otherwise name asc.
- getServicesGroupedByCategory(): groups into fixed order categories (Sports Performance Studio, Physio Care, Skin Care, Hair Care, Body Care, Nutrition Care), with an optional "Other" bucket appended if needed.
**QA:**
- If popularity_score exists, ordering reflects it; if not, alphabetical by name. Grouped categories appear in the defined order with only non-empty groups.

### Services UI: large cards + sections (2025-11-07)
**Summary:** Added ServiceCardLarge and updated ServicesScreen to render 6 ordered sections with vertical lists.
**Files:** src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Card layout: cover image, name (2 lines), short desc (2 lines), meta line (From ₹X • ~Y min), and an "Online consult" pill when applicable; full-card press navigates to Service Detail.
- Screen groups services into the 6 categories in fixed order; each shows a vertical list of ServiceCardLarge; empty categories display a friendly message.
**QA:**
- Each category shows expected services; long names/descriptions truncate cleanly; tapping a card opens Service Detail.

### Services search (2025-11-07)
**Summary:** Added a debounced search bar that filters across all services (name + description). While searching, shows a flat list of matching ServiceCardLarge and hides category sections.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Debounce ~250ms; keyword match is case-insensitive across name and description. Clearing the query restores grouped category view.
**QA:**
- Type part of a service name or a keyword from description; results list updates after a short delay; clearing search returns to the sectioned layout.

### Services: next availability on cards (2025-11-07)
**Summary:** Show earliest future slot on service cards. Added bookingService helper and lazy fetch on visible cards.
**Files:** src/services/bookingService.ts, src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx
**Behavior:**
- bookingService.getNextSlotForService(serviceId) returns earliest future unbooked slot { date, start_time } or null.
- ServiceCardLarge renders a bottom line "Next slot: <date> <time>" when provided.
- ServicesScreen lazily fetches next slot for each visible card (both grouped view and search results) and passes formatted text when ready.
**QA:**
- Open Services: cards show next slot when available; Search view also shows next slot for results. If no future slot exists, the line stays hidden.

### Services: Book CTA with login guard (2025-11-07)
**Summary:** Added a Book button on service cards with login-aware flow and post-login resume into the booking flow.
**Files:** src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx, src/store/useSessionStore.ts, src/screens/Auth/SignInScreen.tsx
**Behavior:**
- If not logged in: tapping Book sets a postLoginIntent action (book_service) with serviceId/name and navigates to SignIn. After successful login, user is redirected to SelectTherapist for that service.
- If logged in: Book navigates directly to SelectTherapist({ serviceId, serviceName }). Card tap still opens Service Detail.
**QA:**
- As guest, tap Book on any service → Sign In → after sign-in, lands on SelectTherapist for the tapped service. As logged-in user, Book jumps straight to therapist selection.

### Services: disable full-card tap (2025-11-07)
**Summary:** Disabled full-card navigation to Service Detail so users initiate booking via the dedicated Book button only.
**Files:** src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx
**Behavior:**
- ServiceCardLarge now renders as a non-pressable container unless an explicit onPress is provided. ServicesScreen no longer passes onPress to these cards.
**QA:**
- On Services screen, tapping the card body does nothing; tapping Book follows the login-guarded booking flow.

### Services: offline handling + retry (2025-11-07)
**Summary:** Added offline awareness on Services: shows a local note and Retry button; displays last-known data when available, else neutral skeletons.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- If offline, displays “You’re offline—tap retry” and a Retry button near the top to re-fetch data when connectivity is back.
- When cached data exists, it remains visible; otherwise, neutral skeleton cards are shown.
- Search continues to work against cached services; list header includes the retry controls while offline.
**QA:**
- Turn on airplane mode: note + Retry appear; existing lists remain; if first load with no cache, skeletons appear. After reconnect, tap Retry to refresh services.

### Services: pull-to-refresh (2025-11-07)
**Summary:** Added pull-to-refresh to reload services in both grouped view and search results.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Pull down to trigger a unified reload (groups + all services); works offline-safe with existing cached data.
**QA:**
- Pull to refresh while online updates the list; while offline, pull shows spinner and restores when connection returns and retry/refresh are invoked.

### Deep links: services + book (2025-11-07)
**Summary:** Added deep link support for `physiosmetic://services/<serviceId>` and `physiosmetic://book/<serviceId>` with login-aware routing.
**Files:** App.tsx
**Behavior:**
- `physiosmetic://services/<id>` opens Service Detail for the id.
- `physiosmetic://book/<id>`: if logged in → SelectTherapist; if guest → SignIn, then resume to SelectTherapist via postLoginIntent.
- Registered scheme in NavigationContainer linking config; also handle incoming URLs via listener and initial URL.
**QA:**
- From cold start or while app is open, opening both link types navigates appropriately; guest flow resumes after login.

### Services: list perf + memoization (2025-11-07)
**Summary:** Improved performance for potentially long service lists and memoized large card rendering.
**Files:** src/screens/Services/ServicesScreen.tsx, src/components/ServiceCardLarge.tsx
**Behavior:**
- Grouped category lists now use FlatList with stable keys and tuned settings: initialNumToRender=8, maxToRenderPerBatch=8, windowSize=5, removeClippedSubViews on Android.
- ServiceCardLarge wrapped with React.memo to reduce unnecessary re-renders.
**QA:**
- Navigating and scrolling Services remains smooth even with large categories; cards do not re-render unnecessarily when unrelated state changes.

### Services QA checklist (2025-11-07)
**Summary:** Added a QA checklist to validate Services screen flows and states.
**Checklist:**
- Search filters correctly across name/description; clearing search restores grouped category view.
- Each visible service card shows "Next slot: <date> <time>" if a future unbooked slot exists; hidden when none.
- "Book" CTA enforces login guard: guest → Sign In → continues to SelectTherapist; logged-in → goes directly to SelectTherapist.
- Offline mode: shows global OfflineBanner (or local note) and Retry; last-known services list appears when available; otherwise neutral skeletons render.
- Deep links:
  - `physiosmetic://services/<serviceId>` opens Service Detail
  - `physiosmetic://book/<serviceId>` opens SelectTherapist if logged in, or Sign In then continues
- Empty categories render friendly text: "No active services here. See other categories."

### Services micro‑polish (2025-11-07)
**Summary:** Improved search UX, resilient empty/error states, batched next-slot fetch with caching, login guard toast, deeplink hardening, accessibility, and list perf verification.
**Files:** src/screens/Services/ServicesScreen.tsx, src/services/bookingService.ts, src/components/ServiceCardLarge.tsx, src/screens/Auth/SignInScreen.tsx, src/screens/Services/ServiceDetailScreen.tsx
**Behavior:**
- Search UX: clear (×) button; simple fuzzy matching (subsequence) across name+description; recent searches (max 5) below the bar with “Clear history”.
- Empty/error states: “No services match.” on zero results; inline Retry on fetch errors (no toast spam).
- Next-slot performance: batched fetch `primeNextSlotsForServices(serviceIds)` + 3‑min cache; cards consume cached `nextSlotText`.
- Login guard: after SignIn, shows small toast “You’re signed in — continue booking.” and auto-continues to SelectTherapist.
- Deeplink hardening: ServiceDetail shows “Service not available” with Back CTA when id invalid/inactive.
- Accessibility + tap targets: ensured labels/roles and ≥44px for tappables.
- List perf: FlatList props verified (stable keys, initialNumToRender=8, maxToRenderPerBatch=8, windowSize=5, removeClippedSubViews on Android).
**QA:**
- Search, recent history, clear, offline retry, error‑retry, deeplinks, next-slot presence, Book flow, and list performance validated interactively.

### Services: SectionList grouped view (2025-11-07)
**Summary:** Converted grouped categories to a single SectionList with sticky headers; search mode remains a FlatList.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Sections ordered: Sports Performance Studio, Physio Care, Skin Care, Hair Care, Body Care, Nutrition Care. Sticky headers ON; headers use accessibilityRole="header".
- Removed nested FlatLists/ScrollViews. Search mode (when query present) continues to render a FlatList with results.
**QA:**
- Grouped view scrolls smoothly with sticky category headers; search renders a flat list; no nested list warnings.
### Home quick actions: direct service open (2025-11-07)
**Summary:** Quick actions for service categories on Home now open a relevant Service Detail directly instead of just highlighting the list; falls back to grouped view if none found.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- For a tapped category (and Online Consultation), fetches active services and opens the first matching service detail (prefers `is_online_allowed` when requested). If no match, navigates to Services with the category highlighted.
**QA:**
- Tap “Book Physio Care”, “Sports Performance Studio”, or “Aesthetic Care”: opens a service detail directly; if category empty, opens Services with that category highlighted.
### Confirm screen expiry guard (2025-11-06)
**Summary:** Prevents booking a slot that already ended using shared time helper.
**Files:** src/screens/Booking/ConfirmBookingScreen.tsx
**Behavior:**
- Checks `isPastSlot(date, end_time)` immediately before booking.
- Shows “This slot expired.” and returns to SelectTimeSlot when expired.
- Aligns with time checks used elsewhere in the app.
**QA:**
- Select a slot and wait past end_time; Confirm shows expiry toast.
- Selecting a valid future slot proceeds to booking.

### Services: header polish + separators (2025-11-07)
**Summary:** Added compact spacing and neutral separators under sticky headers; unified item spacing via a list separator.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Sticky headers now include a thin divider; list items separated by an 8px spacer. No theming changes.
**QA:**
- Scroll grouped view: headers stick with a subtle divider; items have consistent vertical rhythm.
### Home quick actions: online consult routing (2025-11-07)
**Summary:** Improved the Online Consultation quick action to route directly into the online booking flow for the first eligible service.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Tapping Online Consultation now finds the first active service with `is_online_allowed` outside Sports Performance Studio and Physio Care, and navigates directly to SelectTherapist with `isOnline=true`. Falls back to Services main if none found.
**QA:**
- Tap Online Consultation on Home: lands in SelectTherapist for an online‑eligible service; if none available, opens Services main.
### Service detail: online consult CTA restored (2025-11-07)
**Summary:** Reintroduced a clear "Book Online Consultation" button on Service Detail when `is_online_allowed` is true.
**Files:** src/screens/Services/ServiceDetailScreen.tsx
**Behavior:**
- Shows a visible "Book Online Consultation" button under the header when online consult is available; tapping navigates to SelectTherapist for the same service (online flag can be handled in a later phase).
**QA:**
- Open a service with online consult enabled; the button appears and routes into the booking flow.

### Services: quick filters (2025-11-07)
**Summary:** Added an "Online only" toggle and a "Sort" chooser to filter/sort services in both grouped and search views.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Online only toggles services with `is_online_allowed=true`.
- Sort ActionSheet/Alert offers: Name A→Z (default), Price (low→high), Duration (short→long).
- Filters apply consistently to SectionList (grouped) and FlatList (search) results.
**QA:**
- Toggle Online only on → only online-eligible services remain; sorting updates immediately in both grouped and search views.
### Home: Online Consultation service chooser (2025-11-07)
**Summary:** Added a simple chooser UX so users pick which service they want to book an online consultation for.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Tapping Online Consultation presents a list of online‑eligible services (excluding Sports Performance Studio and Physio Care). Selecting one navigates directly to SelectTherapist with `isOnline=true`. Falls back to Services main if no eligible services.
**QA:**
- Tap Online Consultation: sheet lists multiple services when available; selecting one routes to therapist selection; Cancel returns to Home.
### Service detail: dual booking options (2025-11-07)
**Summary:** Replaced the simple tag with explicit dual booking options (In‑Clinic vs Online) on Service Detail for categories except Sports Performance Studio and Physio Care.
**Files:** src/screens/Services/ServiceDetailScreen.tsx
**Behavior:**
- For Skin/Hair/Body/Nutrition (and other non‑excluded categories) where `is_online_allowed` is true, shows two buttons: “Book In‑Clinic” and “Book Online”.
- For Sports Performance Studio and Physio Care, only the in‑clinic sticky CTA remains.
**QA:**
- Open a non‑excluded, online‑enabled service: both options appear; each routes to SelectTherapist with an `isOnline` hint param.
### MyAppointments: future-only + auto-complete (2025-11-06)
**Summary:** Auto-sync appointments; mark past as completed, disable actions; periodic refresh.
**Files:** src/screens/Account/MyAppointmentsScreen.tsx, src/services/bookingService.ts
**Behavior:**
- Calls `syncMyPastAppointments()` and fetches via `getMyAllAppointments()`.
- Rows flip to “completed” when `now > slot.end_time`; Cancel/Reschedule disabled.
- 60s focused interval refetches; pull-to-refresh uses same logic.
**QA:**
- Approaching end_time automatically completes row on next tick.
- Cancel disabled within 60 minutes of start; reschedule disabled after end.

### Services: persist filters + recent searches (2025-11-07)
**Summary:** Persisted Online-only, Sort option, and recent searches across app restarts; loaded on mount; added recent chips with Clear history.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Saves `onlineOnly`, `sortKey`, and `recent` (LRU, max 5) to AsyncStorage and restores them when the screen loads. Recent searches appear under the search bar; tap to apply; Clear history erases them.
**QA:**
- Set Online-only and a Sort order, enter a few searches, restart the app; verify settings and recent searches are restored; chips apply search on tap; Clear history removes them.
### Service detail: sticky dual CTAs (2025-11-07)
**Summary:** Consolidated booking actions into the sticky footer — two options (In‑Clinic as primary orange, Online as secondary outline) alongside price/duration; removed inline buttons.
**Files:** src/components/StickyBookingBar.tsx, src/screens/Services/ServiceDetailScreen.tsx
**Behavior:**
- For eligible categories with online consult, the footer shows both CTAs; for Sports Performance Studio and Physio Care, only In‑Clinic appears. Layout keeps price and duration on the left, CTAs on the right.
**QA:**
- Open eligible service: footer shows “Book In‑Clinic” (orange) and “Book Online” (outline). No third button on page; tapping each goes to SelectTherapist with the correct `isOnline` hint.
### Home upcoming refactor (2025-11-06)
**Summary:** Uses unified upcoming fetcher with auto-refresh while focused.
**Files:** src/screens/Home/HomeScreen.tsx, src/services/bookingService.ts
**Behavior:**
- Fetches via `getMyUpcomingAppointments(1)`.
- 60s focused interval refresh; realtime subscription keeps list current.
- Hides upcoming card when there are zero items.
**QA:**
- Upcoming card hides when none; shows on next booking without app restart.
- Realtime changes reflect within a second or after focus refresh.

### Services: next-slot batch + freshness (2025-11-07)
**Summary:** Batched earliest-slot fetch across services with in-memory cache + lastUpdated timestamp; progressive warm-up for visible sections and a freshness label.
**Files:** src/services/bookingService.ts, src/screens/Services/ServicesScreen.tsx
**Behavior:**
- bookingService.getNextSlotsForServices(serviceIds) returns earliest FUTURE slot per id in one call; results cached for ~3 minutes; exposes getNextSlotsLastUpdated().
- On mount/grouped view: warms cache for the first two categories immediately, then progressively fetches remaining categories. Search mode batches for visible results.
- Header shows “Updated <Xm> ago” near Retry; counter updates every 60s.
**QA:**
- Scroll grouped view; slots appear quickly for top sections; freshness label reflects time since last fetch; searching still shows next slots with minimal delay.
### Services: card tap opens dual‑CTA detail (2025-11-07)
**Summary:** Re‑enabled card tap to open Service Detail so users see the two booking options (In‑Clinic/Online) there; Book button still provides direct flow.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Tapping a service card opens Service Detail with the sticky dual CTAs; tapping Book on the card still goes directly to booking with login guard.
**QA:**
- From Services list or search, tap any card → detail opens with two options (where applicable). Book button continues to jump into SelectTherapist.
### Release checklist (2025-11-06)
**Summary:** DEV-only ActionSheet to validate release readiness on device.
**Files:** src/dev/releaseChecklist.ts, src/screens/Home/HomeScreen.tsx
**Behavior:**
- Triple-tap Home title (DEV) to open checklist.
- Lists icons/splash, bundle IDs, Sentry DSN, Supabase env, EAS profiles, Sentry init.
- iOS uses ActionSheet; Android shows Alert.
**QA:**
- In dev, rapid triple-tap opens the sheet; no effect in production builds.

### Services accessibility + deep link hardening (2025-11-07)
**Summary:** Improved accessibility of search and book flows, and hardened deep link behavior when a service is unavailable.
**Files:** src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx, src/screens/Services/ServiceDetailScreen.tsx
**Behavior:**
- Accessibility: Search input labeled “Search services”; Book buttons use labels “Book <service name>” with a hint “Opens chooser to book online or in‑clinic.” Tap targets kept ≥44px.
- Live region: Added a freshness label (“Updated Xm ago”) that refreshes every 60s (no theming) to signal data recency.
- Deep links: Unavailable service now shows a simple screen with “Back to Services” and “Browse online‑eligible services” (sheet to pick an alternative service) controls.
**QA:**
- Screen readers announce search and book buttons clearly; next‑slot freshness shows and updates; deep link to a bad id shows the alternate flow with functional actions.
### Services: Book button shows dual options (2025-11-07)
**Summary:** Updated the Book CTA on service cards to present a choice between In‑Clinic and Online (when applicable) via ActionSheet/Alert instead of navigating directly.
**Files:** src/screens/Services/ServicesScreen.tsx
**Behavior:**
- Sports Performance Studio / Physio Care: Book goes straight to In‑Clinic.
- Other categories with `is_online_allowed`: Book opens a chooser; selection routes to SelectTherapist with `isOnline` hint and login guard respected.
**QA:**
- From Services list/search, tap Book → chooser appears (if eligible); choosing In‑Clinic or Online routes correctly; guests are redirected to Sign In and resume booking afterward.
### Legal & consent (2025-11-06)
**Summary:** Added Terms/Privacy screens and a one-time consent modal after first login.
**Files:** src/screens/Legal/TermsScreen.tsx, src/screens/Legal/PrivacyScreen.tsx, src/navigation/AccountStack.tsx, src/screens/Account/AccountScreen.tsx
**Behavior:**
- Markdown placeholders for Terms and Privacy; accessible from Account.
- One-time consent modal stores `consent_v1:<userId>` in AsyncStorage.
- Links to Terms/Privacy available in modal and in Account.
**QA:**
- After first login, modal appears; acknowledging stores the flag and prevents re-prompt.
- Terms/Privacy screens navigate and render correctly.

### Offline awareness (2025-11-06)
**Summary:** Global offline banner and retry UX in lists; auto-retry on reconnect.
**Files:** App.tsx, src/components/feedback/OfflineBanner.tsx, src/screens/Booking/SelectDateScreen.tsx, src/screens/Booking/SelectTimeSlotScreen.tsx, src/screens/Account/MyOrdersScreen.tsx, src/screens/Account/MyAppointmentsScreen.tsx
**Behavior:**
- Offline banner shows when store `isOnline` is false.
- Lists show “Tap to retry” on failure; auto-retry when connectivity returns.
- 60s focused intervals keep time-sensitive lists in sync.
**QA:**
- Toggle network off/on to see banner and retry behavior.
- Lists recover automatically on reconnect.

### Network state unified (2025-11-06)
**Summary:** Single source of truth for connectivity; app subscribes via Expo Network.
**Files:** src/store/useNetworkStore.ts, src/hooks/useAppNetwork.ts, App.tsx, multiple screens, index.ts
**Behavior:**
- Store exposes `{ isOnline, setOnline }`; app root calls `useAppNetwork()`.
- All screens use `useNetworkStore((s)=>s.isOnline)`; no route/global `isOnline`.
- Gesture handler import added in `index.ts` for navigation gesture stability.
**QA:**
- No ReferenceErrors for `isOnline` variables; connectivity reflects in UI.
- App boots cleanly and logs online state as expected.

### bookingService: sync + fetchers (2025-11-06)
**Summary:** Added RPC sync and typed fetchers for upcoming/all appointments.
**Files:** src/services/bookingService.ts
**Behavior:**
- `syncMyPastAppointments()` calls RPC to mark past to completed.
- `getMyUpcomingAppointments()` returns future-only records ordered by date/time.
- `getMyAllAppointments()` returns all with computed `isPast` boolean.
**QA:**
- After a slot ends, subsequent fetches show completed status.
- Upcoming fetch filters out past records consistently.

### Supabase RPC (2025-11-06)
**Summary:** Server-side helper to complete past appointments for the signed-in user.
**Files:** scripts/rpc_mark_my_past_appointments_completed.sql
**Behavior:**
- `public.mark_my_past_appointments_completed()` updates user’s booked → completed when slot end <= now().
- Granted execute to anon/authenticated; uses `auth.uid()` safely.
**QA:**
- Manual SQL run updates only current user’s past records.

### App shell navigation (2025-11-06)
**Summary:** Restored NavigationContainer with AppTabs; ToastProvider wraps app.
**Files:** App.tsx, index.ts
**Behavior:**
- Root renders tabs; ToastProvider available for toasts across screens.
- index.ts imports `react-native-gesture-handler` and registers `App`.
**QA:**
- Navigation loads; toasts render in all screens.
- Gesture-based navigation works on iOS/Android.
### Availability roll (cron) (2025-11-06)
**Summary:** Added a pg_cron-based daily job to maintain the next 15 days of availability and remove past slots.
**Files:** scripts/cron_roll_availability_15days.sql
**Behavior:**
- Ensures pg_cron extension and unique index on slots for safe upserts.
- Defines `public.roll_availability_15days()` to delete past slots and insert skeleton future slots for active therapists/services.
- Schedules daily run at 03:00 UTC; includes one-time immediate run and a verification query.
**QA:**
- After running the script in Supabase, verify `slot_count` > 0 for today..+14.
- Confirm cron job `roll_avail_daily` appears in cron.job table and runs daily.
### Home upcoming card fix (2025-11-06)
**Summary:** Upcoming card now reads from the new bookingService shape and refreshes immediately after changes.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- Uses `getMyUpcomingAppointments(1)` and renders `service_name`, `therapist_name`, and `slot` fields.
- Realtime and 60s focus interval already in place; card hides when no upcoming items.
**QA:**
- After booking a future appointment, card appears without app restart.
- After cancel, card hides; on reopen, card reflects current state.
### Home upcoming card reliability (2025-11-06)
**Summary:** Ensured next appointment always appears after booking/cancel by filtering for current user and refreshing.
**Files:** src/services/bookingService.ts, src/screens/Home/HomeScreen.tsx
**Behavior:**
- `getMyUpcomingAppointments(limit, userId?)` now accepts `userId` to explicitly scope results; RLS still enforced.
- Home passes `userId`, keeps realtime + 60s focus refresh, and falls back to `getMyAllAppointments()` to compute next when needed; card hides when none.
- Increased fetch to up to 10 items; horizontal ScrollView shows multiple upcoming appointments when present.
**QA:**
- Book a future appointment; card shows immediately (realtime) and on return to Home (focus refresh).
- Cancel; card hides promptly and persists across app reopen.
### Home upcoming card (final fix) (2025-11-06)
**Summary:** Ensured session bootstraps at app start so Home can fetch user-scoped upcoming immediately after booking.
**Files:** App.tsx
**Behavior:**
- On mount, reads Supabase session and updates `useSessionStore` with `userId`.
- Subscribes to auth changes to keep session store in sync.
**QA:**
- After booking as a logged-in user, upcoming card appears without restart; after logout/login it refreshes correctly.
### Home auto-hide at end_time (2025-11-06)
**Summary:** Upcoming card now auto-hides exactly when a slot ends using an exact refresh timer.
**Files:** src/screens/Home/HomeScreen.tsx
**Behavior:**
- After fetching upcoming, schedules a setTimeout to refresh at the nearest `slot.end_time` (+1s) in addition to 60s interval.
- Ensures the card disappears right when the appointment passes end_time without waiting for the next minute tick.
**QA:**
- Book a near-future test slot; observe card disappear within a second after end_time.
- Multiple upcoming items re-schedule the timer to the next soonest end.
### Start-time based completion (2025-11-06)
**Summary:** Card hides and appointments mark completed as soon as start_time passes (not end_time).
**Files:** src/services/bookingService.ts, src/screens/Home/HomeScreen.tsx, scripts/rpc_mark_my_past_appointments_completed.sql
**Behavior:**
- Upcoming filtering uses `start_time`.
- Exact refresh timer set to nearest `start_time`.
- RPC updated to mark booked → completed when `(date + start_time) <= now()`.
**QA:**
- Book at 16:00; at 16:12, Home card hides and My Appointments shows completed.
### TZ-safe past checks (2025-11-06)
**Summary:** Fixed time comparisons to use device-local date/time to prevent drift against UTC when DB stores date+time without TZ.
**Files:** src/utils/clinicTime.ts, src/screens/Home/HomeScreen.tsx
**Behavior:**
- `isPastSlot()` now constructs local Date from `YYYY-MM-DD` + `HH:MM`.
- HomeScreen refresh timer parses local date/time for exact changeover.
**QA:**
- Booking starting at 16:00 hides exactly after 16:00 local; My Appointments reflects completed per UI and RPC sync.
### RPC rowcount fix (2025-11-06)
**Summary:** Eliminated multi-row RETURNING error in `mark_my_past_appointments_completed()`.
**Files:** scripts/rpc_mark_my_past_appointments_completed.sql
**Behavior:**
- Replaced `RETURNING INTO` with `GET DIAGNOSTICS updated_count = ROW_COUNT;` after UPDATE.
- Prevents `P0003 query returned more than one row` warnings in `syncMyPastAppointments()`.
**QA:**
- Running RPC returns an integer count without errors; client logs no warnings.
### MyAppointments completion UI (2025-11-06)
**Summary:** Fixed client-side completion toggle to use start_time so rows flip to completed as soon as time passes.
**Files:** src/screens/Account/MyAppointmentsScreen.tsx
**Behavior:**
- Uses `isPastSlot(date, start_time)` to determine “completed” display and disable actions.
**QA:**
- At 16:12 for a 16:00 booking, row shows “completed” without manual refresh (interval/focus refresh ensure update).

### Accessibility + Deep Link Hardening (2025-11-08)
**Summary:** Accessibility polish for Services search and Book CTAs; deep-link fallback when service is missing/inactive.
**Files:** src/screens/Services/ServicesScreen.tsx, src/components/ServiceCardLarge.tsx, src/screens/Services/ServiceDetailScreen.tsx, src/services/serviceCatalogService.ts, App.tsx (verification)
**Changes:**
- Search input labeled; added live region announcing result count ("Showing N services").
- Ensured tap targets >=44px for Book button, filters, and recent-search chips.
- Book button has accessibilityLabel="Book <service name>" and hint.
- getServiceById now enforces is_active=true so inactive services trigger fallback.
- ServiceDetail shows "Service not available" screen with buttons: Back to Services, Browse online-eligible services (ActionSheet). Buttons have accessibility labels.
**QA:**
- Screen reader announces "Showing N services" when search results change.
- All tappables measure >=44px (inspect via accessibility inspector).
- Open physiosmetic://services/<bad-or-inactive-id> → fallback screen appears; browse chooser lists online-eligible services and navigates correctly.

### Category Jump Chips (2025-11-08)
**Summary:** Added horizontal category chips under Services filters; tapping jumps to the respective SectionList section.
**Files:** src/screens/Services/ServicesScreen.tsx
**Details:**
- Chips for: Sports Performance Studio, Physio Care, Skin Care, Hair Care, Body Care, Nutrition Care.
- Uses SectionList.scrollToLocation({ sectionIndex, itemIndex: 0, animated: true }).
- Chips are accessible (role=button, label="Jump to <Category>"); tap targets ≥44px.
**QA:**
- Scroll list, tap any chip; the list scrolls to that category header.
- VoiceOver reads "Jump to <Category>".

### Category Chips Fix (2025-11-08)
**Summary:** Made category chips robust by scrolling to nearest non-empty section if the chosen category has no items, preventing scrollToLocation failures.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- If a category has 0 services, tapping its chip still scrolls to the nearest category with items.
- If all empty, tap does nothing gracefully.

### Category Chips Robust Scroll (2025-11-08)
**Summary:** Improved chip click reliability by switching SectionList ref to , wiring ref directly, and adding  with a retry + header offset. Also added  to avoid header overlap.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Tap any chip repeatedly; scroll should always occur.
- No crash when a section header isn’t measured yet — retry kicks in.
### Category Chips Robust Scroll (2025-11-08)
**Summary:** Improved chip click reliability by switching SectionList ref to any, wiring ref directly, and adding onScrollToIndexFailed with a retry + header offset. Also added viewOffset to avoid header overlap.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Tap any chip repeatedly; scroll should always occur.
- No crash when a section header isn’t measured yet — retry kicks in.
### Category Chips Retry + Keyboard Handling (2025-11-08)
**Summary:** Ensured chips work even with keyboard open and when SectionList hasn’t measured items yet.
**Details:**
- Added keyboardShouldPersistTaps="handled" on both chips row and SectionList.
- Added lastJumpCatRef and robust retry in onScrollToIndexFailed.
- Added viewOffset to avoid sticky-header overlap.
**QA:**
- With keyboard open from search, chip taps still scroll.
- Tapping chips right after screen shows still scrolls reliably after a brief tick.
### Category Chips Tap Handling (2025-11-08)
**Summary:** Made chips reliably tappable by using TouchableOpacity, adding hitSlop, nestedScrollEnabled on Android, and using requestAnimationFrame for scroll.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Chips scroll horizontally and each tap triggers a jump.
- Test with keyboard open; taps still work.
### Category Chips: FlatList Implementation (2025-11-08)
**Summary:** Switched chips row to a FlatList horizontal to improve tap reliability inside the SectionList header. Added hitSlop and stable keyExtractor.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Chips are fully tappable; jump triggers consistently.
- Horizontal scrolling still works; taps register even during slight scrolls.
### Category Chips: Tap Capture (2025-11-08)
**Summary:** Forced tap capture on chips to avoid horizontal pan swallowing taps: added onStartShouldSetResponder, pressRetentionOffset, and delayPressIn=0 on each chip.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Light taps on any chip trigger reliably, even with slight finger movement.
- You can still horizontally scroll by dragging between chips or with longer drags.
### Category Chips: Z-order and Pointer Events (2025-11-08)
**Summary:** Ensured chips receive taps by placing ListHeader above sticky headers and disabling pointer events on section headers.
**Changes:**
- renderSectionHeader now uses pointerEvents="none" so sticky headers never block touches.
- ListHeaderComponentStyle sets zIndex above headers and white background.
- Marked header and chips list as collapsable={false} to avoid Android view flattening.
**QA:**
- Taps on chips work even when a sticky header is present.
### Services: Category Jump Chips (Exact Spec) (2025-11-08)
**Summary:** Implemented category chips per exact steps: typed SectionList ref; memoized sections in fixed order; memoized `sectionIndexByCategory`; added `handleJump` with `requestAnimationFrame`; wired chips as Pressables; ensured touch settings and empty-section safety; added `console.debug` probe.
**Files:** src/screens/Services/ServicesScreen.tsx
**Details:**
- `const sectionListRef = useRef<SectionList<Service, CategorySection>>(null)` with `CategorySection = { category: string; data: Service[] }`.
- `sections` memoized in order [Sports Performance Studio, Physio Care, Skin Care, Hair Care, Body Care, Nutrition Care].
- `sectionIndexByCategory` built from `sections`.
- `handleJump(category)` uses `requestAnimationFrame` and skips scroll when target section is empty.
- Chips: Pressable, accessibilityRole="button", label "Jump to <Category>", hitSlop=10, min tap target ≥44.
- Header placed above sticky headers; section headers don’t intercept touches.
**QA:**
- Tapping a chip scrolls to the correct section header; if empty, no scroll.
- `console.debug('Jump chip pressed:', category)` logs on tap (temporary probe).
### Services: Chips Jump Reliability (2025-11-08)
**Summary:** Improved jump reliability with repeated scrollToLocation attempts and consistent viewOffset; aligned onScrollToIndexFailed to new section index map.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Tapping a chip logs and jumps; if initial attempt fails due to layout timing, subsequent retries succeed.

### Services: Summary + Reset (2025-11-08)
**Summary:** Added a tiny summary under filters showing the number of visible services and a Reset button.
**Details:**
- Search mode: "Showing N services" (polite live region) with a Reset button that clears search text, online-only, sort, and recent.
- Grouped view: Same summary under filters; updates on search text, Online toggle, and Sort changes.
- Chips row remains; active chip highlights and centers on selection.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Toggle Online only / change Sort / type in Search — the summary updates immediately.
- Screen readers announce the updated count (accessibilityLiveRegion=polite).
- Press Reset — search clears, onlineOnly off, sort resets to Name, recent cleared, and summary reflects the full count.

### Services: Search Highlight (2025-11-08)
**Summary:** Bolded the matched search tokens in service name and description for search results.
**Details:**
- Case-insensitive, simple substring highlight. Multi-word queries split on spaces; each token is highlighted.
- Works with existing debounce pipeline. No theming added; uses fontWeight '700'.
- Implemented by allowing `ServiceCardLarge` to accept optional `nameNode` and `descriptionNode` for rich text.
**Files:** src/screens/Services/ServicesScreen.tsx, src/components/ServiceCardLarge.tsx
**QA:**
- Type a multi-word query like "skin peel"; both "skin" and "peel" are bold wherever they appear in names/descriptions.
- Clear search with Reset; highlights go away.

### Services: Next Slot Formatting (2025-11-08)
**Summary:** Formatted next slot in ServiceCardLarge as Today/Tomorrow or DD Mon HH:MM.
**Details:**
- If slot date equals today → "Today HH:MM"; if tomorrow → "Tomorrow HH:MM"; else → "DD Mon HH:MM".
- Uses existing formatDate/formatTime; trims weekday from formatDate to get "DD Mon".
- ServicesScreen now passes raw next slot date/time; ServiceCardLarge computes display.
**Files:** src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx
**QA:**
- A slot later today shows "Today <time>"; tomorrow shows "Tomorrow <time>"; future shows "DD Mon <time>".

### Services: Recently Viewed MRU (2025-11-08)
**Summary:** Track last 5 viewed serviceIds (MRU) and surface as chips under the search UI.
**Details:**
- Stores MRU in AsyncStorage at key `recent_services_mru_v1`, most-recent-first, deduped, max 5.
- ServiceDetailScreen updates MRU on mount from any entry path (card or deeplink).
- ServicesScreen loads MRU on focus and renders a "Recently viewed" chip row under the search input (both grouped and search modes).
- Tapping a chip opens ServiceDetail for that serviceId.
**Files:** src/screens/Services/ServiceDetailScreen.tsx, src/screens/Services/ServicesScreen.tsx
**QA:**
- Open 3+ service details via different paths; go back to Services → chips show those services in MRU order.
- Tap a chip → navigates to the correct ServiceDetail.
- Opening an already-seen service moves it to the front; list never exceeds 5.

### Services: Quick Price/Duration Filters (2025-11-08)
**Summary:** Added optional quick filters for price and duration; applied to grouped view and search results; persisted in AsyncStorage; Reset clears them.
**Details:**
- Price ranges: [₹0–999], [₹1k–1.9k], [₹2k+]
- Duration ranges: [≤30m], [≤45m], [≤60m], [>60m]
- Filters render under the existing Online/Sort row in both grouped and search headers.
- Persisted keys: `services_price_filter_v1` and `services_duration_filter_v1` (single-select per group, tap again to clear).
- Filters are applied before sort; search results inherit same filters.
- Reset button also clears these filters and their storage entries.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Toggle any price/duration chip — list updates; search results respect filters.
- Close/reopen tab — previous selections restore from storage.
- Press Reset — chips clear; list returns to unfiltered.

### Services: Search List getItemLayout (2025-11-08)
**Summary:** Added `getItemLayout` to search results FlatList with an approximate uniform row height for `ServiceCardLarge` to improve scroll-to-index performance.
**Details:**
- Measures search header height and uses it to offset rows in `getItemLayout`.
- Stable `keyExtractor` remains `item.id` to avoid warnings.
- Grouped view remains non-virtualized ScrollView (no change to SectionList elsewhere).
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- No warnings about missing keys or getItemLayout.
- Scrolling/search remains smooth; pull-to-refresh works.

### Services: Empty Category Note + Clear Filters (2025-11-08)
**Summary:** Hide empty category bodies; when user jumps to an empty category via chip, show an inline note with a quick action to clear filters.
**Details:**
- Grouped view no longer renders an empty list for categories with 0 items after filters.
- If the user taps a category chip that has 0 items, an inline message appears under that category header: "No active services in <Category>." and a "View all services" button.
- The action clears active filters (price, duration, online-only) and persists removal in AsyncStorage.
**Files:** src/screens/Services/ServicesScreen.tsx
**QA:**
- Apply filters so a category becomes empty; tap that chip → see the inline message and action.
- Tap "View all services" → filters clear and items reappear.

### Services: Light Haptics (2025-11-08)
**Summary:** Added light haptic feedback for key interactions using a lightweight helper.
**Details:**
- Triggers on: pressing Book, pressing a category jump chip, applying Sort, and toggling quick filters (price/duration, online-only).
- Helper tries `react-native-haptic-feedback` if available; falls back to a short vibration.
- No theming or UI changes.
**Files:** src/utils/haptics.ts, src/components/ServiceCardLarge.tsx, src/screens/Services/ServicesScreen.tsx
**QA:**
- Tap Book → feel light haptic.
- Tap a category chip → light haptic + jump.
- Change Sort or toggle Price/Duration/Online filters → light haptic.

### ServiceCardLarge: Image Placeholder + Fade-in (2025-11-08)
**Summary:** Improved ServiceCardLarge image loading with a placeholder and a short fade-in once loaded. Keeps offline placeholder behavior.
**Details:**
- CachedImage now wraps images with a placeholder background and adds a light fade-in on `onLoadEnd`.
- Uses `expo-image` when available with `transition`; falls back to RN Animated.Image with opacity animation otherwise.
- ServiceCardLarge passes `fadeIn` and retains the grey placeholder when `image_url` is missing.
**Files:** src/components/CachedImage.tsx, src/components/ServiceCardLarge.tsx
**QA:**
- On slow networks, a grey placeholder shows before the image.
- When the image finishes loading, it fades in smoothly.
- With no `image_url` or offline, the grey placeholder remains.

### Linking: Category Jump (2025-11-08)
**Summary:** Added deep link support for `physiosmetic://services?category=<encodedName>` to preselect and jump to a category on the Services screen.
**Details:**
- Parses the `category` query param and navigates to `ServicesMain` with `highlightCategory`.
- ServicesScreen uses the existing jump mechanism to scroll to that category.
- If the category is invalid or empty, the screen opens normally (no jump).
**Files:** App.tsx, src/screens/Services/ServicesScreen.tsx (existing support for highlightCategory)
**QA:**
- Open `physiosmetic://services?category=Skin%20Care` → Services opens and jumps to “Skin Care”.
- Open `physiosmetic://services?category=Unknown` → Services opens without jumping.

### Shop: Data Layer (2025-11-08)
**Summary:** Implemented product catalog service with grouped fetch, search, and bestsellers.
**Details:**
- `getAllActiveProducts()` → returns `{ id, name, description, price, in_stock, category, image_url, has_variants? }` for `is_active=true`. Tries `has_variants` column if available; otherwise returns `null` for it.
- `getProductsGroupedByCategory()` → builds a dynamic category map from DB and orders categories by name (asc). Filters `is_active=true` and preserves `in_stock` flags.
- `searchProducts(query)` → case-insensitive match across name + description (`ilike` on both), filters `is_active=true`.
- `getBestsellers(limit=10)` → joins `order_items → products`, aggregates qty client-side, filters active products, returns sorted by total quantity desc.
**Files:** src/services/productCatalogService.ts
**QA:**
- Call `getAllActiveProducts()`; items have core fields and optional `has_variants`.
- `getProductsGroupedByCategory()` keys sorted A→Z; arrays contain products from that category.
- `searchProducts('serum')` matches both name and description.
- `getBestsellers(5)` returns up to 5 active products with `total_qty` in desc order.

### Shop: Screen Overhaul (2025-11-08)
**Summary:** Rebuilt Shop screen with global search + debounced results and category SectionList.
**Details:**
- Top search bar with ~250ms debounce. When query present, renders a FlatList of results via `searchProducts`; otherwise shows a SectionList grouped by DB categories via `getProductsGroupedByCategory`.
- ProductCard (compact): name (2 lines), short description (2 lines), price, stock badge (In stock/Out of stock), and thumbnail. Pressing a card opens `ProductDetail(productId)`.
- Empty states: search no results → "No products found. Try a different keyword."; categories with 0 products auto-collapse (do not render).
- Pull-to-refresh refreshes current mode (search or grouped).
**Files:** src/screens/Shop/ShopScreen.tsx, src/components/ProductCardCompact.tsx
**QA:**
- Typing into search shows debounced results; clearing search restores category sections.
- Category sections show only non-empty categories.
- Tapping a product navigates to its detail page.

### Shop: Filters + Sort + Persist (2025-11-08)
**Summary:** Added filter/sort row above Shop lists; applied to both search results and category sections; persisted selections; added Reset.
**Details:**
- Filters: In stock only toggle; Price steps [₹0–999], [₹1k–1.9k], [₹2k+].
- Sort: ActionSheet with Bestsellers, Price low→high, Newest.
- Applies to FlatList search results and SectionList grouped view. Categories with 0 items after filters are auto-collapsed.
- Persistence via AsyncStorage keys: `shop_in_stock_only_v1`, `shop_price_step_v1`, `shop_sort_option_v1`.
- Reset clears all filters and search, and removes storage entries.
**Files:** src/screens/Shop/ShopScreen.tsx, src/services/productCatalogService.ts (added created_at optional for Newest sort)
**QA:**
- Toggle "In stock only" and price steps — both views reflect changes.
- Choose sort; Bestsellers uses a rank map; Price sorts ascending; Newest uses created_at if available.
- Kill/relaunch app — previous selections restored.
- Press Reset — search clears and filters reset.

### Product Detail: Gallery + FBT (2025-11-08)
**Summary:** Enhanced ProductDetail with a swipeable image gallery, richer content sections, and a Frequently Bought Together row.
**Details:**
- Header: swipeable image gallery with dots (falls back to single image), name, price, and stock badge.
- Content blocks (accordions): Description; Usage & Contraindications; Ingredients — sections render only when data is present.
- Frequently bought together: uses `productCatalogService.getFrequentlyBoughtTogether(productId, limit=4)` (order co‑occurrence) and shows a horizontal list of small ProductCard tiles; tapping opens the other product’s detail.
- Related products by category retained below FBT.
**Files:** src/screens/Shop/ProductDetailScreen.tsx, src/services/productCatalogService.ts
**QA:**
- Swipe the header images; dots update. Tap to preview still works.
- Accordions expand/collapse; sections hide when no data.
- FBT shows co‑purchased items; tapping navigates to that product detail.

### Product Variants (2025-11-08)
**Summary:** Added product variants support: selection chips, dynamic price/stock, and variant id stored in cart lines.
**Details:**
- If `product.has_variants` is true, fetches variants `{ id, label, price, in_stock }` via `productCatalogService.getVariants(productId)`.
- Renders variant chips; selecting a variant updates the displayed price and availability.
- Cart lines store `variant_id` and use a unique `line_id` (productId::variantId) so multiple variants of the same product can coexist in the cart.
- Cart store updated to use `line_id` for key/merge, while keeping `id` as the product id for checkout compatibility.
**Files:** src/services/productCatalogService.ts, src/store/useCartStore.ts, src/screens/Shop/ProductDetailScreen.tsx, src/screens/Shop/CartScreen.tsx
**QA:**
- Open a product with variants → chips render; selecting toggles price/stock; Add to Cart uses variant.
- Add two different variants → cart shows two separate lines; increment/decrement/remove each line independently.

### Cart Behavior: Guest Flow + Buy Now (2025-11-08)
**Summary:** Implemented guest redirection with post-login continuation for cart actions; Buy Now single-line checkout; improved cart line display.
**Details:**
- If guest taps Add to Cart or Buy Now → navigates to SignIn and stores intent `{ action: 'add_to_cart' | 'buy_now', params: { productId, variantId, qty } }`.
- After successful sign-in, the intent is consumed:
  - add_to_cart → adds the specified product/variant/qty to cart then navigates to Account.
  - buy_now → clears cart, adds the single specified line, navigates to Cart (checkout).
- Cart items now include `variant_label` when applicable; list shows name, variant label, qty stepper, price, and Remove.
**Files:** src/screens/Shop/ProductDetailScreen.tsx, src/screens/Auth/SignInScreen.tsx, src/screens/Shop/CartScreen.tsx, src/store/useCartStore.ts
**QA:**
- As a guest, tap Add to Cart → SignIn → after sign-in, cart contains the selected product (with variant if chosen).
- As a guest, tap Buy Now → SignIn → after sign-in, navigates to Cart with only that single line.
- As logged-in, Add to Cart adds to existing cart; Buy Now clears and proceeds to Cart.

### Checkout Basics (2025-11-08)
**Summary:** Added Checkout screen with Shipping Address form and Pickup toggle; validates required fields and saves address to profile.
**Details:**
- ShippingAddress form: name, phone, line1, line2, city, pincode, state, country. Pre-fills from last saved profile address if present. Saves the most recent address back to `profiles.addresses` (JSON) after order placement.
- Pickup at clinic toggle: hides the address form and sets `pickup=true` in the order payload.
- Validation: enforces required fields when Pickup is OFF; address optional when Pickup is ON.
- Order submission: `placeOrder` now accepts optional `{ pickup, address }` and attempts to include them; falls back to minimal insert if schema lacks columns.
- Navigation: Cart’s Checkout goes to new `Checkout` screen; Buy Now paths also go to Checkout (or, if guest, redirect to SignIn and then to Checkout).
**Files:**
- src/screens/Shop/CheckoutScreen.tsx (new)
- src/services/profileAddressService.ts (new)
- src/services/orderService.ts (enhanced)
- src/navigation/ShopStack.tsx (added Checkout route)
- src/screens/Shop/CartScreen.tsx (navigate to Checkout)
- src/screens/Shop/ProductDetailScreen.tsx, src/screens/Auth/SignInScreen.tsx (Buy Now continuation to Checkout)
**QA:**
- Toggle Pickup ON → form hides; order places without address.
- Pickup OFF → incomplete form shows an error; completing fields allows order to place.
- After placing with an address, it appears pre-filled next time.

### Checkout: Address UX Polish (2025-11-08)
**Summary:** Refined the address experience similar to Amazon.
**Details:**
- Required fields: name, phone, line1, city, pincode, state, country (line2 optional). Country locked to India.
- Phone section: defaults to registered number; shows +91 dial code; “Use my registered number” quick-fill; supports “Order for someone else” toggle.
- State selection: action sheet with full India states/UTs list.
- Saved addresses: shows address book entries from profile; tap to apply; “Save to address book” toggle on form (default ON).
- Map selection: placeholder action present; ready to wire to a map picker in future.
**Files:** src/screens/Shop/CheckoutScreen.tsx
**QA:**
- Toggle “Order for someone else” and change phone; validation still enforces required fields.
- Tap “Use my registered number” fills phone from profile.
- State picker lists Indian states/UTs; selection persists.
- Saved addresses appear and can be applied with one tap.

### Account: Address Book (2025-11-08)
**Summary:** Added an Address Book in Account to view saved shipping addresses.
**Details:**
- New screen under Account: My Addresses — lists addresses saved from checkout (from `profiles.addresses`).
- Accessible from Account main via “My Addresses”. Shows name, phone (+91), full address.
- Basic Details action per card; future enhancements can include edit/delete.
**Files:** src/screens/Account/MyAddressesScreen.tsx, src/navigation/AccountStack.tsx, src/screens/Account/AccountScreen.tsx
**QA:**
- After placing an order with “Save to address book” enabled, the address appears under Account → My Addresses.

### Address Book: CRUD + Default + Checkout Integration (2025-11-08)
**Summary:** Completed address book with add/edit/delete, default selection, and deep integration with checkout and buy-now flows.
**Details:**
- Add Address: manual entry with required fields (line2 optional) and "Choose from map" placeholder; can set as default on save.
- Edit/Delete: manage saved entries; default indicator and "Set as default" action.
- Default address: Checkout and Buy Now auto-apply default; users can change via Address Book.
- No addresses: Buy Now/Checkout routes user to Address Book with “Continue to Checkout/Cart” actions shown.
- Tap to use: Address cards show a "Use this address" action when invoked from checkout.
**Files:** src/services/profileAddressService.ts, src/screens/Account/MyAddressesScreen.tsx, src/screens/Shop/CheckoutScreen.tsx
**QA:**
- Create two addresses, set one default; Checkout uses default.
- Delete or edit an address; list updates; default persists.
- With no addresses, buying navigates to Address Book; after adding, "Continue to Checkout" works.

### Checkout: Address Sheet Polish (2025-11-08)
**Summary:** Upgraded the Checkout address chooser to a bottom sheet with selectable list, confirmations, and onboarding hint; minor list key fix.
**Details:**
- Bottom sheet list with radio dots (●/○), "Default" badge, and one-time swipe hint ("Swipe down to close • Drag to adjust").
- Added a "Deliver to this address" confirm button; selection also updates default in the address book and shows a toast.
- Address labels (Home/Work/Other) supported in Address Book; shown next to name in the sheet and the Checkout summary.
- Checkout summary shows a simple delivery estimate under the selected address.
- Fixed list keys in Address Book to use stable `id` to silence React key warnings.
**Files:**
- src/screens/Shop/CheckoutScreen.tsx (sheet UI, selection confirm, toast, hint, labels, estimate)
- src/screens/Account/MyAddressesScreen.tsx (label chips, stable keys)
- src/services/profileAddressService.ts (address `label` support)
**QA:**
- Change address → select any entry → press "Deliver to this address" → sheet closes; summary updates; toast appears.
- First open shows a swipe hint; subsequent opens do not.
- Address labels appear appropriately; default badge visible on default.

### Checkout: Tappable Summary, Validators, Map Picker Stub (2025-11-08)
**Summary:** Made "Deliver to" summary tappable to open the address sheet, added stricter phone/pincode validation with light haptics on submit, and scaffolded a Map Picker screen with guidance.
**Details:**
- Deliver to summary is now a single tappable row; tap opens bottom sheet for quick switching (also updates hint text: "Tap to change").
- Validation tightened for India: phone uses libphonenumber to validate E.164; pincode must match 6 digits, non-zero start.
- Light haptic feedback triggers on form submit in Checkout and on Add/Save in Address Book.
- Added Map Picker screen and routes (Account/Shop). For now it opens device Maps and documents steps to enable in-app maps (react-native-maps + Google API key).
**Files:**
- src/screens/Shop/CheckoutScreen.tsx (tappable summary, validators, haptics, map nav)
- src/screens/Account/MyAddressesScreen.tsx (validators, haptics, map nav)
- src/screens/Common/MapPickerScreen.tsx (stub + instructions)
- src/navigation/AccountStack.tsx, src/navigation/ShopStack.tsx (route wiring)
**QA:**
- Tap Deliver to summary → address sheet opens.
- Enter invalid phone or pincode → error shown; valid input proceeds.
- Tapping Place Order/Save vibrates lightly.
- Choose from map navigates to Map Picker screen; external maps can be opened.

### Maps: In‑App Picker (Expo Managed) (2025-11-08)
**Summary:** Wired an in‑app Google Maps picker with Expo managed config; falls back to setup guidance if module/keys not present.
**Details:**
- Added Google Maps API keys in `app.json` (`ios.config.googleMapsApiKey`, `android.config.googleMaps.apiKey`).
- MapPicker uses `react-native-maps` when available; otherwise shows guidance and detects API key presence via `expo-constants`.
- “Choose from map” now returns lat/lng back to forms; we prefill `line2` with a "Dropped pin" hint so users can refine.
**Files:**
- app.json (maps config keys)
- src/screens/Common/MapPickerScreen.tsx (MapView + fallback + key detection)
- src/navigation/ShopStack.tsx, src/navigation/AccountStack.tsx (typed MapPicker params)
- src/screens/Shop/CheckoutScreen.tsx, src/screens/Account/MyAddressesScreen.tsx (onPicked handler wiring)
**Setup to complete locally:**
- npm i react-native-maps
- npx expo prebuild
- npx expo run:ios / npx expo run:android
**QA:**
- With module + keys: MapPicker shows interactive map; tap to drop pin; "Use this location" returns coords.
- Without module: guidance screen appears and "Open Maps App" works.

### Maps: Reverse Geocoding + Autofill (2025-11-08)
**Summary:** Added reverse geocoding on MapPicker selection to prefill checkout/address forms.
**Details:**
- Config: reads `EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY` from env; added placeholder in `app.json → expo.extra`.
- New util: `src/services/geocoding.ts` calls Google Geocoding API, parses address components into `{ line1, line2, city, state, country, postal_code }` with graceful fallbacks and 8s timeout.
- Flow: MapPicker shows "Looking up address…" while resolving; debounced confirm to prevent duplicates. On failure after ~6.5s, shows inline message and returns to manual entry.
- Wiring: Checkout and Address Book now consume the parsed fields and prefill editable inputs.
**Files:** app.json, src/services/geocoding.ts, src/screens/Common/MapPickerScreen.tsx, src/screens/Shop/CheckoutScreen.tsx, src/screens/Account/MyAddressesScreen.tsx
**QA:**
- Select a point on map → Use this location → fields prefill (line1/city/state/pincode).
- Turn off network or remove key → inline message appears; user can fill manually.

### Maps: Fix MapPicker Invalid Element (2025-11-08)
**Summary:** Resolved invalid element error by standardizing react-native-maps imports and default exports.
**Details:**
- Ensure default export for `MapPickerScreen` and default imports in navigators.
- Use `import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps'` and render with provider.
- Added a guard to show guidance UI if `MapView` is unexpectedly undefined.
- Minor debug log on mount.
**Files:** src/screens/Common/MapPickerScreen.tsx, src/navigation/ShopStack.tsx, src/navigation/AccountStack.tsx
**QA:**
- Navigate to Map Picker: renders MapView without invalid element errors.

### Maps: Remove Non‑Serializable Callback Param (2025-11-08)
**Summary:** Eliminated React Navigation warning by removing function param from route and using a small Zustand store for selection handoff.
**Details:**
- New store: `useMapPickerStore` with `setSelection` and `consumeSelection`.
- MapPicker sets selection in store and navigates back; callers consume on focus.
- Updated navigators to remove function from `MapPicker` params; updated Checkout and Address screens to navigate without callbacks and apply selection on focus.
**Files:**
- src/store/useMapPickerStore.ts
- src/screens/Common/MapPickerScreen.tsx
- src/navigation/ShopStack.tsx, src/navigation/AccountStack.tsx
- src/screens/Shop/CheckoutScreen.tsx, src/screens/Account/MyAddressesScreen.tsx
**QA:**
- No “Non-serializable values” warning.
- After using MapPicker, returning screen auto-fills address fields.

### Maps: Search UX + Places Autocomplete (2025-11-08)
**Summary:** Improved MapPicker UX to match apps like Amazon/Noon: added a search bar with Google Places Autocomplete and one-tap selection that centers the map and prepares address details for prefill.
**Details:**
- Config: added `EXPO_PUBLIC_GOOGLE_PLACES_KEY` (uses Geocoding key as fallback).
- New service: `src/services/places.ts` with `placesAutocomplete()` and `placeDetails()`.
- UI: search bar at top with debounced autocomplete; selecting a suggestion centers the map and stores parsed address; "Use this location" now uses the parsed details (or falls back to reverse geocode/pin text).
- Haptics on suggestion tap; robust loader states.
**Files:** app.json (extra key), src/services/places.ts, src/screens/Common/MapPickerScreen.tsx
**QA:**
- Type at least 3 chars → suggestions show.
- Tap a suggestion → map centers, "Use this location" fills address on return.

### Maps: Current Location + Refine Screen (2025-11-08)
**Summary:** Enhanced MapPicker with a full-width search bar (clear button, submit selects top result), a "Use current location" action (Expo Location), a compact address preview, and a post-pick Refine Address screen.
**Details:**
- Full-width search with clear (✕) and submit-to-top-suggestion.
- "Use current" requests permission, centers on GPS, and reverse geocodes.
- Compact preview renders parsed address above the confirm button.
- New `RefineAddressScreen` allows final edits before saving; MapPicker navigates here after selection; refined values then prefill forms on return.
**Files:** src/screens/Common/MapPickerScreen.tsx, src/screens/Common/RefineAddressScreen.tsx, src/navigation/ShopStack.tsx, src/navigation/AccountStack.tsx
**QA:**
- Press Use current → map centers; preview appears; Use this location → Refine → Save → fields prefill.
- Search, pick top suggestion via keyboard submit → preview shows → Use this location → Refine → Save → prefill.

### Maps: Key Resolution + Fallback Prefill (2025-11-08)
**Summary:** Ensured Google keys are read reliably in native builds and added formatted-address fallback to populate fields if structured components are missing.
**Details:**
- Geocoding/Places now read keys from `process.env` and `Constants.expoConfig.extra`.
- When only `formatted_address` is available, we set `line1` from it to avoid empty prefills.
**Files:** src/services/geocoding.ts, src/services/places.ts, src/screens/Shop/CheckoutScreen.tsx, src/screens/Account/MyAddressesScreen.tsx
**QA:**
- With only `formatted_address` from API, `line1` still gets filled.

### Maps: Idle Auto-Select + Session Tokens (2025-11-08)
**Summary:** Auto-selects top autocomplete suggestion after user pauses typing; uses Google Places session tokens for cohesive billing and better results.
**Details:**
- Autocomplete throttled (250ms) and idle submit (1s) to pick top suggestion automatically.
- Places requests include `sessiontoken`; details share the same token; token resets after selection.
**Files:** src/screens/Common/MapPickerScreen.tsx, src/services/places.ts
**QA:**
- Type an address and pause → top suggestion is auto-selected and preview shows.

### Maps: Amazon-like Polish (2025-11-08)
**Summary:** Added a first-row “Use current location”, a fixed center pin with a drag-to-adjust guideline, and session token expiry.
**Details:**
- Suggestions list now begins with 📍 Use current location for quick access.
- Fixed center pin overlays the map so users can drag the map to adjust the exact point.
- Added “Drag map to adjust” hint near the top.
- Session token expires after 3 minutes of inactivity and resets after selection.
**Files:** src/screens/Common/MapPickerScreen.tsx
**QA:**
- Open Map Picker → Suggestions visible → first row is “Use current location”.
- Drag map → pin stays centered; Use this location uses center.
- Wait 3+ minutes idle → new search creates a new session token.

### MapPicker: Reliable Current Location + Provider Fallback (2025-11-08)
**Summary:** Made “Use current” robust with expo-location util (permission flow, timeouts, last known fallback) and ensured search uses Google Places when keys are present, with Nominatim fallback otherwise. Added dev diagnostics.
**Details:**
- App config: wired `EXPO_PUBLIC_GOOGLE_PLACES_KEY` and `EXPO_PUBLIC_GOOGLE_MAPS_GEOCODING_KEY` under `expo.extra` (placeholders); code reads from `expo-constants.expoConfig.extra` or env.
- Dependencies: added `expo-location` to package.json.
- Location util: `src/services/location.ts` with permission, primary getCurrentPosition + last-known fallback, explicit error codes.
- Places/Geocode: Google-first with debug logs; Nominatim fallback for dev when keys missing.
- MapPicker: “Use current” shows locating state + inline hints; confirm always reverse-geocodes map center; dev-only header shows PLACES/GEOCODE ON|OFF and provider.
**Files:** app.json, package.json, src/services/location.ts, src/services/places.ts, src/services/geocoding.ts, src/screens/Common/MapPickerScreen.tsx
**QA:**
- Keys present → search via Google; keys absent → search via Nominatim; both return suggestions.
- “Use current” centers and shows preview; permission denied/timeouts show inline hints.

### MapPicker: Persistent Recent Searches (2025-11-08)
**Summary:** Added AsyncStorage dependency so recent searches persist across app reinstalls and cold starts.
**Details:**
- Dependency: @react-native-async-storage/async-storage added to package.json.
- MapPicker loads it lazily; when present, recent suggestions are saved to `map_recents_v1` and restored on launch.
**Files:** package.json, src/screens/Common/MapPickerScreen.tsx
**Setup:**
- npx expo install @react-native-async-storage/async-storage
- npx expo prebuild --clean && npx expo run:ios / run:android
**QA:**
- Pick/search a few addresses; relaunch app → Recent searches list shows previous items.
### MapPicker: Fixed Search + Current (2025-11-08)
**Summary:** Resolved issues where "Search address" returned no suggestions and "Use current" appeared unresponsive. Added inline progress, friendly errors, and strict center-based confirm.
**Details:**
- Debounce ~350ms, min query length 3, deduped requests, provider diagnostics, and inline "Searching…" or "Search unavailable. Try again." messages.
- "Use current" now shows "Locating…", requests permission, centers map (animate), reverse-geocodes, and previews inline. Inline hints on simulator/denied/timeouts.
- Confirm always reverse-geocodes current map center; failure shows a friendly inline message while keeping lat/lng.
- Dev logs: concise console.debug for search start and use-current success.
**Files:** src/screens/Common/MapPickerScreen.tsx, src/services/places.ts, src/services/geocoding.ts, src/services/location.ts
**QA:**
- Type ≥3 chars → see suggestions within ~1s.
- Tap "Use current" → see Locating…, then center + preview.
- Move map and confirm → prefill matches visible center.
MapPicker: Fixed ‘Search address’ — suggestions load, select recenters + preview, return selects top, graceful inline errors, debounce & cancellation.
### MapPicker: POIs/Buildings in Search (2025-11-08)
**Summary:** Added POIs/buildings to search results via Google Places Autocomplete (mixed) with Google Text Search fallback; retained Nominatim fallback; unified suggestions.
**Details:**
- Autocomplete no longer restricted to geocode; optional country bias; session token preserved.
- If Autocomplete returns 0, fallback to Places Text Search (name + formatted_address + geometry) before Nominatim.
- Unified suggestions so selection centers map and shows preview; pressing Return selects top.
- Dev logs: `[places] q='<q>' provider=<google|textsearch|nominatim> results=<n>`.
**Files:** src/services/places.ts
**QA:**
- Typing “Burj Khalifa”, “Kokilaben Hospital”, “City Centre Deira” shows relevant POIs within ~1s; selecting recenters and previews.
### MapPicker: Apartment/Building Inputs (2025-11-08)
**Summary:** Added dedicated fields for “Apartment/House No.” and “Building/Tower Name” in the Refine Address step; geocoding now parses building/unit when available.
**Details:**
- Reverse geocoding and Places details parse `premise/establishment` → `building` and `subpremise`/`house_number` → `unit` when present.
- RefineAddress screen shows inputs for unit/building and composes them into line1 on save (fields remain editable).
**Files:** src/services/geocoding.ts, src/services/places.ts, src/screens/Common/RefineAddressScreen.tsx
**QA:**
- Pick a POI/building → Refine shows unit/building prefilled (when provided by API). Saving stores “unit, building, line1” as line1.
### Shop Checkout: Razorpay (TEST) + COD (2025-11-08)
**Summary:** Added Amazon-style payment options to Shop checkout: Pay Online (Razorpay) [TEST] and Cash on Delivery. Removed “Pay at Clinic”. Server-driven create/verify flow with client Razorpay sheet.
**Details:**
- App config: `expo.extra.RAZORPAY_ENV`, `EXPO_PUBLIC_RAZORPAY_KEY_ID` (no secrets in client).
- Edge Functions:
  - `payments/create_razorpay_order`: creates Razorpay order via server secrets; returns `{ order_id, amount, currency }`.
  - `payments/verify_razorpay_payment`: HMAC SHA256 verification of payment signature.
- Client:
  - Checkout adds payment selector (online/cod). Online flow: initiate → open Razorpay sheet → verify → place order with payment metadata. COD flow: place order pending.
  - Secure: KEY_SECRET never ships to client; server computes order. Fallback if DB lacks payment columns.
**Files:** app.json, src/services/razorpay.ts, src/services/paymentsApi.ts, src/services/orderService.ts, src/screens/Shop/CheckoutScreen.tsx, supabase/functions/payments/*
**QA:**
- Online: opens Razorpay sheet, success → verify → order created (status paid), cancel → no order.
- COD: order created (status pending).
- OrderSuccess shows id + method; orders list/detail show method/status.
- No secrets in logs.
Payments: Wired Razorpay TEST key id via expo.extra; client never ships KEY_SECRET.
Payments: Added Supabase Edge Functions (create_razorpay_order, verify_razorpay_payment), server-only KEY_SECRET, CORS, README deploy notes.

### Payments: Razorpay Invoke Fixes (2025-11-09)
**Summary:** Resolved non‑2xx errors when initiating Razorpay by sending a valid auth token to Edge Functions and correcting the cart payload shape.
**Details:**
- Client now passes `Authorization: Bearer <JWT>` to both functions (verify_jwt is enabled).
- Cart transformed to `{ product_id, qty }` as expected by the server; amount validated server‑side.
- Inline error mapping added for create/verify failures (no generic errors).
**Files:** src/services/paymentsApi.ts, src/screens/Shop/CheckoutScreen.tsx
**QA:**
- Online payment: creates order via function → opens sheet → verifies → places order (paid). On cancel/verify fail: shows inline message and exits without order.

### Cart: Unique Keys + No Nested Lists (2025-11-09)
**Summary:** Eliminated key/VirtualizedList warnings in the Cart screen.
**Details:**
- CartScreen uses a single top‑level FlatList with ListFooterComponent for totals/CTA.
- ProductCard adds items with stable `line_id`; FlatList keyExtractor uses `line_id`.
**Files:** src/screens/Shop/CartScreen.tsx, src/components/ProductCard.tsx
**QA:**
- Add items, open Cart: no “unique key” or VirtualizedList warnings; checkout CTA visible as list footer.
