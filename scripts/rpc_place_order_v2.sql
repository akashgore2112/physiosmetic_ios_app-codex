-- Enhanced place_order RPC with server-side pricing and full payment support
-- This replaces the client-side pricing model with secure server-side validation

CREATE OR REPLACE FUNCTION orders.place_order(
  p_cart JSONB,              -- [{product_id, variant_id?, qty}]
  p_shipping_address JSONB,  -- {name, phone, line1, line2?, city, state, pincode, country}
  p_pickup BOOLEAN DEFAULT FALSE,
  p_payment_method TEXT DEFAULT 'cod',
  p_coupon_code TEXT DEFAULT NULL,
  p_idempotency_key TEXT DEFAULT NULL,
  p_payment_gateway TEXT DEFAULT NULL,
  p_gateway_order_id TEXT DEFAULT NULL,
  p_gateway_payment_id TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER  -- Allows bypassing RLS for order_items INSERT
AS $$
DECLARE
  v_user_id UUID;
  v_order_id UUID;
  v_item JSONB;
  v_product RECORD;
  v_subtotal NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_tax NUMERIC(10,2) := 0;
  v_shipping NUMERIC(10,2) := 0;
  v_total NUMERIC(10,2) := 0;
  v_coupon RECORD;
  v_payment_status TEXT;
BEGIN
  -- 1. Validate authentication
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'unauthorized',
      'message', 'You must be logged in to place an order'
    );
  END IF;

  -- 2. Check idempotency (prevent duplicate orders on retry)
  IF p_idempotency_key IS NOT NULL THEN
    SELECT id INTO v_order_id
    FROM orders
    WHERE idempotency_key = p_idempotency_key
    AND user_id = v_user_id;

    IF FOUND THEN
      RETURN jsonb_build_object(
        'success', TRUE,
        'order_id', v_order_id,
        'message', 'Order already created (idempotent)',
        'duplicate', TRUE
      );
    END IF;
  END IF;

  -- 3. Validate cart is not empty
  IF jsonb_array_length(p_cart) = 0 THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'empty_cart',
      'message', 'Your cart is empty'
    );
  END IF;

  -- 4. Validate shipping address if not pickup
  IF p_pickup = FALSE THEN
    IF p_shipping_address IS NULL
       OR (p_shipping_address->>'name') IS NULL
       OR (p_shipping_address->>'phone') IS NULL
       OR (p_shipping_address->>'line1') IS NULL
       OR (p_shipping_address->>'city') IS NULL
       OR (p_shipping_address->>'state') IS NULL
       OR (p_shipping_address->>'pincode') IS NULL THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'invalid_address',
        'message', 'Shipping address is required for delivery orders'
      );
    END IF;
  END IF;

  -- 5. Calculate subtotal (SERVER-SIDE PRICING - critical for security)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    -- Fetch product price from database
    SELECT id, price, in_stock
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'product_not_found',
        'message', 'Product ' || (v_item->>'product_id') || ' not found'
      );
    END IF;

    -- Check stock availability
    IF v_product.in_stock = FALSE THEN
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'out_of_stock',
        'message', 'Product is out of stock'
      );
    END IF;

    -- Add to subtotal (server price * quantity)
    v_subtotal := v_subtotal + (v_product.price * (v_item->>'qty')::INTEGER);
  END LOOP;

  -- 6. Apply coupon if provided
  IF p_coupon_code IS NOT NULL THEN
    SELECT *
    INTO v_coupon
    FROM coupons
    WHERE code = p_coupon_code
    AND active = TRUE
    AND valid_from <= NOW()
    AND valid_until >= NOW();

    IF FOUND THEN
      -- Check minimum order amount
      IF v_subtotal < v_coupon.min_order_amount THEN
        RETURN jsonb_build_object(
          'success', FALSE,
          'error', 'coupon_min_not_met',
          'message', 'Order must be at least ₹' || v_coupon.min_order_amount || ' to use this coupon'
        );
      END IF;

      -- Calculate discount
      IF v_coupon.discount_type = 'percent' THEN
        v_discount := (v_subtotal * v_coupon.discount_value / 100);
      ELSE
        v_discount := v_coupon.discount_value;
      END IF;

      -- Apply max discount cap if set
      IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
        v_discount := v_coupon.max_discount;
      END IF;

      -- Check usage limit
      IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
        RETURN jsonb_build_object(
          'success', FALSE,
          'error', 'coupon_limit_reached',
          'message', 'This coupon has reached its usage limit'
        );
      END IF;

      -- Increment coupon usage count
      UPDATE coupons
      SET usage_count = usage_count + 1
      WHERE code = p_coupon_code;
    ELSE
      RETURN jsonb_build_object(
        'success', FALSE,
        'error', 'invalid_coupon',
        'message', 'Invalid or expired coupon code'
      );
    END IF;
  END IF;

  -- 7. Calculate tax (10% of subtotal after discount)
  v_tax := ROUND((v_subtotal - v_discount) * 0.10, 2);

  -- 8. Calculate shipping
  IF p_pickup = TRUE THEN
    v_shipping := 0;
  ELSE
    v_shipping := 50;  -- Flat ₹50 shipping for delivery
  END IF;

  -- 9. Calculate total
  v_total := v_subtotal - v_discount + v_tax + v_shipping;

  -- 10. Determine payment status
  IF p_payment_method IN ('razorpay', 'stripe') THEN
    v_payment_status := 'paid';  -- Prepaid orders
  ELSE
    v_payment_status := 'pending';  -- COD orders
  END IF;

  -- 11. Create order
  INSERT INTO orders (
    user_id,
    total_amount,
    status,
    pickup,
    shipping_address,
    payment_method,
    payment_status,
    payment_gateway,
    gateway_order_id,
    gateway_payment_id,
    coupon_code,
    discount_amount,
    tax_amount,
    shipping_amount,
    idempotency_key
  ) VALUES (
    v_user_id,
    v_total,
    'placed',
    p_pickup,
    p_shipping_address,
    p_payment_method,
    v_payment_status,
    p_payment_gateway,
    p_gateway_order_id,
    p_gateway_payment_id,
    p_coupon_code,
    v_discount,
    v_tax,
    v_shipping,
    p_idempotency_key
  ) RETURNING id INTO v_order_id;

  -- 12. Create order_items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    -- Fetch product price again (ensure consistency)
    SELECT price INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID;

    INSERT INTO order_items (
      order_id,
      product_id,
      variant_id,
      variant_label,
      qty,
      price_each
    ) VALUES (
      v_order_id,
      (v_item->>'product_id')::UUID,
      v_item->>'variant_id',
      v_item->>'variant_label',
      (v_item->>'qty')::INTEGER,
      v_product.price
    );
  END LOOP;

  -- 13. Return success response
  RETURN jsonb_build_object(
    'success', TRUE,
    'order_id', v_order_id,
    'total', v_total,
    'subtotal', v_subtotal,
    'discount', v_discount,
    'tax', v_tax,
    'shipping', v_shipping,
    'message', 'Order placed successfully'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', FALSE,
      'error', 'server_error',
      'message', 'Failed to place order: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION orders.place_order TO authenticated;

-- Test the function (example)
-- SELECT orders.place_order(
--   '[{"product_id": "uuid-here", "qty": 2}]'::jsonb,
--   '{"name": "Test User", "phone": "1234567890", "line1": "123 Street", "city": "Mumbai", "state": "Maharashtra", "pincode": "400001", "country": "India"}'::jsonb,
--   FALSE,
--   'cod',
--   NULL,
--   gen_random_uuid()::TEXT
-- );
