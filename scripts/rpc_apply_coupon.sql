-- Apply coupon RPC for validating and calculating discounts
-- Used by CheckoutScreen before placing the order

CREATE OR REPLACE FUNCTION orders.apply_coupon(
  p_code TEXT,
  p_cart JSONB  -- [{product_id, variant_id?, qty}]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER  -- Runs with caller's permissions (requires authentication via RLS)
AS $$
DECLARE
  v_coupon RECORD;
  v_item JSONB;
  v_product RECORD;
  v_subtotal NUMERIC(10,2) := 0;
  v_discount NUMERIC(10,2) := 0;
  v_total_after NUMERIC(10,2) := 0;
  v_note TEXT;
BEGIN
  -- 1. Validate cart is not empty
  IF jsonb_array_length(p_cart) = 0 THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'empty_cart',
      'message', 'Your cart is empty'
    );
  END IF;

  -- 2. Calculate cart subtotal (SERVER-SIDE PRICING)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_cart)
  LOOP
    -- Fetch product price from database
    SELECT id, price, in_stock
    INTO v_product
    FROM products
    WHERE id = (v_item->>'product_id')::UUID;

    IF NOT FOUND THEN
      RETURN jsonb_build_object(
        'valid', FALSE,
        'error', 'product_not_found',
        'message', 'Product not found in cart'
      );
    END IF;

    -- Add to subtotal (server price * quantity)
    v_subtotal := v_subtotal + (v_product.price * (v_item->>'qty')::INTEGER);
  END LOOP;

  -- 3. Fetch and validate coupon
  SELECT *
  INTO v_coupon
  FROM coupons
  WHERE code = UPPER(TRIM(p_code))
  AND active = TRUE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'invalid_code',
      'message', 'Invalid coupon code'
    );
  END IF;

  -- 4. Check validity dates
  IF v_coupon.valid_from > NOW() THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'not_started',
      'message', 'This coupon is not yet valid'
    );
  END IF;

  IF v_coupon.valid_until < NOW() THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'expired',
      'message', 'This coupon has expired'
    );
  END IF;

  -- 5. Check minimum order amount
  IF v_subtotal < v_coupon.min_order_amount THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'min_not_met',
      'message', 'Minimum order of ₹' || v_coupon.min_order_amount || ' required for this coupon. Add ₹' || (v_coupon.min_order_amount - v_subtotal) || ' more to your cart.'
    );
  END IF;

  -- 6. Check usage limit
  IF v_coupon.usage_limit IS NOT NULL AND v_coupon.usage_count >= v_coupon.usage_limit THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'limit_reached',
      'message', 'This coupon has reached its usage limit'
    );
  END IF;

  -- 7. Calculate discount
  IF v_coupon.discount_type = 'percent' THEN
    v_discount := ROUND((v_subtotal * v_coupon.discount_value / 100), 2);
    v_note := v_coupon.discount_value || '% discount applied';
  ELSE
    v_discount := v_coupon.discount_value;
    v_note := '₹' || v_discount || ' discount applied';
  END IF;

  -- 8. Apply max discount cap if set
  IF v_coupon.max_discount IS NOT NULL AND v_discount > v_coupon.max_discount THEN
    v_discount := v_coupon.max_discount;
    v_note := v_note || ' (capped at ₹' || v_discount || ')';
  END IF;

  -- 9. Calculate total after discount
  v_total_after := v_subtotal - v_discount;

  -- 10. Return success response
  RETURN jsonb_build_object(
    'valid', TRUE,
    'code', v_coupon.code,
    'discount', v_discount,
    'subtotal', v_subtotal,
    'total_after', v_total_after,
    'discount_type', v_coupon.discount_type,
    'discount_value', v_coupon.discount_value,
    'note', v_note,
    'message', 'Coupon applied successfully!'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'valid', FALSE,
      'error', 'server_error',
      'message', 'Failed to apply coupon: ' || SQLERRM
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION orders.apply_coupon TO authenticated;

-- Test the function (example)
-- SELECT orders.apply_coupon(
--   'WELCOME10',
--   '[{"product_id": "uuid-here", "qty": 2}]'::jsonb
-- );
