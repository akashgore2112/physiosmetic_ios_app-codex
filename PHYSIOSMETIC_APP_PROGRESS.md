# PHYSIOSMETIC — App Progress
_Maintained automatically; newest first._
_Last cleaned: 2025-11-06_

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
