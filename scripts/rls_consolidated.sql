-- Enable RLS and create idempotent policies

-- profiles
alter table public.profiles enable row level security;
drop policy if exists "profiles insert own" on public.profiles;
create policy "profiles insert own" on public.profiles for insert with check (auth.uid() = id);
drop policy if exists "profiles select own" on public.profiles;
create policy "profiles select own" on public.profiles for select using (auth.uid() = id);
drop policy if exists "profiles update own" on public.profiles;
create policy "profiles update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- services (public read)
alter table public.services enable row level security;
drop policy if exists "services public read" on public.services;
create policy "services public read" on public.services for select using (true);

-- therapists (public read)
alter table public.therapists enable row level security;
drop policy if exists "therapists public read" on public.therapists;
create policy "therapists public read" on public.therapists for select using (true);

-- products (public read)
alter table public.products enable row level security;
drop policy if exists "products public read" on public.products;
create policy "products public read" on public.products for select using (true);

-- availability_slots
alter table public.availability_slots enable row level security;
drop policy if exists "slots public read" on public.availability_slots;
create policy "slots public read" on public.availability_slots for select using (true);
drop policy if exists "slots book" on public.availability_slots;
create policy "slots book" on public.availability_slots for update
using ( is_booked = false )
with check (
  (is_booked = true)
);

-- appointments
alter table public.appointments enable row level security;
drop policy if exists "appts insert own" on public.appointments;
create policy "appts insert own" on public.appointments for insert with check (user_id = auth.uid());
drop policy if exists "appts select own" on public.appointments;
create policy "appts select own" on public.appointments for select using (user_id = auth.uid());
drop policy if exists "appts update own" on public.appointments;
create policy "appts update own" on public.appointments for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- orders
alter table public.orders enable row level security;
drop policy if exists "orders insert own" on public.orders;
create policy "orders insert own" on public.orders for insert with check (user_id = auth.uid());
drop policy if exists "orders select own" on public.orders;
create policy "orders select own" on public.orders for select using (user_id = auth.uid());

-- order_items
alter table public.order_items enable row level security;
drop policy if exists "order_items select via own orders" on public.order_items;
create policy "order_items select via own orders" on public.order_items for select
using (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));
drop policy if exists "order_items insert via own orders" on public.order_items;
create policy "order_items insert via own orders" on public.order_items for insert
with check (exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid()));

