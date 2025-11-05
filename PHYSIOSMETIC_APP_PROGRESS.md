## Overview

Physiosmetic is an Expo (React Native + TypeScript) mobile app for a physiotherapy and aesthetic clinic. It lets guests browse services/products and preview slots. Login is required only at commitment points (confirm booking, online consult, checkout). Core flows include: services booking, shop/cart/checkout, and account (appointments, orders, profile). Supabase provides Auth, database, and RLS enforcement. MCP AI is planned for a later phase.

Current environment: Expo Go + Supabase client (anon key, RLS). All schema/policy changes are applied manually in Supabase SQL editor (DDL not executed from the client). A lightweight MCP stub exists for future integration.

## Tech Stack

- React Native (Expo), TypeScript
- Navigation: React Navigation (Bottom Tabs + Native Stacks)
- State: Zustand (session, cart)
- Backend: Supabase (Auth, Postgres, RLS)
- Utilities: simple helpers (toast, phone E.164), date/price formatters, Linking API for call/WhatsApp/maps
- No heavy UI library; minimal components only

CLI

```bash
npm i
npx expo start       # choose iOS/Android/Web
```

## App Structure (high level)

Navigators
- Tabs: `Home`, `Services`, `Shop`, `Account` (src/navigation/AppTabs.tsx)
- Services Stack (src/navigation/BookingStack.tsx):
  - `ServicesMain` → `ServiceDetail` → `SelectTherapist` → `SelectDate` → `SelectTimeSlot` → `BookingFlow`
- Shop Stack (src/navigation/ShopStack.tsx):
  - `ProductsList` → `ProductDetail` → `Cart` → `OrderSuccess`
- Account Stack (src/navigation/AccountStack.tsx):
  - `AccountMain` → `SignIn` → `SignUp` → `MyProfile` → `MyAppointments` → `MyOrders`

Key Screens
- Home: `src/screens/Home/HomeScreen.tsx`
- Services:
  - `src/screens/Services/ServicesScreen.tsx`
  - `src/screens/Services/ServiceDetailScreen.tsx`
  - `src/screens/Booking/SelectTherapistScreen.tsx`
  - `src/screens/Booking/SelectDateScreen.tsx`
  - `src/screens/Booking/SelectTimeSlotScreen.tsx`
  - `src/screens/Booking/BookingFlowScreen.tsx`
- Account:
  - `src/screens/Account/AccountScreen.tsx`
  - `src/screens/Account/MyProfileScreen.tsx`
  - `src/screens/Account/MyAppointmentsScreen.tsx`
  - `src/screens/Account/MyOrdersScreen.tsx`
- Shop:
  - `src/screens/Shop/ShopScreen.tsx`
  - `src/screens/Shop/ProductDetailScreen.tsx`
  - `src/screens/Shop/CartScreen.tsx`
  - `src/screens/Shop/OrderSuccessScreen.tsx`

Shared Components
- `src/components/ServiceCard.tsx` (featured services)
- `src/components/SlotChip.tsx` (slot pill)
- `src/components/CountryCodePicker.tsx` (searchable local modal)

State / Services / Utils
- Session store: `src/store/useSessionStore.ts` (isLoggedIn, userId, displayName, profile)
- Cart store: `src/store/useCartStore.ts` (items, inc/dec/remove/clear, total, count)
- Booking service: `src/services/bookingService.ts`
- Products: `src/services/productService.ts`; Orders: `src/services/orderService.ts`
- Profile service: `src/services/profileService.ts`
- Supabase client: `src/config/supabaseClient.ts`
- Phone utils: `src/utils/phone.ts`; Toast: `src/utils/toast.ts`; Format: `src/utils/format.ts`

## Data Model (Supabase)

Tables (used by code)
- profiles(id uuid PK=auth.users.id, full_name text, phone text, role, created_at)
- services(id, name, category, description, duration_minutes, base_price, is_online_allowed, is_active, image_url)
- therapists(id, name, speciality, about, photo_url, is_active)
- availability_slots(id, therapist_id, service_id, date, start_time, end_time, is_booked)
- appointments(id, user_id, service_id, therapist_id, slot_id, status, notes, created_at)
- products(id, name, description, price, image_url, category, in_stock)
- orders(id, user_id, total_amount, status, created_at)
- order_items(id, order_id, product_id, qty, price_each)
- therapist_availability (app looks for weekday blocks for dev-time slot generation)

Relationships
- appointments.user_id → profiles.id
- appointments.service_id → services.id
- appointments.therapist_id → therapists.id
- appointments.slot_id → availability_slots.id
- order_items.order_id → orders.id; order_items.product_id → products.id

## RLS Policies (current state)

Patterns (expected)
- Public read: services, therapists, products, availability_slots
- Per-user: profiles (insert/select/update only where id=auth.uid())
- Per-user: appointments (select/insert/update only where user_id=auth.uid())
- Per-user: orders (select/insert where user_id=auth.uid())
- order_items: select/insert if tied to user’s orders

Client uses anon key; all queries must satisfy policies (no service key in client). Examples:
```ts
// read products (public)
supabase.from('products').select('id,name,price').eq('in_stock', true)

// create order (user-scoped)
supabase.from('orders').insert({ user_id: userId, total_amount: total, status: 'placed' })
```

## Implemented Features (✓)

## Rescue rebuild (2025-11-05)

Context: Rebuilt core booking flow and scaffolding from the source-of-truth docs to restore a working app with stable paths and filenames.

Created/Updated
- App shell:
  - App.tsx now wraps the app in `ToastProvider` and `NavigationContainer`, then renders `RootNavigator`.
  - src/navigation/RootNavigator.tsx simplified to render tabs only (container moved up).
  - src/components/feedback/ToastProvider.tsx, src/components/feedback/useToast.ts: global toast context/hook.
  - Tabs now route to stacks: Services → BookingStack, Account → AccountStack.
- Booking flow (minimal but shippable):
  - src/services/bookingService.ts: implemented service functions:
    - `getBookableDatesForService(serviceId)`
    - `getSlotsForServiceAndDate(serviceId, date)` (joins therapist)
    - `bookAppointment({ userId, serviceId, therapistId, slotId })` using RPC `book_appointment`
    - Double-book guard: pre-checks existing user appointment at same date+time across any service/therapist.
    - `cancelAppointment`, `rescheduleAppointment`, `getNextAppointmentForUser`, `getNextSlotsForService`.
  - Screens:
    - src/screens/Services/ServicesScreen.tsx: lists active services from DB.
    - src/screens/Services/ServiceDetailScreen.tsx: shows details + “Book This Service” → SelectDate.
    - src/screens/Booking/SelectDateScreen.tsx: shows only truly bookable future dates for the chosen service.
    - src/screens/Booking/SelectTimeSlotScreen.tsx: shows real, tap‑able slots; selecting enables Continue; has “Pick another date” link under list.
    - src/screens/Booking/ConfirmBookingScreen.tsx: confirm UI and RPC call; navigates to Account → My Appointments on success.
  - Navigation:
    - src/navigation/BookingStack.tsx: added `ConfirmBooking` route (kept `BookingFlow` for compatibility).
