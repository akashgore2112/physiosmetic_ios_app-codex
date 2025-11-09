-- Migration: Enhance orders and order_items tables for shop completion
-- Run this via Supabase SQL Editor or supabase migration

-- ============================================
-- PART 1: Enhance orders table
-- ============================================

-- Add pickup mode flag
ALTER TABLE orders ADD COLUMN IF NOT EXISTS pickup BOOLEAN DEFAULT FALSE;

-- Add shipping address (JSONB for flexibility)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_address JSONB;

-- Add payment fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method TEXT
  CHECK (payment_method IN ('cod', 'razorpay', 'stripe'));

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded'))
  DEFAULT 'pending';

ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_gateway TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_order_id TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS gateway_payment_id TEXT;

-- Add coupon/discount fields
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10,2) DEFAULT 0;

-- Add tax and shipping amounts (server-computed)
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_amount NUMERIC(10,2) DEFAULT 0;

-- Add idempotency key for preventing duplicate orders
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key TEXT UNIQUE;

-- Update existing orders to have default payment_method
UPDATE orders SET payment_method = 'cod' WHERE payment_method IS NULL;

-- ============================================
-- PART 2: Enhance order_items table
-- ============================================

-- Add variant support
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_id TEXT;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS variant_label TEXT;

-- ============================================
-- PART 3: Create coupons table
-- ============================================

CREATE TABLE IF NOT EXISTS coupons (
  code TEXT PRIMARY KEY,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percent', 'fixed')),
  discount_value NUMERIC(10,2) NOT NULL CHECK (discount_value > 0),
  min_order_amount NUMERIC(10,2) DEFAULT 0,
  max_discount NUMERIC(10,2),
  valid_from TIMESTAMPTZ DEFAULT NOW(),
  valid_until TIMESTAMPTZ NOT NULL,
  usage_limit INTEGER,
  usage_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on coupons
ALTER TABLE coupons ENABLE ROW LEVEL SECURITY;

-- Coupons are publicly readable (for validation)
CREATE POLICY "Coupons are publicly readable"
  ON coupons FOR SELECT
  USING (TRUE);

-- Only admins can modify coupons (TODO: add admin role check)
-- For now, no INSERT/UPDATE/DELETE policies (manual management via SQL editor)

-- Create index for faster coupon lookups
CREATE INDEX IF NOT EXISTS idx_coupons_code_active ON coupons(code, active);
CREATE INDEX IF NOT EXISTS idx_coupons_valid ON coupons(valid_from, valid_until) WHERE active = TRUE;

-- ============================================
-- PART 4: Add indexes for performance
-- ============================================

-- Index for faster order lookups by user
CREATE INDEX IF NOT EXISTS idx_orders_user_created ON orders(user_id, created_at DESC);

-- Index for idempotency checks
CREATE INDEX IF NOT EXISTS idx_orders_idempotency ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

-- Index for payment gateway reconciliation
CREATE INDEX IF NOT EXISTS idx_orders_gateway ON orders(payment_gateway, gateway_order_id) WHERE payment_gateway IS NOT NULL;

-- ============================================
-- PART 5: Sample coupon data (for testing)
-- ============================================

-- Insert sample coupons for testing
INSERT INTO coupons (code, discount_type, discount_value, min_order_amount, max_discount, valid_until, usage_limit) VALUES
  ('WELCOME10', 'percent', 10, 500, 100, NOW() + INTERVAL '30 days', 1000),
  ('FLAT50', 'fixed', 50, 200, NULL, NOW() + INTERVAL '30 days', NULL),
  ('SAVE20', 'percent', 20, 1000, 200, NOW() + INTERVAL '30 days', 500)
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check orders table structure
-- SELECT column_name, data_type, is_nullable
-- FROM information_schema.columns
-- WHERE table_name = 'orders'
-- ORDER BY ordinal_position;

-- Check coupons table
-- SELECT * FROM coupons;
