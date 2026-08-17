-- ============================================================
-- AZ MONOPRIX — Analytics views (read-only surface for dashboard + AI admin)
-- ============================================================

-- Daily KPIs (last 90 days) ------------------------------------
create or replace view public.v_kpis_daily as
select
  date_trunc('day', placed_at)::date as day,
  count(*)                             as orders,
  count(*) filter (where status = 'delivered') as delivered,
  count(*) filter (where status = 'cancelled') as cancelled,
  sum(total)                            as gmv,
  sum(total) filter (where status = 'delivered') as revenue,
  avg(total) filter (where status = 'delivered')::numeric(10,2) as basket_avg,
  count(distinct customer_id)           as unique_customers
from public.orders
where placed_at >= now() - interval '90 days'
group by 1;

-- Top products (last 30 days) ----------------------------------
create or replace view public.v_top_products as
select
  oi.product_id,
  (oi.product_snapshot->>'sku') as sku,
  (oi.product_snapshot->>'name') as name,
  sum(oi.quantity)              as units_sold,
  sum(oi.total)                 as revenue,
  count(distinct oi.order_id)   as orders
from public.order_items oi
join public.orders o on o.id = oi.order_id
where o.placed_at >= now() - interval '30 days'
  and o.status not in ('cancelled', 'refunded')
group by 1, 2, 3
order by units_sold desc
limit 50;

-- Top categories (last 30 days) --------------------------------
create or replace view public.v_top_categories as
select
  c.id             as category_id,
  c.name_fr        as category_name,
  c.icon           as icon,
  sum(oi.quantity) as units_sold,
  sum(oi.total)    as revenue,
  count(distinct oi.order_id) as orders
from public.order_items oi
join public.products p on p.id = oi.product_id
join public.categories c on c.id = p.category_id
join public.orders o on o.id = oi.order_id
where o.placed_at >= now() - interval '30 days'
  and o.status not in ('cancelled', 'refunded')
group by 1, 2, 3
order by revenue desc nulls last
limit 20;

-- Low stock alerts --------------------------------------------
create or replace view public.v_stock_alerts as
select
  i.store_id,
  s.name         as store_name,
  i.product_id,
  p.sku,
  p.name_fr      as product_name,
  i.on_hand,
  i.reserved,
  (i.on_hand - i.reserved) as available,
  i.low_stock
from public.inventory i
join public.products p on p.id = i.product_id
join public.stores   s on s.id = i.store_id
where i.on_hand <= i.low_stock
   or (i.on_hand - i.reserved) <= 0
order by (i.on_hand - i.reserved) asc, i.on_hand asc
limit 100;

-- Driver performance (last 30 days) ---------------------------
create or replace view public.v_driver_performance as
select
  d.id                 as driver_id,
  p.full_name          as driver_name,
  d.rating,
  count(dl.id)         as deliveries,
  sum(o.delivery_fee)  as fees_earned,
  avg(extract(epoch from (dl.delivered_at - dl.assigned_at)) / 60)::numeric(6,1) as avg_minutes
from public.drivers d
join public.profiles p on p.id = d.id
left join public.deliveries dl on dl.driver_id = d.id and dl.delivered_at >= now() - interval '30 days'
left join public.orders o on o.id = dl.order_id
group by 1, 2, 3
order by deliveries desc nulls last;

-- Customer segments (RFM-lite) --------------------------------
create or replace view public.v_customer_segments as
with base as (
  select
    c.id,
    c.created_at,
    count(o.id) filter (where o.status = 'delivered')      as delivered_orders,
    sum(o.total) filter (where o.status = 'delivered')     as lifetime_value,
    max(o.placed_at) filter (where o.status = 'delivered') as last_order_at
  from public.customers c
  left join public.orders o on o.customer_id = c.id
  group by c.id, c.created_at
)
select
  id,
  created_at,
  delivered_orders,
  coalesce(lifetime_value, 0)                        as lifetime_value,
  last_order_at,
  case
    when delivered_orders = 0                        then 'nouveau'
    when last_order_at < now() - interval '90 days'  then 'inactif'
    when lifetime_value >= 30000                     then 'vip'
    when delivered_orders >= 3                       then 'fidele'
    else 'actif'
  end as segment
from base;

-- Segment counts (aggregate for admin banner) -----------------
create or replace view public.v_segment_counts as
select segment, count(*)::int as customers
from public.v_customer_segments
group by segment;

-- Grant read access -------------------------------------------
grant select on public.v_kpis_daily         to authenticated;
grant select on public.v_top_products       to authenticated;
grant select on public.v_top_categories     to authenticated;
grant select on public.v_stock_alerts       to authenticated;
grant select on public.v_driver_performance to authenticated;
grant select on public.v_customer_segments  to authenticated;
grant select on public.v_segment_counts     to authenticated;