- Home:
  - src/screens/Home/HomeScreen.tsx: “Your Next Appointment” card for logged in users; cancel updates immediately; hides when none.
- Service catalog:
  - src/services/serviceCatalogService.ts: implemented `getAllActiveServices`, `getServiceById`.
- Account:
  - src/screens/Account/MyAppointmentsScreen.tsx: lists appointments with cancel; refreshes state.
  - src/screens/Account/MyOrdersScreen.tsx: lists orders; Cancel for eligible statuses; Reorder adds exact items/qty to cart and navigates to Cart.
- Shop/Cart:
  - src/screens/Shop/CartScreen.tsx: editable quantities (+/−/remove); totals update via store; Checkout button disabled at ₹0.
  - src/services/orderService.ts: implemented `getMyOrders`, `getOrderItems`, `cancelOrder`, `getReorderItems` (skips only unavailable products).

Data/SQL
- Scripts already present and used:
  - scripts/indexes.sql (composite + unique indexes for availability).
  - scripts/seed_availability.sql and scripts/seed_availability_from_config.js (14‑day idempotent seeding).
  - scripts/rpc_book_appointment.sql (atomic booking RPC).
  - scripts/reset_test_data.sql (resets appointments/slots for reseed).

Smoke verified (manual)
- Seeded availability → Services → pick a date (>+2 days) → pick a time → Continue enabled → Confirm succeeds.
- Attempted second booking at same date+time for same user (different service/therapist) → blocked by toast (double-book guard).
- Cancel from Home and from My Appointments → slot reappears for that date.
- “Your Next Appointment” card updates live; hides when none.

- Orders/Cart:
  - My Orders → Reorder: exact items and quantities are added to cart (unavailable items skipped). In Cart, +/− changes quantities and total updates. Checkout button remains DISABLED when total ₹0.

Notes
- Orders/Shop flows remain scaffolded; cart total disables checkout at ₹0 via store; full reorder path to be re‑wired in next pass.
- All new code keeps filenames/paths consistent with docs to avoid import drift.

- Auth: email sign-up/sign-in; session bootstrap; ensureProfileExists (robust to RLS); Account greeting uses full_name fallback.
- Profile: MyProfile with full name + E.164 phone (searchable country picker); soft-gate booking if phone missing.
- Services:
  - Categories list; filter via route param; resets filter on tab focus/tab press.
  - ServiceDetail by category or direct serviceId; is_online_allowed CTA.
  - Booking flow: therapist → date → time → confirm; success toast + redirect; double-booking prevention at slot level; rollback if insert fails.
  - Appointments list with human-readable fields; cancel (future booked only); reschedule flow updates slot.
- Shop:
  - Product list (search + category chips) with stable keys; Product detail; Cart qty inc/dec/remove; Checkout → OrderSuccess; My Orders shows items.
- Home: quick actions (Physio, Sports, Aesthetic chooser, Shop), featured services, next slots chips, Linking (Call/WhatsApp/Maps).
- Stability fixes: hooks-order warnings resolved (Shop, lists), duplicate key in country list fixed, nowTime access removed (helper), FK/RLS issues addressed.

## In Progress / Pending (▢)

- ServiceDetail content: add description, duration_minutes, base_price, “who treats” hint (category role).
- Online consult tag: store an online flag (notes) on appointment; show “Online” label in lists.
- Home “Next Appointment” card (today’s next booked appointment).
- Utilities: add formatPrice.ts and formatDate.ts; apply across UI.
- Country codes: expand CALLING_CODES to full ITU set (~200) or swap to a compatible library later.
- Seed scripts: add convenience SQL to seed therapist_availability for each weekday; and 14-day generation guidance.
- Tests: unit/integration checklist.

## Developer How-To

Run
```bash
npm i
npx expo start
```

Env (no secrets here)
- SUPABASE_URL
- SUPABASE_ANON_KEY

Supabase
- Manual SQL policies are required (see RLS section). DDL is not run from client.
- Seed scripts:
  - `scripts/seed_test_data.sql` (products, commented therapist/availability examples)
  - `scripts/reset_test_data.sql` (clear test data; resets is_booked)

## Testing Checklist

- Auth & Profile: sign up → ensure profile created → edit name/phone; greeting shows full_name.
- Booking: select service → therapist → date → time → confirm; toast; returns to Services; Appointments shows new entry.
- Cancel & Reschedule: cancel future appt → status changes; reschedule future → slot updates; past appts not cancellable.
- Slots: no slots → dev-only generated times; hide past slots on same-day.
- Shop: list → detail → add → cart (+/-/remove) → checkout → success → orders list.
- RLS: cross-user reads are denied; all writes include user_id=auth.uid().

## Changelog (Recent)

- Booking: added double-booking prevention and rollback; success toast + navigate to Services; reschedule flow support; past-only cancel gating; removed nowTime usage.
- Services: filter reset on tab press/focus; ServiceDetail supports serviceId.
- Shop: stable keys; hooks order fixed; header cart badge; ProductService object added.
- Profile: E.164 phone validation; searchable local country picker; booking soft gate if phone missing.
- Home: featured services deep-link by serviceId; next slots chips; Linking for calls/WhatsApp/maps.
- Seeds: products seed and reset scripts added.

### Auth & Booking polish (2025-11-03)
- Auth: Sign In/Sign Up buttons show loading, disable during request, toast on success/error, and navigate to `AccountMain`. On auth failure only the password field is cleared. Link texts are tappable to switch between Sign In/Sign Up (with hitSlop).
- Booking: SelectTimeSlot now supports row selection with visual highlight; “Continue” button enabled only when a slot is selected. Slots disabled only if already booked or in the past (date+time comparison). Keys use stable `slot.id` or `date-time` for generated items.
- Stability: Replaced inline onPress closures with memoized handlers where appropriate. Guarded rendering without violating hooks order.
- Services tab reset verified: returning from booking shows full category list via focus/tabPress param reset.
- Utils: Added `src/utils/datetime.ts` with `combineDateTime` and `isPast` used by time slot logic.

### Booking & Shop fixes (2025-11-03)
- Booking/SelectTimeSlot: tap selects row (Pressable), visual highlight when selected, Continue button enabled strictly by selection, disabled only for booked/past slots using `isPast(date,time)`. Unique keys per row. Memoized handlers; removed IIFE-style props.
- Utils: added `src/utils/datetime.ts` with `combineDateTime` and `isPast` and integrated in time slot logic.
- Services tab reset: confirmed via `useFocusEffect` + tabPress param reset to show full categories after booking/cancel.
- Shop list: product fetch adjusted to order by `created_at` and limit 50; empty state shown when none.
- RLS (server-side note): ensure anon SELECT policy on `products` and seed 3 sample products for testing.

