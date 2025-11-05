-- Enable RLS and basic public read for selected tables
alter table if exists public.therapist_availability enable row level security;
drop policy if exists "public read therapist_availability" on public.therapist_availability;
create policy "public read therapist_availability" on public.therapist_availability for select using (true);

alter table if exists public.app_healthcheck enable row level security;
drop policy if exists "auth read healthcheck" on public.app_healthcheck;
create policy "auth read healthcheck" on public.app_healthcheck for select to authenticated using (true);

