-- ============================================================
-- AZ MONOPRIX — Delivery helpers, realtime + preparation state
-- ============================================================

-- 1. OTP field on deliveries (already exists, ensure NOT NULL logic)
-- Column is present in the initial schema; nothing to add.

-- 2. Generate 4-digit OTP (returns text with leading zeros) --
create or replace function public.gen_delivery_otp()
returns text
language sql
as $$
  select lpad(floor(random() * 10000)::text, 4, '0');
$$;

-- 3. Trigger: when order transitions to 'ready', create the
--    delivery row + OTP + notify the store's admins.
--    For pickup/drive modes, we still allocate an OTP so the
--    customer can prove pickup.
create or replace function public.tg_orders_on_ready()
returns trigger
language plpgsql
as $$
begin
  if new.status = 'ready' and (old.status is null or old.status <> 'ready') then
    insert into public.deliveries (order_id, otp_code)
    values (new.id, public.gen_delivery_otp())
    on conflict (order_id) do update set otp_code = excluded.otp_code;
  end if;
  return new;
end;
$$;

drop trigger if exists tg_orders_on_ready on public.orders;
create trigger tg_orders_on_ready
  after insert or update of status on public.orders
  for each row execute function public.tg_orders_on_ready();

-- 4. Great-circle distance between two geography points (km)
--    Thin wrapper on ST_Distance to keep call sites readable.
create or replace function public.geo_distance_km(a geography, b geography)
returns numeric
language sql
stable
as $$
  select round((st_distance(a, b) / 1000.0)::numeric, 2);
$$;

-- 5. Driver scoring for auto-dispatch.
--    Returns available drivers sorted by score = distance + load penalty.
--    Kept as a view so both the Edge Function dispatcher and the admin
--    "propose driver" UI query the same source.
create or replace function public.available_drivers_for_order(p_order_id uuid)
returns table (
  driver_id       uuid,
  full_name       text,
  distance_km     numeric,
  active_load     integer,
  rating          numeric,
  score           numeric
)
language sql
stable
as $$
  with o as (
    select o.id, s.location as store_location
      from public.orders o
      join public.stores s on s.id = o.store_id
     where o.id = p_order_id
  ),
  last_loc as (
    select distinct on (driver_id)
      driver_id, location, recorded_at
    from public.driver_locations
    order by driver_id, recorded_at desc
  ),
  active as (
    select driver_id, count(*)::int as n
    from public.deliveries
    where delivered_at is null
      and driver_id is not null
      and accepted_at is not null
    group by driver_id
  )
  select
    d.id,
    p.full_name,
    coalesce(public.geo_distance_km(l.location, o.store_location), 999)::numeric,
    coalesce(a.n, 0),
    coalesce(d.rating, 4.5),
    -- Lower score = better. Distance weighted 1, load weighted 2 km.
    (coalesce(public.geo_distance_km(l.location, o.store_location), 999)
      + 2 * coalesce(a.n, 0)
      - coalesce(d.rating, 4.5))::numeric
  from public.drivers d
  join public.profiles p on p.id = d.id
  cross join o
  left join last_loc l on l.driver_id = d.id
  left join active a on a.driver_id = d.id
  where d.status in ('online')
    and d.is_verified = true
  order by 6 asc
  limit 20;
$$;

-- 6. Enable Realtime on the tables the customer / driver watch.
--    (Local Supabase has the publication `supabase_realtime`.)
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    execute 'alter publication supabase_realtime add table public.orders';
    execute 'alter publication supabase_realtime add table public.order_status_history';
    execute 'alter publication supabase_realtime add table public.order_items';
    execute 'alter publication supabase_realtime add table public.order_replacements';
    execute 'alter publication supabase_realtime add table public.deliveries';
    execute 'alter publication supabase_realtime add table public.driver_locations';
  end if;
exception when duplicate_object then
  -- Tables already in the publication; ignore.
  null;
end$$;

-- 7. Helper: transition the order status with an actor recorded.
create or replace function public.transition_order_status(
  p_order_id uuid,
  p_to       public.order_status,
  p_actor    uuid default null,
  p_reason   text default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  o public.orders;
begin
  update public.orders
    set status = p_to,
        updated_at = now(),
        confirmed_at = case when p_to = 'confirmed' then now() else confirmed_at end,
        delivered_at = case when p_to = 'delivered' then now() else delivered_at end,
        cancelled_at = case when p_to = 'cancelled' then now() else cancelled_at end
  where id = p_order_id
  returning * into o;

  -- The status change is already logged by tg_orders_log_status;
  -- add an explicit reason line when supplied.
  if p_reason is not null then
    insert into public.order_status_history(order_id, from_status, to_status, actor_id, reason)
    values (p_order_id, o.status, p_to, p_actor, p_reason);
  end if;

  return o;
end;
$$;
