-- 0) Ensure pg_cron extension (safe if already present)
create extension if not exists pg_cron with schema cron;

-- 1) Idempotent unique index (needed for ON CONFLICT)
create unique index if not exists ux_slots_unique
on public.availability_slots (therapist_id, service_id, date, start_time);

-- 2) Function: roll next 15 days, clean past days
create or replace function public.roll_availability_15days()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Clean old days (leave referenced slots intact)
  delete from public.availability_slots sl
  where sl.date < current_date
    and not exists (
      select 1 from public.appointments a where a.slot_id = sl.id
    );

  -- Insert hourly slots from 10:00 to 18:00 (start times 10:00..17:00)
  insert into public.availability_slots
    (therapist_id, service_id, date, start_time, end_time, is_booked)
  select
    t.id,
    s.id,
    d::date,
    st::time,
    (st + interval '1 hour')::time,
    false
  from generate_series(current_date, current_date + interval '14 day', interval '1 day') d,
       public.therapists t,
       public.services s,
       generate_series('10:00'::time, '17:00'::time, interval '1 hour') st
  where t.is_active = true
    and s.is_active = true
  on conflict (therapist_id, service_id, date, start_time) do nothing;
end;
$$;

-- 3) Allow app roles to execute if needed (RPC not required here, cron runs server-side)
grant execute on function public.roll_availability_15days() to anon, authenticated;

-- 4) Schedule daily at 03:00 (UTC); unschedule if exists, then schedule
do $$ begin
  perform cron.unschedule('roll_avail_daily');
exception when others then
  -- ignore if job didn't exist
  null;
end $$;

select cron.schedule(
  'roll_avail_daily',
  '0 3 * * *',
  $$select public.roll_availability_15days();$$
);

-- 5) One-time immediate run to populate today..+14
select public.roll_availability_15days();

-- 6) Quick verify: should return rows for today..+14
select count(*) as slot_count
from public.availability_slots
where date between current_date and current_date + interval '14 day';