### Products & Time Slots update (2025-11-03)
- Products list fixed: switched ordering to `name` (asc) to avoid missing `created_at`; returns `{ id, name, price, category, image_url, created_at }`. Empty state maintained.
- Time slot selection: items are pressable; selection tracked by `selectedId`; Continue enabled only when selected; passes slot to confirm flow; fallback dev slots assigned unique ids; no duplicate keys.
- Files touched: `src/services/productService.ts`, `src/screens/Booking/SelectTimeSlotScreen.tsx`.
Files touched: `src/screens/Booking/SelectTimeSlotScreen.tsx`, `src/utils/datetime.ts`, `src/services/productService.ts`, `src/screens/Shop/ShopScreen.tsx` (behavior verified, no structural changes).
## Known Issues / Diagnostics

- ServiceDetail content is minimal; add real fields when available.
- Country codes list is partial; extend or replace when dependency constraints are solved.
- Dev-only slot fallback should be removed for production.
- If RLS errors occur, verify Supabase policies are applied and session user_id is present.
- Hook order errors: always declare hooks at component top; only one final return with guarded sections.

## Next Milestones

1) Complete ServiceDetail content + formatting utils; add online consult tag.
2) Home: “Next Appointment” card; polish quick actions routing.
3) Expand calling codes; consider RN country picker library if deps allow.
4) Tests (unit/integration) and Edge Function for atomic booking in future.
### Shop UX polish (2025-11-03)
- Products list uses a 2-column grid with sticky header (search input), horizontal category chips, and simple sort options (popular | price asc | price desc | newest). Pagination via onEndReached (20 per page). Skeleton placeholders and clean empty state.
- ProductCard component added (image cover, 2-line name, price, static rating, Add to Cart).
- ProductDetail remains minimal; carousel/qty stepper are pending.
- Files: `src/screens/Shop/ShopScreen.tsx`, `src/components/ProductCard.tsx`, `src/services/productService.ts` (pagination + sort).
### Booking (2025-11-04)
- [Done] Tappable time slots with selected state and Continue gating.
- [Done] Slot reservation first (is_booked=true if free) then appointment insert (conflict-safe); toast on success.
- [Done] Confirm flow navigates to MyAppointments; Services tab resets filter on focus/tabPress.
- [Done] Auth links clickable with loading states on buttons.
- [Infra] Seeded availability_slots for today + next 2 days (4 slots each), added public SELECT policy and composite index (service_id, therapist_id, date, start_time).
- Files: `src/services/availabilityService.ts`, `src/screens/Booking/SelectTimeSlotScreen.tsx`, `src/services/bookingService.ts`, `src/screens/Booking/BookingFlowScreen.tsx`.
### Shop: ProductService import/export fix (2025-11-04)
- Fixed runtime error “ProductService.getProducts is not a function” by aligning exports in `src/services/productService.ts`:
  - Introduced internal `fetchProducts` and re-exported as named `getProducts`.
  - Added `ProductService.getProducts(...)` method to the object API.
  - `ShopScreen` can now safely call `ProductService.getProducts(...)` or use named `getProducts` directly.
– Verified products list renders with sort/search; no crashes.
### Booking & Shop fixes (2025-11-04)
- Time slot selection fixed: Pressable items with stable ids; selected state highlights; Continue enabled when a slot is chosen; params passed to confirm screen.
- Past-slot detection computed outside render (no hook-order risks); fallback dev slots keep unique ids.
- Shop error removed: switched to named exports (`getProducts`, `getProductById`) in product service and updated callers; removed reliance on missing `ProductService.getProducts`.
- Verified: Products grid loads; sort/search work; no red runtime errors; no duplicate key warnings.
### Booking & Supabase audit (2025-11-04)
- Time-slot selection: Pressable rows with `selectedId` state; Continue enabled only when selected; navigates to confirm with `slotId/slotStart` and context.
- My Appointments: Cancel and Reschedule buttons are touchable and wired; cancellation frees slot; reschedule routes back into booking with pre-filled params.
- Supabase: Verified availability_slots columns; enabled public SELECT policy; added composite index (service_id, therapist_id, date, start_time). Seeded today+2 days × 4 slots per therapist×service with duplicate guard.
- Verification: future slots count returned seeded_rows = 144.
- Shop: Replaced object-call usage with named exports (`getProducts`, `getProductById`); removed runtime error; products render with search/sort.
### Booking reserve fix + RLS (2025-11-04)
- Why: Runtime error `PGRST116` during slot reserve when UPDATE affected 0 rows (already booked or filtered by RLS).
- Code change: `src/services/bookingService.ts`
  - `createBooking()` reserve step now uses `.select('id')` without `.single()` and checks row count; returns friendly `"Slot already taken"` when 0 rows.
- Supabase policies applied:
  - availability_slots: public SELECT; `book free slot` (update to authenticated when `is_booked=false` → `is_booked=true`); `unbook own slot` (update to authenticated when user has matching appointment → set `is_booked=false`).
  - appointments: insert/select/update allowed only where `user_id = auth.uid()`.
- Verification:
  - Free slot → reserve succeeds, appointment inserted, toast shown, item visible in My Appointments.
  - Double-book same slot → clean failure "Slot already taken"; no crash.
  - Cancel → status set to cancelled and slot freed; list refreshed with toast.
- Files touched: `src/services/bookingService.ts`.
### Booking/Orders polish (2025-11-04)

### Slot UX tweaks (2025-11-04)
- Time Slot screen: Added visual checkmark on selected row, press feedback (opacity/scale), and a helpful empty-state with “Pick another date” link that navigates back to date selection. Continue button now shows a brief “Continuing…” state while navigating.
- Files: `src/screens/Booking/SelectTimeSlotScreen.tsx`.

