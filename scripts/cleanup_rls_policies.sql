-- Cleanup duplicate RLS policies on orders and order_items
-- Run this via Supabase SQL Editor

-- ============================================
-- PART 1: Clean up orders table RLS policies
-- ============================================

-- Drop all existing policies on orders
DROP POLICY IF EXISTS "Users can insert own orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "Users can select own orders" ON orders;
DROP POLICY IF EXISTS "Users can select their own orders" ON orders;
DROP POLICY IF EXISTS "Users can view own orders" ON orders;
DROP POLICY IF EXISTS "Users can view their own orders" ON orders;
DROP POLICY IF EXISTS "Users can update own orders" ON orders;
DROP POLICY IF EXISTS "Users can update their own orders" ON orders;
DROP POLICY IF EXISTS "Users can delete own orders" ON orders;

-- Create clean, minimal RLS policies for orders
CREATE POLICY "orders_select_own"
  ON orders FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "orders_insert_authenticated"
  ON orders FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "orders_update_own"
  ON orders FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Note: No DELETE policy - orders should not be deleted, only cancelled (status update)

-- ============================================
-- PART 2: Clean up order_items table RLS policies
-- ============================================

-- Drop all existing policies on order_items
DROP POLICY IF EXISTS "Users can insert order items" ON order_items;
DROP POLICY IF EXISTS "Users can insert their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can select order items" ON order_items;
DROP POLICY IF EXISTS "Users can select their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can view order items" ON order_items;
DROP POLICY IF EXISTS "Users can view their own order items" ON order_items;
DROP POLICY IF EXISTS "Users can update order items" ON order_items;
DROP POLICY IF EXISTS "Users can delete order items" ON order_items;

-- Create clean, minimal RLS policies for order_items
CREATE POLICY "order_items_select_own"
  ON order_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Note: INSERT will be removed later (Task 4) and only allowed via place_order RPC
-- For now, keep it for backward compatibility
CREATE POLICY "order_items_insert_via_own_order"
  ON order_items FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM orders
      WHERE orders.id = order_items.order_id
      AND orders.user_id = auth.uid()
    )
  );

-- Note: No UPDATE/DELETE policies - order_items are immutable once created

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check remaining policies on orders
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'orders'
-- ORDER BY policyname;

-- Check remaining policies on order_items
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE tablename = 'order_items'
-- ORDER BY policyname;
