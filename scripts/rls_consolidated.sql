-- Enable RLS and create idempotent policies

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

alter table public.services enable row level security;
drop policy if exists "services public read" on public.services;
create policy "services public read" on public.services for select using (
  is_active is true
);

alter table public.therapists enable row level security;
drop policy if exists "therapists public read" on public.therapists;
create policy "therapists public read" on public.therapists for select using (
  is_active is true
);

alter table public.products enable row level security;
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (
  (is_active is true) and (in_stock is true)
);

alter table public.availability_slots enable row level security;
drop policy if exists "slots public read" on public.availability_slots;
-- Only expose future, unbooked slots to clients
create policy "slots public read" on public.availability_slots for select using (
  (is_booked = false)
  and ((date + start_time) >= (current_date + current_time))
);
-- Remove any client-side booking ability; booking/cancel via RPC only
drop policy if exists "slots book" on public.availability_slots;

alter table public.appointments enable row level security;
drop policy if exists "appts insert own" on public.appointments;
create policy "appts insert own" on public.appointments for insert with check (user_id = auth.uid());
drop policy if exists "appts select own" on public.appointments;
create policy "appts select own" on public.appointments for select using (user_id = auth.uid());
-- Restrict updates to safe columns at privilege level; keep RLS scoped to owner
drop policy if exists "appts update own" on public.appointments;
drop policy if exists "appts update own status_notes" on public.appointments;
create policy "appts update own status_notes" on public.appointments for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
-- Lock down column-level privileges
revoke update on public.appointments from authenticated;
grant update (status, notes) on public.appointments to authenticated;

alter table public.orders enable row level security;
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders for insert with check (user_id = auth.uid());
drop policy if exists "orders select own" on public.orders;
create policy "orders select own" on public.orders for select using (user_id = auth.uid());

alter table public.order_items enable row level security;
drop policy if exists "order_items select via own orders" on public.order_items;
create policy "order_items select via own orders" on public.order_items for select
using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "order_items insert via own orders" on public.order_items;
-- Disallow client inserts/updates; must use RPC place_order()
-- (Keep no INSERT/UPDATE policies)
revoke insert, update on public.order_items from authenticated;
