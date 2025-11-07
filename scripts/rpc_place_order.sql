-- Place an order atomically from a client-provided cart (product_id, qty)
-- Security: price_each computed server-side; rejects out-of-stock; ties order to auth.uid()
create or replace function public.place_order(
  p_items jsonb
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_order public.orders;
  v_total numeric := 0;
  v_item jsonb;
  v_pid uuid;
  v_qty int;
  v_price numeric;
  v_in_stock boolean;
begin
  if v_user is null then
    raise exception 'Not authenticated' using hint = 'auth_required';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Empty cart' using hint = 'empty_cart';
  end if;

  -- create order shell
  insert into public.orders (user_id, total_amount, status)
  values (v_user, 0, 'placed')
  returning * into v_order;

  -- iterate cart
  for v_item in select jsonb_array_elements(p_items)
  loop
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := coalesce((v_item->>'qty')::int, 1);

    if v_pid is null then
      raise exception 'Missing product_id' using hint = 'invalid_item';
    end if;
    if v_qty is null or v_qty <= 0 then
      raise exception 'Invalid qty' using hint = 'invalid_qty';
    end if;

    select price, in_stock
      into v_price, v_in_stock
      from public.products
      where id = v_pid
      for update;

    if not found then
      raise exception 'Product not found' using hint = 'product_not_found';
    end if;
    if not v_in_stock then
      raise exception 'Product out of stock' using hint = 'out_of_stock';
    end if;

    insert into public.order_items (order_id, product_id, qty, price_each)
    values (v_order.id, v_pid, v_qty, v_price);

    v_total := v_total + (v_price * v_qty);
  end loop;

  update public.orders
    set total_amount = v_total
    where id = v_order.id
    returning * into v_order;

  return v_order;
exception when others then
  -- cleanup any partial order in case of failures
  begin
    if v_order.id is not null then
      delete from public.order_items where order_id = v_order.id;
      delete from public.orders where id = v_order.id;
    end if;
  exception when others then
    null;
  end;
  raise;
end;
$$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to authenticated;

