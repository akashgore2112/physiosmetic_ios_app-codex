-- RLS Multi-User Security Audit Script
-- Tests Row Level Security policies to ensure users cannot access each other's data
-- Run this script against your Supabase database to validate RLS isolation

-- Prerequisites: Create two test users in Supabase Auth first, then replace UUIDs below
-- You can create test users via Supabase Dashboard > Authentication > Users

\echo 'Starting RLS Multi-User Security Audit...'
\echo ''

-- ============================================================================
-- CONFIGURATION: Replace these UUIDs with actual test user IDs
-- ============================================================================
-- User A (test user 1)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000001') THEN
    RAISE NOTICE 'WARNING: Test user A (00000000-0000-0000-0000-000000000001) not found. Please create test users first.';
  END IF;
END $$;

-- User B (test user 2)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = '00000000-0000-0000-0000-000000000002') THEN
    RAISE NOTICE 'WARNING: Test user B (00000000-0000-0000-0000-000000000002) not found. Please create test users first.';
  END IF;
END $$;

\echo 'Note: Replace test UUIDs in this script with actual user IDs from auth.users'
\echo ''

-- ============================================================================
-- TEST 1: Appointments Isolation
-- ============================================================================
\echo '=== TEST 1: Appointments Isolation ==='

-- Create test appointment for User A
INSERT INTO appointments (user_id, service_id, therapist_id, slot_id, status, notes)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,
  (SELECT id FROM services LIMIT 1),
  (SELECT id FROM therapists LIMIT 1),
  (SELECT id FROM availability_slots WHERE is_booked = false LIMIT 1),
  'booked',
  'RLS TEST - User A appointment'
ON CONFLICT DO NOTHING;

-- Test: User B should NOT be able to read User A's appointments
DO $$
DECLARE
  v_count int;
BEGIN
  -- Simulate User B session
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  SELECT COUNT(*) INTO v_count
  FROM appointments
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ FAIL: User B can read User A appointments (found % rows)', v_count;
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot read User A appointments';
  END IF;
END $$;

-- Test: User B should NOT be able to update User A's appointments
DO $$
DECLARE
  v_updated int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  UPDATE appointments
  SET notes = 'HACKED by User B'
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE EXCEPTION '❌ FAIL: User B modified User A appointments (% rows)', v_updated;
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot update User A appointments';
  END IF;
END $$;

-- Test: Anon (guest) should NOT be able to read appointments
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', NULL, true);

  SELECT COUNT(*) INTO v_count FROM appointments;

  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ FAIL: Anonymous users can read appointments (found % rows)', v_count;
  ELSE
    RAISE NOTICE '✓ PASS: Anonymous users cannot read appointments';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 2: Orders Isolation
-- ============================================================================
\echo '=== TEST 2: Orders Isolation ==='

-- Create test order for User A
INSERT INTO orders (user_id, total_amount, status)
VALUES ('00000000-0000-0000-0000-000000000001', 1000, 'placed')
ON CONFLICT DO NOTHING;

-- Test: User B should NOT see User A's orders
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  SELECT COUNT(*) INTO v_count
  FROM orders
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ FAIL: User B can read User A orders';
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot read User A orders';
  END IF;
END $$;

-- Test: User B should NOT update User A's orders
DO $$
DECLARE
  v_updated int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  UPDATE orders
  SET status = 'cancelled'
  WHERE user_id = '00000000-0000-0000-0000-000000000001';

  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE EXCEPTION '❌ FAIL: User B modified User A orders';
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot update User A orders';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 3: Order Items Isolation
-- ============================================================================
\echo '=== TEST 3: Order Items Isolation ==='

-- Test: User B should NOT see order items from User A's orders
DO $$
DECLARE
  v_count int;
  v_order_id uuid;
BEGIN
  -- Get an order ID belonging to User A
  SELECT id INTO v_order_id
  FROM orders
  WHERE user_id = '00000000-0000-0000-0000-000000000001'
  LIMIT 1;

  IF v_order_id IS NULL THEN
    RAISE NOTICE 'SKIP: No orders found for User A to test order_items';
    RETURN;
  END IF;

  -- Try to read as User B
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  SELECT COUNT(*) INTO v_count
  FROM order_items
  WHERE order_id = v_order_id;

  IF v_count > 0 THEN
    RAISE EXCEPTION '❌ FAIL: User B can read User A order items';
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot read User A order items';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 4: Profiles Addresses Isolation
-- ============================================================================
\echo '=== TEST 4: Profiles/Addresses Isolation ==='

