# PHYSIOSMETIC — App Progress
_Maintained automatically; newest first._
_Last cleaned: 2025-11-06_

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

### Release checklist (2025-11-06)
**Summary:** DEV-only ActionSheet to validate release readiness on device.
**Files:** src/dev/releaseChecklist.ts, src/screens/Home/HomeScreen.tsx
**Behavior:**
- Triple-tap Home title (DEV) to open checklist.
- Lists icons/splash, bundle IDs, Sentry DSN, Supabase env, EAS profiles, Sentry init.
- iOS uses ActionSheet; Android shows Alert.
**QA:**
- In dev, rapid triple-tap opens the sheet; no effect in production builds.

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
