-- Returns top N products by total qty purchased, filtered to active + in-stock
create or replace function public.get_top_products(limit_count int default 4)
returns table (
  id uuid,
  name text,
  price numeric,
  image_url text,
  total_qty bigint
)
language sql
security definer
set search_path = public
as $$
  select p.id, p.name, p.price, p.image_url, sum(oi.qty)::bigint as total_qty
  from public.order_items oi
  join public.orders o on o.id = oi.order_id
  join public.products p on p.id = oi.product_id
  where coalesce(p.is_active, true) = true
    and coalesce(p.in_stock, true) = true
  group by p.id, p.name, p.price, p.image_url
  order by sum(oi.qty) desc
  limit coalesce(limit_count, 4)
$$;

revoke all on function public.get_top_products(int) from public;
grant execute on function public.get_top_products(int) to authenticated, anon;