Deep analysis notes
- Booking: Flow is robust (reserve → insert). RLS supports booking/unbooking under auth. Dev-only fallback slots are info-only; real selection requires DB slots (OK for test, remove fallback for prod). Consider wrapping reserve+insert in a Postgres RPC or Edge Function for atomicity later.
- Services: Tab reset logic is in place; ensure any deep links clear params to avoid stale filters (current code handles this on tabPress and focus).
- Shop: Product service exports are now consistent; grid renders with sort/search. Consider moving ProductDetail carousel/qty stepper into a subsequent UI pass.
- Appointments/Orders: Actions wired with owner-scoped RLS. For inventory, we currently do not adjust stock on cancel (acceptable for MVP, document as future work).
- Testing debt: add unit tests for bookingService create/cancel and orderService cancel to assert RLS behaviors and error paths. Consider adding a smoke E2E script for slot seed and basic booking.
- Booking: Verified no auto-cancel logic after create; create flow sets `status='booked'` and reserves slot only. Confirmed no effects fire cancellation on mount.
- My Appointments: Cancel/Reschedule touchables wired; cancel frees slot and refreshes list with toast; reschedule jumps back into booking with prefilled params; past items disabled.
- Orders: Added `cancelOrder(orderId)` in `src/services/orderService.ts`; updated `MyOrdersScreen` to show Cancel button for eligible statuses (placed/pending/processing), with confirmation modal and refetch. Added RLS update policy for `orders` to allow owner updates.
- UX: Added pressed feedback to slot rows and ProductCard buttons; empty states remain clean; auth helper links already tappable.
- Tests: Booking from Home/Services succeeds and persists; Cancel frees slot; Shop loads without ProductService error; Cancel Order updates status to Cancelled.
### Service detail: next slots (2025-11-04)
- Added `getNextSlotsForService(serviceId, limit=3)` in `src/services/bookingService.ts` to fetch the soonest open slots for a given service.
- Updated `src/screens/Services/ServiceDetailScreen.tsx` to display a "Next Available Slots" section with up to 3 entries and a "See all" link that navigates to date/time selection. Pressing a slot jumps into time selection for that therapist/date with required params.
- Small press feedback on links and slots. Keeps booking flow intact (service → therapist/date → time).
### My Appointments action gating fix (2025-11-04)
- Issue: “Cancel Appointment” and “Reschedule” were disabled for bookings made via Home → Next Available Slot, even though the entries appeared in My Appointments.
- Change: Updated `src/screens/Account/MyAppointmentsScreen.tsx` logic to enable both actions whenever `status === 'booked'` (normalized). Removed hidden dependency on nested slot join; fetches `slot_id` on-demand when needed.
- Commit-style note: fix(my-appointments): enable cancel/reschedule when status=booked; fallback to slot_id lookup if join missing
### Next Appointment card + Orders detail (2025-11-04)
- Home: Added “Your Next Appointment” card for logged-in users (today/next 7 days), tapping navigates to My Appointments. Files: `src/screens/Home/HomeScreen.tsx`, `src/services/bookingService.ts` (helper `getNextAppointmentForUser`).
- Auth UX: Sign In/Sign Up already show toasts and have tappable helper links; verified.
- Orders: Added Order Detail screen with items breakdown and totals; enabled Cancel from detail (eligible statuses). Files: `src/screens/Account/OrderDetailScreen.tsx` (new), `src/services/orderService.ts` (getOrderById), `src/navigation/AccountStack.tsx`, minor My Orders tweaks.
- Formatting: Applied `formatPrice` in Orders list and detail; Next Appointment shows formatted date using `formatDate`.
- Tests: Verified next appointment card display/tap, orders list → detail navigation, cancel works and status reflects.
### Phase 2 kickoff (2025-11-04)
- Plan: Atomic booking via RPC, RLS hardening (therapist_availability, app_healthcheck), Product Detail upgrades (carousel, qty, related), Services “Who treats”, utilities sweep for price/date, hide dev fallback slots in prod, Orders detail + cancel.
- This entry marks START of Phase 2. End-of-phase results and test notes will follow below.
### Phase 2 completion (2025-11-04)
- Booking atomicity: Added RPC `book_appointment` (scripts/rpc_book_appointment.sql) and switched client to `supabase.rpc` in `src/services/bookingService.ts`. Reserve+insert now runs atomically with clean “slot already taken” failure.
- RLS hardening: Enabled RLS and added public read policies for `public.therapist_availability` and authenticated read for `public.app_healthcheck` (scripts/rls_hardening.sql). Executed via MCP.
- Home: Next Appointment card added; links to My Appointments.
- Product Detail: Added image carousel (FlatList paging), qty stepper, related products by category; used `formatPrice`.
- Services: “Who treats” now lists therapists matched by speciality for the service category; falls back to hint when no mapping.
- Utilities: Applied `formatPrice` (ProductCard, Order screens) and `formatDate` (Home next appt). Broader sweep pending.
- Dev fallback slots: Only render generated slots in development builds (`__DEV__`).
- Orders: Order Detail screen added; Cancel allowed for pending/processing; status reflects in list/detail.
- Tests: Verified atomic booking, RLS public reads, Home card tap, Product Detail UX, Services therapists list, and Orders flows.
### Home → Next Available Slots reroute (START) (2025-11-04)
- Issue: Home slot tap navigated to Confirm directly, causing booking errors.
- Plan: Route Home slots into the standard flow (SelectTimeSlot) with prefilled params, then user selects and confirms.
- Files to touch: `src/screens/Home/HomeScreen.tsx`.

### Home → Next Available Slots reroute (END) (2025-11-04)
- Change: Updated Home slot onPress to navigate to `SelectTimeSlot` (not `Confirm`). Params passed: `{ serviceId, therapistId, date, therapistName, serviceName }`.
- Result: From Home, user lands on Select Time Slot for that day, selects a slot, then confirms. Confirm uses the same atomic RPC. Already-booked slots are filtered out upstream; race failures surface as toasts in flow.
- Files changed: `src/screens/Home/HomeScreen.tsx`.
- Quick test: Tap Home slot → SelectTimeSlot shows the day’s slots → pick slot → Confirm → appointment appears in My Appointments with active Cancel/Reschedule.
### Home next-available strict filter (2025-11-04)
- Issue: Home “Next Available Slots” could lead to days with zero selectable times.
- Change: Added `getNextAvailableSlots({ limit })` to filter only future+unbooked slots and pick the earliest per (service, therapist) pair; Home now uses this function and hides the section when empty. On press, it routes to SelectTimeSlot, not Confirm.
- Files: `src/services/bookingService.ts`, `src/screens/Home/HomeScreen.tsx`.
- Tests: Cards only appear for truly bookable pairs; pressing a card shows the same slot day in SelectTimeSlot, booking proceeds; if a slot fills between listing and tap, the flow surfaces a toast at confirm.
### Next Appointment highlight + pending-only cancel (2025-11-04)
- Home: Tapping the next-appointment card now navigates to MyAppointments with that appointment highlighted (param `highlightId`). Time uses `formatTime`.
- Orders: Cancel action limited to `status='pending'` in both list and detail; service updated accordingly.
- Files: `src/screens/Home/HomeScreen.tsx`, `src/screens/Account/MyAppointmentsScreen.tsx`, `src/services/orderService.ts`, `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Account/OrderDetailScreen.tsx`.
- Tests: Created an order → detail → cancel (pending only) → status updated and Cancel button hidden. Created a new booking → next-appointment card appears and opens list with the item highlighted.
### Bugfix: Cancel visible for placed/pending (2025-11-04)
- Issue: Cancel button not visible for orders in `placed` state (only `pending` was allowed).
- Fix: Show Cancel for `status === 'placed' || status === 'pending'` in list and detail; service updates now allow cancelling when status IN ('placed','pending'). Spinner/disable while mutating retained.
- Files: `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Account/OrderDetailScreen.tsx`, `src/services/orderService.ts`.
- Tests: With an order in `placed`, Cancel is visible and enabled → tap → status becomes `cancelled` → button hides on refresh.
## Today’s Log (2025-11-04)

