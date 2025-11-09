-- Tighten RLS on order_items to block direct INSERT
-- Only allow INSERT via place_order RPC (which uses SECURITY DEFINER)

-- ============================================
-- PART 1: Remove INSERT policy for order_items
-- ============================================

-- Drop the INSERT policy that allows users to insert their own order_items
DROP POLICY IF EXISTS "order_items_insert_via_own_order" ON order_items;

-- Note: Now users can only INSERT order_items through the place_order RPC
-- which uses SECURITY DEFINER to bypass RLS

-- ============================================
-- PART 2: Ensure SELECT policy still works
-- ============================================

-- Verify SELECT policy exists (users can view their own order_items)
-- This should already exist from cleanup_rls_policies.sql:
-- "order_items_select_own" policy

-- ============================================
-- PART 3: No UPDATE or DELETE policies
-- ============================================

-- Order items are immutable once created
-- Ensure no UPDATE or DELETE policies exist
DROP POLICY IF EXISTS "order_items_update_own" ON order_items;
DROP POLICY IF EXISTS "order_items_delete_own" ON order_items;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that only SELECT policy remains on order_items
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd
-- FROM pg_policies
-- WHERE tablename = 'order_items'
-- ORDER BY policyname;

-- Expected result: Only 1 policy - "order_items_select_own" with cmd = 'SELECT'

-- ============================================
-- NOTES
-- ============================================

-- With this change:
-- ✅ Users can SELECT their own order_items (via orders.user_id)
-- ✅ place_order RPC can INSERT order_items (SECURITY DEFINER bypasses RLS)
-- ❌ Users CANNOT directly INSERT order_items (security improvement)
-- ❌ Users CANNOT UPDATE order_items (immutable)
-- ❌ Users CANNOT DELETE order_items (immutable)

-- This enforces that all order creation must go through the validated place_order RPC,
-- which performs server-side pricing, stock validation, and other security checks.
