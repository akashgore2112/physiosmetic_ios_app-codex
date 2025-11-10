-- Enhanced atomic booking RPC v2 with PAYMENT support
-- Prevents race conditions + adds payment tracking
-- Date: 2025-11-10

CREATE OR REPLACE FUNCTION public.book_appointment(
  p_user_id uuid,
  p_service_id uuid,
  p_therapist_id uuid,
  p_slot_id uuid,
  p_is_online boolean DEFAULT false,
  p_notes text DEFAULT NULL,
  -- Payment parameters (NEW)
  p_payment_method text DEFAULT 'pay_at_clinic',
  p_payment_status text DEFAULT 'pending',
  p_payment_gateway text DEFAULT NULL,
  p_gateway_order_id text DEFAULT NULL,
  p_gateway_payment_id text DEFAULT NULL,
  p_amount_paid numeric(10,2) DEFAULT NULL,
  p_discount_amount numeric(10,2) DEFAULT 0,
  p_coupon_code text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_slot availability_slots%ROWTYPE;
  v_service services%ROWTYPE;
  v_appointment_id uuid;
  v_overlap_count int;
  v_final_amount numeric(10,2);
BEGIN
  -- Idempotency check: if key provided, check for existing appointment
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_appointment_id
    FROM appointments
    WHERE idempotency_key = p_idempotency_key;

    IF FOUND THEN
      -- Appointment already exists with this key, return existing
      RETURN jsonb_build_object(
        'success', true,
        'appointment_id', v_appointment_id,
        'note', 'Existing appointment returned (idempotency)'
      );
    END IF;
  END IF;

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

  -- Check 4: User has no overlapping appointment
  SELECT COUNT(*) INTO v_overlap_count
  FROM appointments a
  JOIN availability_slots s ON a.slot_id = s.id
  WHERE a.user_id = p_user_id
    AND s.date = v_slot.date
    AND a.status IN ('booked', 'confirmed')
    AND tsrange(
      (s.date + s.start_time::time)::timestamp,
      (s.date + s.end_time::time)::timestamp,
      '[)'
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

  -- Fetch service to get base price (server-side pricing)
  SELECT * INTO v_service FROM services WHERE id = p_service_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'service_not_found',
      'message', 'Service not found.'
    );
  END IF;

  -- Calculate final amount (server-side calculation)
  -- If amount_paid is provided (from prepayment), use it
  -- Otherwise calculate: base_price - discount
  IF p_amount_paid IS NOT NULL THEN
    v_final_amount := p_amount_paid;
  ELSE
    v_final_amount := GREATEST(v_service.base_price - COALESCE(p_discount_amount, 0), 0);
  END IF;

  -- All checks passed: Mark slot as booked
  UPDATE availability_slots
  SET is_booked = true
  WHERE id = p_slot_id;

  -- Create appointment with payment tracking
  INSERT INTO appointments (
    user_id, service_id, therapist_id, slot_id, status, notes,
    payment_method, payment_status, payment_gateway,
    gateway_order_id, gateway_payment_id,
    amount_paid, discount_amount, coupon_code, idempotency_key
  )
  VALUES (
    p_user_id,
    p_service_id,
    p_therapist_id,
    p_slot_id,
    'booked',
    COALESCE(p_notes, CASE WHEN p_is_online THEN 'online' ELSE NULL END),
    p_payment_method,
    p_payment_status,
    p_payment_gateway,
    p_gateway_order_id,
    p_gateway_payment_id,
    v_final_amount,
    COALESCE(p_discount_amount, 0),
    p_coupon_code,
    p_idempotency_key
  )
  RETURNING id INTO v_appointment_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_id', v_appointment_id,
    'amount_paid', v_final_amount
  );
END;
$$;

-- Security: Revoke public access and grant only to authenticated users
REVOKE ALL ON FUNCTION public.book_appointment FROM public;
GRANT EXECUTE ON FUNCTION public.book_appointment TO authenticated;

COMMENT ON FUNCTION public.book_appointment IS
'Atomically books an appointment slot with payment tracking (v2).
Prevents race conditions with pessimistic locking.
Supports prepayment via Razorpay/Stripe or pay-at-clinic.
Uses server-side pricing from services.base_price.
Idempotency key prevents duplicate bookings on payment retry.
Returns JSONB: {success: true, appointment_id: uuid, amount_paid: number} or {success: false, error: code, message: string}';