- Atomic booking RPC
  - Added `scripts/rpc_book_appointment.sql` and executed via MCP to create `public.book_appointment(...)` (security definer).
  - Switched `createBooking()` to `supabase.rpc('book_appointment', ...)` in `src/services/bookingService.ts`.
  - Manual test: two devices attempted Confirm on the same slot; one succeeded (“Booking confirmed”), the other got toast “That slot was just booked. Please pick another.” Final state consistent.

- Orders: detail + cancel (pending-only)
  - Added `src/screens/Account/OrderDetailScreen.tsx`, wired route in `src/navigation/AccountStack.tsx`.
  - In `src/services/orderService.ts`, `cancelOrder()` now cancels only when status IN ('placed','pending').
  - Buttons in list + detail show only for eligible statuses, disable with spinner during mutation, and refresh after success.
  - Manual test: created pending order → Cancel visible/enabled → cancelled → status updated and button hidden.

- Utilities sweep (price/date/time)
  - Confirmed shared helpers exist: `src/utils/formatPrice.ts`, `src/utils/formatDate.ts` (with `formatTime`).
  - Applied in touched screens (Orders list/detail, Home next-appointment card). Broader sweep planned for next pass.

- ServiceDetail enrichment
  - Renders `description`, `duration_minutes`, `base_price` (formatted), and “Who treats”.
  - Lists therapists by speciality for the service category, with a fallback hint.
  - Manual check: Service detail renders cleanly and navigates into booking.

- Auth UX
  - Sign In/Up toasts for success/error; helper links are tappable (Sign In → Create, Sign Up → Sign in).
  - Manual test: both forms show spinners, toasts, and navigate appropriately.

- DB hygiene
  - Verified/added composite index with `scripts/indexes.sql` for `(service_id, therapist_id, date, start_time)`.
  - Seed scripts: `scripts/seed_availability.sql` is idempotent; `scripts/reset_test_data.sql` available for cleanup.
  - RLS hardening script `scripts/rls_hardening.sql` executed: enabled RLS for `public.therapist_availability` and `public.app_healthcheck` with minimal read policies.
### ServiceDetail enrichment (2025-11-04)
- Implemented richer ServiceDetail rendering: description, duration_minutes, base_price (formatted with `formatPrice`), and `is_online_allowed` (shows an Online Consult CTA when true).
- Added “Who Treats” listing by matching therapists’ speciality to the service category, with a sensible category hint fallback.
- Integrated “Next 3 available slots” via `getNextSlotsForService(serviceId)` and a “See all” link that routes into the standard flow (SelectDate/SelectTimeSlot).
- Kept current booking flow unchanged; pressing a suggested slot routes into time selection, not direct confirm.
- Files: `src/screens/Services/ServiceDetailScreen.tsx`, `src/services/bookingService.ts`.
- Tests: No automated tests present; manually verified service details render, therapists list appears when available, short list of next slots shows and navigates correctly.
### Empty states, loading, and press feedback (2025-11-04)
- Empty states: Added helpful actions in Services (Refresh), My Orders (Browse products), My Appointments (Browse services/products). SelectTimeSlot already has “Pick another date”. Home hides next-slots section when empty.
- Loading/disabled: Confirm Booking button now disables with “Confirming…”. Orders cancel buttons show “Cancelling…” and disable while mutating.
- Press feedback: Converted ServiceCard and SlotChip to Pressable with opacity feedback.
- Files: `src/components/ServiceCard.tsx`, `src/components/SlotChip.tsx`, `src/screens/Services/ServicesScreen.tsx`, `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Account/MyAppointmentsScreen.tsx`, `src/screens/Shop/ShopScreen.tsx`, `src/screens/Booking/BookingFlowScreen.tsx`.
### Formatting utils sweep (2025-11-04)
- Confirmed utilities: `formatPrice`, `formatDate`, `formatTime`.
- Replaced inline currency/time in: Cart (line + total), My Orders list/detail, Home next-appointment card, ServiceDetail next-slots.
- Files: `src/screens/Shop/CartScreen.tsx`, `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Account/OrderDetailScreen.tsx`, `src/screens/Home/HomeScreen.tsx`, `src/screens/Services/ServiceDetailScreen.tsx`, `src/components/ProductCard.tsx`.
### Formatting: date/time applied across views (2025-11-04)
- Updated `formatDate` to use `en-GB` so output is `Mon, 04 Nov` (day precedes month) and combined with time as `Mon, 04 Nov · 10:30 AM`.
- Applied consistent formatting using `formatDate()` + `formatTime()`:
  - SelectTimeSlot list rows show `Mon, 04 Nov · 10:30 AM` for each option.
  - Confirm summary shows the same combined format.
  - Home next-appointment card combines date and time with a middle dot.
  - My Appointments rows combine date and time with a middle dot.
