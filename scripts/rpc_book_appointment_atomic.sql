-- Enhanced atomic booking RPC with user overlap detection
-- Prevents race conditions by checking all constraints server-side with locking

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_user_id uuid,
  p_service_id uuid,
  p_therapist_id uuid,
  p_slot_id uuid,
  p_is_online boolean DEFAULT false,
  p_notes text DEFAULT null
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot availability_slots%ROWTYPE;
  v_appointment_id uuid;
  v_overlap_count int;
BEGIN
  -- Lock the slot row to prevent concurrent bookings
  SELECT * INTO v_slot FROM availability_slots WHERE id = p_slot_id FOR UPDATE;

  -- Check 1: Slot exists
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_not_found',
      'message', 'This slot no longer exists.'
    );
  END IF;

  -- Check 2: Slot is not already booked
  IF v_slot.is_booked THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_taken',
      'message', 'This slot is no longer available. Please choose another.'
    );
  END IF;

  -- Check 3: Slot is not expired (start time not in the past)
  IF (v_slot.date + v_slot.start_time::time) <= now() THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'slot_expired',
      'message', 'This slot has passed. Please choose a future time.'
    );
  END IF;

  -- Check 4: User has no overlapping appointment (same date, overlapping time)
  -- Use tsrange to detect any temporal overlap
  SELECT COUNT(*) INTO v_overlap_count
  FROM appointments a
  JOIN availability_slots s ON a.slot_id = s.id
  WHERE a.user_id = p_user_id
    AND s.date = v_slot.date
    AND a.status IN ('booked', 'confirmed')  -- Only check active appointments
    AND tsrange(
      (s.date + s.start_time::time)::timestamp,
      (s.date + s.end_time::time)::timestamp,
      '[)'  -- Start inclusive, end exclusive
    ) && tsrange(
      (v_slot.date + v_slot.start_time::time)::timestamp,
      (v_slot.date + v_slot.end_time::time)::timestamp,
      '[)'
    );

  IF v_overlap_count > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'user_conflict',
      'message', 'You already have an appointment at this time.'
    );
  END IF;

  -- All checks passed: Mark slot as booked
  UPDATE availability_slots
  SET is_booked = true
  WHERE id = p_slot_id;

  -- Create appointment
  INSERT INTO appointments (user_id, service_id, therapist_id, slot_id, status, notes)
  VALUES (
    p_user_id,
    p_service_id,
    p_therapist_id,
    p_slot_id,
    'booked',
    COALESCE(p_notes, CASE WHEN p_is_online THEN 'online' ELSE NULL END)
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id
  );
END;
$$;

-- Security: Revoke public access and grant only to authenticated users
REVOKE ALL ON FUNCTION public.book_appointment(uuid, uuid, uuid, uuid, boolean, text) FROM public;
GRANT EXECUTE ON FUNCTION public.book_appointment(uuid, uuid, uuid, uuid, boolean, text) TO authenticated;

COMMENT ON FUNCTION public.book_appointment IS
'Atomically books an appointment slot with pessimistic locking.
Prevents race conditions by checking slot availability and user conflicts server-side.
Returns JSONB: {success: true, appointment_id: uuid} or {success: false, error: code, message: string}';
