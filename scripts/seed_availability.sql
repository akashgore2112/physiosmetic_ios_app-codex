-- 14-day availability seeding (idempotent)
with days as (
  select generate_series(current_date, current_date + interval '13 days', interval '1 day')::date d
),
hours as (
  select ('10:00'::time + (i || ' hour')::interval)::time t
  from generate_series(0,8) g(i)  -- 10:00..18:00
)
insert into public.availability_slots (therapist_id, date, start_time, end_time, is_booked)
select th.id, d.d, h.t, (h.t + interval '1 hour')::time, false
from public.therapists th
cross join days d
cross join hours h
left join public.availability_slots s
  on s.therapist_id = th.id and s.date = d.d and s.start_time = h.t
where s.id is null;