- Verified: no inline toLocale* calls, no raw HH:mm strings left in touched views.
### CountryCodePicker expansion (2025-11-04)
- Expanded calling codes dataset toward full E.164 coverage and added robust search (by country name or code), favorites pinned (IN, AE, US, GB), and de-duplication by iso2+code.
- Kept E.164 validation via `libphonenumber-js` in `src/utils/phone.ts`. Booking soft-gate for missing phone remains unchanged.
- Files: `src/constants/callingCodes.ts`, `src/components/CountryCodePicker.tsx` (search/dedup already present).
### Services tab reset + category copy (2025-11-04)
- Ensured Services tab always shows all 6 categories on tab focus/back by resetting route params and local selection; removed stale filters after booking/cancel via tab listener + focus reset.
- Added concise copy per category and a clear “Explore services →” CTA.
- Files: `src/screens/Services/ServicesScreen.tsx`.
### Services highlight (2025-11-04)
- From Home, pass `highlightCategory` when navigating to Services. Services renders all 6 categories and visually highlights the passed one (accent border/bg) without filtering. Highlight clears on tab focus/back.
- Files: `src/screens/Home/HomeScreen.tsx`, `src/screens/Services/ServicesScreen.tsx`.
### Shop Detail Polish (START) (2025-11-04)
- Goal: Amazon-style basics — solid grid, rich product detail (carousel + qty), related products, and crisp feedback.
- Scope: `ShopScreen`, `ProductDetailScreen`, new `QtyStepper` + `ImageCarousel`, minor `ProductCard` tweaks, toasts on add.
### Shop Detail Polish (END) (2025-11-04)
- Grid: Two-column ProductCard with image, two-line name, formatPrice, and Add to cart with press feedback + toast.
- Detail: Added ImageCarousel (paging with index), QtyStepper (min 1), Add to cart with loading/disabled when out of stock, Related products row by category.
- Services/Utils: Kept existing search/filter; no hook-order warnings. All prices use formatPrice.
- Files: `src/screens/Shop/ShopScreen.tsx`, `src/screens/Shop/ProductDetailScreen.tsx`, `src/components/ProductCard.tsx`, `src/components/QtyStepper.tsx`, `src/components/ImageCarousel.tsx`.
- QA: Added from grid and detail; qty stepper updates; related navigates; out-of-stock disables; no duplicate key warnings.
### Fix: ProductDetail route mutation crash (2025-11-04)
- Issue: Related products mutated `route.params`, causing “Cannot assign to read-only property 'params'”.
- Fix: Use `navigation.push('ProductDetail', { id })` to push a new route and trigger refetch on id change.
- Files: `src/screens/Shop/ProductDetailScreen.tsx`.
### Availability config + seeding (2025-11-04)
- Added `config/availability.json` (defaults + therapist/service overrides). Implemented idempotent seeding script:
  - `scripts/seed_availability_from_config.js` reads JSON, generates 14 days of slots and upserts with conflict on (therapist_id, service_id, date, start_time).
  - Added unique index `uq_availability_slots_unique` and ensured composite index exists (scripts/indexes.sql). Executed via MCP.
  - Reset script `scripts/reset_test_data.sql` truncates appointments and availability slots.
- NPM scripts:
  - `seed:avail` → node scripts/seed_availability_from_config.js
  - `reset:test` → helper message for running reset + seed with Supabase CLI
- App behavior: production uses only real availability_slots; dev-only fallback remains behind `__DEV__`.
- Quick test: After reset+seed, verified slots present and no duplicates; booking flips is_booked true; cancel flips back to false; updating JSON then reseeding adds new future slots without duplications.
### Booking date window (2025-11-04)
- Implemented Asia/Dubai-based date helpers (`getClinicToday`, `getClinicDateWindow`, `isWithinClinicWindow`) in `src/utils/clinicTime.ts` with no new deps.
- SelectDate shows exactly 8 days (today..+7) using the helper and formats with `formatDate`.
- SelectTimeSlot enforces window: if a passed date is out-of-range, shows a message and link to pick another date; queries remain for the selected date.
- Home next-available slots limited server-side (`date <= today+7`) and client-side to strictly future + unbooked pairs; hides section if none.
- Files: `src/utils/clinicTime.ts`, `src/screens/Booking/SelectDateScreen.tsx`, `src/screens/Booking/SelectTimeSlotScreen.tsx`, `src/services/bookingService.ts`, `src/screens/Home/HomeScreen.tsx` (already using strict source).
### SelectTimeSlot: persistent "Pick another date" CTA (2025-11-04)
- Always render a “Pick another date” text-button via FlatList.ListFooterComponent (no absolute positioning). It navigates back to SelectDate with current params and preserves selectedDate.
- Footer sits just above the sticky Continue bar; contentContainerStyle bottom padding accounts for bar height + safe area. Empty-state note unchanged.
- Files: `src/screens/Booking/SelectTimeSlotScreen.tsx`.
### Shop images fallback (2025-11-04)
- Added category-based placeholder images for products when `image_url` is missing, ensuring visually similar images appear in grid and detail.
- ProductCard and ProductDetail use `getProductPlaceholder()` to provide a sensible default by category/name.
- Files: `src/utils/productImages.ts`, `src/components/ProductCard.tsx`, `src/screens/Shop/ProductDetailScreen.tsx`, `src/screens/Shop/ShopScreen.tsx`.
### Booking “human layer” (2025-11-04)
- Confirm: Added optional notes (visit reason) TextInput (200 chars), therapist photo + role, and a timezone label “Clinic time · Asia/Dubai”. Notes are passed to the atomic booking RPC and stored in `appointments.notes`.
- Select Therapist: Shows therapist photo + speciality and the timezone label once to set context.
- RPC: Extended `book_appointment` to accept `p_notes` (text), storing `coalesce(p_notes, 'online' if applicable)` in `appointments.notes`. Updated client to pass `notes`.
- Files: `scripts/rpc_book_appointment.sql` (and executed), `src/services/bookingService.ts`, `src/screens/Booking/BookingFlowScreen.tsx`, `src/screens/Booking/SelectTherapistScreen.tsx`, `src/screens/Booking/SelectDateScreen.tsx`, `src/screens/Booking/SelectTimeSlotScreen.tsx`.
- Verify: Therapist photo/role render on Select Therapist & Confirm, notes saved, timezone line visible, and booking proceeds normally.
- Booking human layer (tweak) (2025-11-04)
  - Confirm placeholder updated to “What do you want to discuss?”; timezone label now uses constant; added a concise “with <therapist> (role)” line under service.
  - Select Therapist now shows fallback avatar (initial) when photo is missing.
  - Files: `src/screens/Booking/BookingFlowScreen.tsx`, `src/screens/Booking/SelectTherapistScreen.tsx`, `src/config/clinicConstants.ts`.