-- Create/update profile for User A with an address
INSERT INTO profiles (id, full_name, addresses)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Test User A',
  '[{"line1": "123 Secret St", "city": "Private City", "pincode": "400001"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE
SET addresses = '[{"line1": "123 Secret St", "city": "Private City", "pincode": "400001"}]'::jsonb;

-- Test: User B should NOT read User A's profile addresses
DO $$
DECLARE
  v_addresses jsonb;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000002', true);

  SELECT addresses INTO v_addresses
  FROM profiles
  WHERE id = '00000000-0000-0000-0000-000000000001';

  IF v_addresses IS NOT NULL THEN
    RAISE EXCEPTION '❌ FAIL: User B can read User A addresses';
  ELSE
    RAISE NOTICE '✓ PASS: User B cannot read User A addresses';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 5: Public Catalog Read-Only
-- ============================================================================
\echo '=== TEST 5: Public Catalog Read-Only ==='

-- Test: Authenticated users should read services
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

  SELECT COUNT(*) INTO v_count FROM services WHERE is_active = true;

  IF v_count = 0 THEN
    RAISE NOTICE 'WARNING: No active services found in catalog';
  ELSE
    RAISE NOTICE '✓ PASS: Authenticated users can read services (% found)', v_count;
  END IF;
END $$;

-- Test: Anonymous should read services
DO $$
DECLARE
  v_count int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', NULL, true);

  SELECT COUNT(*) INTO v_count FROM services WHERE is_active = true;

  IF v_count = 0 THEN
    RAISE NOTICE 'SKIP: No services to test anon read';
  ELSE
    RAISE NOTICE '✓ PASS: Anonymous users can read services';
  END IF;
END $$;

-- Test: Users should NOT directly update services
DO $$
DECLARE
  v_updated int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

  UPDATE services SET base_price = 99999 WHERE id IN (SELECT id FROM services LIMIT 1);
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE EXCEPTION '❌ FAIL: Users can modify services catalog';
  ELSE
    RAISE NOTICE '✓ PASS: Users cannot modify services';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- TEST 6: Slot Booking Protection
-- ============================================================================
\echo '=== TEST 6: Slot Booking Protection ==='

-- Test: Users should NOT directly mark slots as booked
DO $$
DECLARE
  v_slot_id uuid;
  v_updated int;
BEGIN
  PERFORM set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-000000000001', true);

  SELECT id INTO v_slot_id FROM availability_slots WHERE is_booked = false LIMIT 1;

  IF v_slot_id IS NULL THEN
    RAISE NOTICE 'SKIP: No free slots to test direct booking';
    RETURN;
  END IF;

  UPDATE availability_slots SET is_booked = true WHERE id = v_slot_id;
  GET DIAGNOSTICS v_updated = ROW_COUNT;

  IF v_updated > 0 THEN
    RAISE EXCEPTION '❌ FAIL: Users can directly mark slots as booked';
  ELSE
    RAISE NOTICE '✓ PASS: Users cannot directly update slots';
  END IF;
END $$;

\echo ''

-- ============================================================================
-- CLEANUP
-- ============================================================================
\echo '=== Cleanup Test Data ==='

-- Reset session
SELECT set_config('request.jwt.claim.sub', NULL, true);

-- Clean up test data (run as superuser/service role)
DELETE FROM appointments WHERE notes LIKE 'RLS TEST%';
DELETE FROM orders WHERE user_id IN (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000002'
);

\echo ''
\echo '=== RLS Audit Complete ==='
\echo 'If no exceptions were raised, all RLS policies are working correctly!'
\echo ''
\echo 'To run this script:'
\echo '  1. Create two test users in Supabase Dashboard > Authentication'
\echo '  2. Replace the UUIDs at the top of this script'
\echo '  3. Run via Supabase SQL Editor or: psql -f scripts/test_rls_multi_user.sql'
