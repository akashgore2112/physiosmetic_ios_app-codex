-- Migration: Add payment tracking fields to appointments table
-- Date: 2025-11-10
-- Purpose: Enable prepayment for service bookings with Razorpay/Stripe integration

-- Add payment-related columns to appointments table
ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_status TEXT
    CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
    DEFAULT 'pending';

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_method TEXT
    CHECK (payment_method IN ('razorpay', 'stripe', 'pay_at_clinic'));

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS payment_gateway TEXT;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(10,2);

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS coupon_code TEXT;

ALTER TABLE appointments
  ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Create index on idempotency_key for fast duplicate checks
CREATE INDEX IF NOT EXISTS idx_appointments_idempotency_key
  ON appointments(idempotency_key)
  WHERE idempotency_key IS NOT NULL;

-- Create index on payment_status for filtering
CREATE INDEX IF NOT EXISTS idx_appointments_payment_status
  ON appointments(payment_status);

-- Add comment
COMMENT ON COLUMN appointments.payment_status IS 'Payment status: pending (default), paid, failed, refunded';
COMMENT ON COLUMN appointments.payment_method IS 'Payment method: razorpay, stripe, pay_at_clinic';
COMMENT ON COLUMN appointments.amount_paid IS 'Actual amount paid (service base_price - discount)';
COMMENT ON COLUMN appointments.idempotency_key IS 'Prevents duplicate bookings on payment retry (unique constraint)';