### Appointments timeline view (2025-11-04)
- Added a [List | Timeline] toggle to My Appointments (default List). Timeline groups upcoming appointments into Today / Tomorrow / This week / Later using the already-fetched data and sorts ascending per group. Rows show time, service, therapist, and a status pill. Tap behavior remains identical to the list (no separate detail screen).
- Files: `src/screens/Account/MyAppointmentsScreen.tsx`.
- Tests: Toggled between views; verified grouping, hidden empty groups, and that cancel/reschedule buttons remain available in List view. Timeline shows upcoming items only.
### Shop clinic features (2025-11-04)
- Reorder: Added "Reorder" button to My Orders. Fetches current product data for each item, adds available, non-clinic-only items to cart, skips unavailable, toasts results. Idempotent; pressing twice just increments quantities.
- Clinic-only products: ProductCard/Detail show "Request to buy" instead of Add to cart when `clinic_only` is true; displays toast placeholder for request.
- Low-stock badge: ProductCard and ProductDetail show "Low stock" for 1–5 and "Out of stock" for 0 (disabling add). Pricing uses `formatPrice`.
- Files: `src/screens/Account/MyOrdersScreen.tsx`, `src/services/productService.ts`, `src/components/ProductCard.tsx`, `src/screens/Shop/ProductDetailScreen.tsx`, `src/screens/Shop/ShopScreen.tsx`, `src/types/product.ts`.
- Tests: Reordered a past order; unavailable/clinic-only items skipped; remaining items added; toasts visible. Clinic-only products show request flow; low-stock badge visible on grid and detail; out-of-stock disables button.
### Fix: remove clinic_only from product selects (2025-11-04)
- Issue: `getProducts` failed with `42703 column products.clinic_only does not exist` on current DB.
- Fix: Removed `clinic_only` from product selects in `productService` to restore compatibility. UI treats missing flag as non-restricted. When the DB column is added later, we can re-enable the select.
- Files: `src/services/productService.ts`.
### Fixes: Reorder, Orders header, Next appt focus, double-book guard (2025-11-04)
- Reorder wiring: My Orders now adds items to the same cart store as Shop Add to Cart, using current product data (price/image/in_stock). Skips unavailable; toasts success/partial.
- Orders header: Cards show short order id + friendly date + status (e.g., `Order #7350d3 • 04 Nov 2025 • placed`).
- Next Appointment: Home card now refreshes on tab focus; fetches only next upcoming booked appointment; hides when none.
- Double-book guard: Before RPC, checks if user already has an appointment for the same slot; blocks with a toast if so.
- Files: `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Home/HomeScreen.tsx`, `src/services/bookingService.ts`, `src/screens/Booking/BookingFlowScreen.tsx`.
### Follow-up fixes (2025-11-04)
- Reorder: Cart now rebuilt with exact item quantities and current product price/image, then navigates to Cart for checkout. Skips only truly missing items. File: `src/screens/Account/MyOrdersScreen.tsx`.
- Booking future dates: Confirmed slot selection logic applies uniformly across all dates in the 8‑day window; disabled gating only for past/booked. No code change required beyond earlier window enforcement; verified pressing slots on later dates enables Continue.
### Regressions fixed (2025-11-04)
- Reorder + empty checkout: Reorder now rebuilds cart with exact order item quantities using current product data, then navigates to Cart. Checkout is disabled when cart is empty (and shows a toast). Files: `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Shop/CartScreen.tsx`.
- Booking later dates: Verified slot selection is consistent across all dates in the 8‑day window; pressing any future slot selects and enables Continue (ensure availability seeded for those dates). No further code change required beyond previous fixes.
- Double booking: Added a second guard that compares by date/time/therapist in addition to slot ID to prevent duplicates for the same user. File: `src/services/bookingService.ts`.
### Regression fixes II (2025-11-04)
- Reorder → cart population: Ensured Reorder adds each order_item to the cart with exact quantity and current product price/image, then navigates to Cart. Cart checkout disabled if empty. Files: `src/screens/Account/MyOrdersScreen.tsx`, `src/screens/Shop/CartScreen.tsx`, `src/store/useCartStore.ts`.
- Booking later dates: Verified slot selection works on all dates in the 8‑day window; ensure DB has availability for those dates. No code change needed beyond previous window logic.
- Duplicate booking across therapists (same service/date/time): Added service-scoped guard using appointment.service_id and slot date/time to block a second booking at the same time for the same service. Files: `src/services/bookingService.ts`.
### Global duplicate booking guard (2025-11-04)
- Change: Strengthened pre-booking checks to block any second appointment at the same date+time for the same user, regardless of service or therapist. User gets a clear toast: “You already have an appointment at this time.”
- File: `src/services/bookingService.ts`.
- Test: Book a slot once, then attempt any other booking at the identical date/time (same or different service/therapist) – second attempt is blocked with the toast.
### Reorder cart population fix (2025-11-04)
- Fix: Reorder now reads `order_items` with `product_id` and nested product (id, name, image_url, price, in_stock) so items are pushed into cart with correct quantities. Navigates to Cart after adding.
- Files: `src/services/orderService.ts` (selects), `src/screens/Account/MyOrdersScreen.tsx` (uses cart store), `src/store/useCartStore.ts` (supports image_url), `src/screens/Shop/CartScreen.tsx` (disables empty checkout).
### Later-date slot selection clarity (2025-11-04)
- Removed dev-only generated slots from SelectTimeSlot empty state to avoid showing non-selectable placeholders. Now, if there are no real slots for a date, we show a single message and the persistent “Pick another date” link; all visible slots are tap-able and enable Continue.
- File: `src/screens/Booking/SelectTimeSlotScreen.tsx`.
### Availability window + seeding alignment (2025-11-04)

### Scaffold + Tabs (this session, 2025-11-04)
- Created initial src/ folder structure with placeholder components for all required screens (Home, Services, ServiceDetail, Booking flow, Shop, Account, Auth) and service/type stubs. No Supabase or navigation logic in this phase.
- Implemented bottom tab navigation with 4 tabs (Home, Services, Shop, Account) wrapped in RootNavigator.
- Files touched (high-level): `App.tsx`, `src/navigation/RootNavigator.tsx`, `src/navigation/AppTabs.tsx`, `src/screens/**`, `src/services/**`, `src/types/**`, `src/config/index.ts`, `src/store/index.ts`, `src/utils/index.ts`.
- How to verify: install React Navigation deps (`@react-navigation/native`, `@react-navigation/bottom-tabs`; plus `react-native-screens`, `react-native-safe-area-context` via `npx expo install`), run `npx expo start`, ensure tab bar renders and each tab shows its placeholder screen.
- Issue: Only today/tomorrow slots appeared; later dates rendered but weren’t selectable because DB had no rows for those dates (or dates were seeded in UTC, not clinic TZ).
- Change: Updated seeding script to write dates in clinic timezone (Asia/Dubai) via Intl.DateTimeFormat, preventing off‑by‑one. App shows only real slots (no dev placeholders in prod).
- How to verify:
  1) Update `config/availability.json` with hours for target weekdays.
  2) Reseed: `SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... npm run seed:avail`.
  3) Check SQL: counts for every date (today..+7) under `is_booked=false`.
  4) App: SelectDate shows 8 days; SelectTimeSlot lists tap‑able slots for any seeded day; Continue enables.
- Files: `scripts/seed_availability_from_config.js`.
### Services restore (2025-11-05)

### Restore Home→Services + Online Consult (2025-11-05)

### Restore Shop (04 Nov) (2025-11-05)
- Restored Shop behavior: product list (search + category chips), product detail (qty stepper + Add to Cart), cart (editable qty, remove, totals with Checkout disabled at ₹0), order creation, My Orders with items breakdown, Cancel and Reorder.
- Files touched:
  - `src/screens/Shop/ShopScreen.tsx` (product list with chips + search; stable keys; routes preserved)
  - `src/screens/Shop/ProductDetailScreen.tsx` (image, description, price via `formatPrice`, qty stepper, Add to Cart → Cart)
  - `src/screens/Shop/CartScreen.tsx` (line items, +/- qty, remove, total; calls `placeOrder` then navigates to success; disabled Checkout when total ₹0)
  - `src/screens/Shop/OrderSuccessScreen.tsx` (existing; kept routing to My Orders / continue shopping)
  - `src/screens/Account/MyOrdersScreen.tsx` (items breakdown under each order; Cancel/ Reorder retained)
  - `src/services/productService.ts` (getActiveProducts with filters, getProductById, getProductCategories)
  - `src/services/orderService.ts` (placeOrder to create order + order_items; existing cancel/reorder kept)
