-- Atomic booking RPC: reserves a free slot and inserts an appointment
create or replace function public.book_appointment(
  p_user_id uuid,
  p_service_id uuid,
  p_therapist_id uuid,
  p_slot_id uuid,
  p_is_online boolean default false,
  p_notes text default null
)
returns appointments
language plpgsql
security definer
as $$
declare
  v_appt appointments;
  v_now timestamptz := now();
  v_slot record;
begin
  -- ensure slot exists, is free, and not in the past
  select * into v_slot from public.availability_slots s where s.id = p_slot_id for update;
  if not found then
    raise exception 'Slot not found' using hint = 'slot_not_found';
  end if;
  if v_slot.is_booked then
    raise exception 'Slot already taken' using hint = 'slot_already_taken';
  end if;
  if (v_slot.date + v_slot.start_time) < v_now::timestamp then
    raise exception 'Slot is in the past' using hint = 'slot_in_past';
  end if;

  -- reserve slot
  update public.availability_slots set is_booked = true where id = p_slot_id and is_booked = false;
  if not found then
    raise exception 'Slot already taken' using hint = 'slot_already_taken';
  end if;

  -- insert appointment
  insert into public.appointments (user_id, service_id, therapist_id, slot_id, status, notes)
  values (
    p_user_id,
    p_service_id,
    p_therapist_id,
    p_slot_id,
    'booked',
    coalesce(p_notes, case when p_is_online then 'online' else null end)
  )
  returning * into v_appt;

  return v_appt;
exception when others then
  -- rollback slot reserve on any failure after reservation
  begin
    update public.availability_slots set is_booked = false where id = p_slot_id;
  exception when others then
    -- swallow secondary errors
    null;
  end;
  raise;
end;
$$;

revoke all on function public.book_appointment(uuid, uuid, uuid, uuid, boolean, text) from public;
grant execute on function public.book_appointment(uuid, uuid, uuid, uuid, boolean, text) to authenticated;
