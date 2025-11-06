-- Helper to compute end timestamp from slot (date + end_time)
-- Assumes appointments.slot_id -> availability_slots(id) with columns (date, start_time, end_time)
create or replace function public.mark_my_past_appointments_completed()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count int := 0;
begin
  update public.appointments a
  set status = 'completed'
  from public.availability_slots s
  where a.slot_id = s.id
    and a.user_id = auth.uid()
    and a.status = 'booked'
    and (timestamp with time zone
         (s.date::text || ' ' || s.end_time::text)) <= now()
  returning 1 into updated_count;

  return coalesce(updated_count, 0);
end;
$$;

-- Grant execute to anon/authenticated
grant execute on function public.mark_my_past_appointments_completed() to anon, authenticated;