- Checks passed (manual):
  - Filter/search products; prices formatted via `formatPrice`; no duplicate key warnings.
  - Cart qty +/- updates totals; Checkout disabled at ₹0; placing order shows success screen; My Orders reflects the new order.
  - Cancel respects status rules; Reorder adds exact items + quantities to cart; items editable; cannot checkout empty cart.

### Shop UX restored (04 Nov) (2025-11-05)

### Product Detail restored (Amazon-style, 04 Nov parity) (2025-11-05)

### Account restored+enhanced (2025-11-05)

### Restored Account Auth (Supabase) (2025-11-05)

### Home: Next Appointment card restored (2025-11-05)
- Files touched: `src/services/bookingService.ts`, `src/screens/Home/HomeScreen.tsx`.
- Helper now returns the earliest future appointment (status='booked') strictly after local now via date/time filter and includes service/therapist names.
- Home renders a compact, tappable card with service, therapist, formatted date • time, and a status chip. Tap opens My Appointments (with highlightId). Card refreshes on tab focus and hides when none.
- Files touched:
  - `App.tsx`: Bootstraps session on app start (`supabase.auth.getSession`) and subscribes to `onAuthStateChange`; hydrates SessionStore with profile for greeting.
  - `src/services/authService.ts`: Implements `signIn`, `signUp` (ensures profile with RLS-safe `ensureProfileExists`), and `signOut`. Hydrates/clears SessionStore.
  - `src/screens/Auth/SignInScreen.tsx`: Email/password form; submit disabled while loading; errors surfaced via toast; “Create account” link navigates to SignUp.
  - `src/screens/Auth/SignUpScreen.tsx`: Full name (optional), email, password; ensures profile on success; “Sign in” link navigates to SignIn.
  - `src/screens/Account/AccountScreen.tsx`: Guest view now shows Sign In / Create Account CTAs; logged‑in view shows sections and Logout.
- Acceptance: Sign In/Sign Up flow lands in Account with full_name/email greeting; session persists across reload; Sign Out returns to guest state; RLS calls work without errors.
- Files touched:
  - `src/screens/Account/AccountScreen.tsx`: Restored greeting (full_name/email fallback) and sections (Profile, Appointments, Orders, Contact, Logout). Contact buttons open WhatsApp/Call/Maps.
  - `src/screens/Account/MyProfileScreen.tsx`: Editable Full Name + E.164 Phone with country picker; validation and Save with toast/update.
  - `src/screens/Account/MyAppointmentsScreen.tsx`: Pull-to-refresh and pagination; shows service, therapist, date/time via `formatDate/formatTime`; status chip; Cancel/Reschedule (future only) and list refresh; reschedule routes back into booking with prefilled params; Home Next Appointment reflects changes on focus.
  - `src/screens/Account/MyOrdersScreen.tsx`: Items summary, Cancel (eligible), Reorder → cart with same items/qty.
  - `src/screens/Account/OrderDetailScreen.tsx`: Order meta and items; cancel if eligible; consistent formatting.
  - Services: `src/services/profileService.ts`, `src/services/bookingService.ts`, `src/services/orderService.ts` reused for RLS-safe operations.
- Acceptance: Greeting correct; profile edits save and reflect; Appointments cancel/reschedule update list + home; Orders cancel/reorder work; contact buttons open system apps; no key/hooks warnings.
- File: `src/screens/Shop/ProductDetailScreen.tsx`.
- Restored detailed view:
  - Header/basic info: image/placeholder, name, category; `formatPrice` for price; stock badge.
  - Image area: tap to open full-screen preview modal (single image now, ready for carousel later).
  - Purchase block: sticky above fold; qty stepper (min 1, max 10/stock), “Add to Cart” (stays and updates badge), and “Buy Now” (adds then navigates to Cart).
  - Highlights & details: bullet highlights, two collapsible sections (details/specs and more info/care/usage) plus delivery/return placeholders.
  - Related products: same-category list excluding current (limit 8), horizontal cards with stable keys; tap navigates to Product Detail.
- Reused existing product/order services and cart store; no new deps.
- Cart now visible and reachable across the app: tab badge shows count; header cart button on Shop screens routes to `CartScreen`.
- Product tap opens `ProductDetailScreen` with id param; detail shows image, name, price (formatPrice), description, qty stepper, and Add to Cart (navigates to Cart).
- Product list retains “Amazon-style” card layout: prominent price, small subtitle/ratings placeholder, quick Add to Cart button; category chips + search at top; stable keys (no warnings).
- Restored Home → Services preselect/highlight behavior and Online Consultation CTA.
- Files touched:
  - `src/screens/Home/HomeScreen.tsx`: Quick Actions now pass `highlightCategory` to Services; added "Online Consultation" entry routing to Services; uses focus refresh for Next Appointment.
  - `src/screens/Services/ServicesScreen.tsx`: Consumes `highlightCategory`, auto-scrolls to the category section, and visually highlights it without filtering; clears highlight on focus if not provided.
  - `src/screens/Services/ServiceDetailScreen.tsx`: Shows "Book Online Consultation" when `is_online_allowed === true`, routing into booking with `isOnline: true` flag preserved through the flow.
- Acceptance: Home quick actions land with category highlighted; ServiceDetail shows Online Consult CTA where applicable and opens the standard booking flow with the online flag.
- Restored Services booking flow behavior as previously logged.
- Files touched:
  - `src/screens/Booking/SelectDateScreen.tsx` (only future, truly bookable dates; passes prefill params for reschedule)
  - `src/screens/Booking/SelectTimeSlotScreen.tsx` (real tap‑able slots; visual checkmark; press feedback; Continue shows “Continuing…”; “Pick another date” link aligned under list)
  - `src/screens/Booking/ConfirmBookingScreen.tsx` (Confirm uses `bookAppointment`; when `appointmentId` present, uses `rescheduleAppointment`; toasts on success)
- Services logic and SQL/RLS/indexes match progress docs:
  - Uses RPC `book_appointment` for atomic reserve+insert
  - Composite index on `(service_id, therapist_id, date, start_time)`
  - Public read policy for `availability_slots`; cancel frees slot
  - Double‑book guard: blocks same user at same date+time (any service/therapist) with a clear toast
- Tests passed (manual):
  1) Every date in SelectDate has real slots; selecting a slot enables Continue
  2) Booking succeeds; Cancel returns slot; Reschedule pre‑fills and rebooks correctly
  3) Attempt to book same date+time again (any therapist/service) is blocked with a toast
  4) “Pick another date” link placement matches previous screenshots
