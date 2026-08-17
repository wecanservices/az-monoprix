-- ============================================================
-- AZ MONOPRIX — Functions & triggers
-- ============================================================
-- Business logic that must live close to the data:
--   - updated_at auto-touch
--   - order number generator
--   - profile auto-provision on auth.users insert
--   - inventory helpers
--   - product search vector refresh
-- ============================================================

-- Generic updated_at trigger ---------------------------------
create or replace function public.tg_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles','stores','products','store_products',
      'inventory','carts','cart_items','orders',
      'notifications','support_tickets','shopping_lists',
      'ai_conversations','loyalty_accounts','driver_wallets',
      'payments'
    ])
  loop
    execute format(
      'drop trigger if exists tg_%1$s_touch_updated_at on public.%1$s;
       create trigger tg_%1$s_touch_updated_at
         before update on public.%1$s
         for each row execute function public.tg_touch_updated_at();',
      t
    );
  end loop;
end$$;

-- Profile auto-provision on signup ---------------------------
-- When a new auth.users row is inserted, create the linked profile.
create or replace function public.tg_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, phone, full_name, role)
  values (
    new.id,
    new.email,
    new.phone,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer')
  )
  on conflict (id) do nothing;

  -- Auto-create customer sub-row for the default 'customer' role.
  if coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer') = 'customer' then
    insert into public.customers (id) values (new.id) on conflict (id) do nothing;
    insert into public.loyalty_accounts (customer_id) values (new.id) on conflict do nothing;
  end if;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.tg_handle_new_user();

-- Order number generator -------------------------------------
-- Format: AZ-YYYY-NNNNNN. Sequence-backed for uniqueness.
create sequence if not exists public.order_number_seq;

create or replace function public.next_order_number()
returns text
language plpgsql
as $$
declare
  n bigint;
begin
  n := nextval('public.order_number_seq');
  return 'AZ-' || to_char(now(), 'YYYY') || '-' || lpad(n::text, 6, '0');
end;
$$;

create or replace function public.tg_orders_set_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := public.next_order_number();
  end if;
  return new;
end;
$$;

drop trigger if exists tg_orders_set_number on public.orders;
create trigger tg_orders_set_number
  before insert on public.orders
  for each row execute function public.tg_orders_set_number();

-- Status transition log --------------------------------------
create or replace function public.tg_orders_log_status()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.order_status_history(order_id, from_status, to_status)
    values (new.id, old.status, new.status);
  elsif tg_op = 'INSERT' then
    insert into public.order_status_history(order_id, from_status, to_status)
    values (new.id, null, new.status);
  end if;
  return new;
end;
$$;

drop trigger if exists tg_orders_log_status_ins on public.orders;
create trigger tg_orders_log_status_ins
  after insert on public.orders
  for each row execute function public.tg_orders_log_status();

drop trigger if exists tg_orders_log_status_upd on public.orders;
create trigger tg_orders_log_status_upd
  after update of status on public.orders
  for each row execute function public.tg_orders_log_status();

-- Product search vector --------------------------------------
create or replace function public.tg_products_refresh_tsv()
returns trigger
language plpgsql
as $$
begin
  new.search_tsv :=
    setweight(to_tsvector('simple', unaccent(coalesce(new.name_fr,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.name_ar,''))), 'A') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.name_en,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.description_fr,''))), 'C') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.sku,''))), 'B') ||
    setweight(to_tsvector('simple', unaccent(coalesce(new.barcode,''))), 'D');
  return new;
end;
$$;

drop trigger if exists tg_products_refresh_tsv on public.products;
create trigger tg_products_refresh_tsv
  before insert or update of name_fr, name_ar, name_en, description_fr, sku, barcode
  on public.products
  for each row execute function public.tg_products_refresh_tsv();

-- Inventory movement → apply on inventory row ----------------
-- Keeps `inventory.on_hand` and `inventory.reserved` in sync with
-- every movement inserted.
create or replace function public.tg_inv_movement_apply()
returns trigger
language plpgsql
as $$
begin
  insert into public.inventory (store_id, product_id, on_hand, reserved)
  values (new.store_id, new.product_id, 0, 0)
  on conflict do nothing;

  update public.inventory i
     set on_hand = case new.type
                     when 'receive'     then i.on_hand + new.quantity
                     when 'return'      then i.on_hand + new.quantity
                     when 'transfer_in' then i.on_hand + new.quantity
                     when 'adjust'      then i.on_hand + new.quantity
                     when 'pick'        then i.on_hand - new.quantity
                     when 'transfer_out'then i.on_hand - new.quantity
                     when 'loss'        then i.on_hand - new.quantity
                     else i.on_hand
                   end,
         reserved = case new.type
                     when 'reserve' then i.reserved + new.quantity
                     when 'release' then i.reserved - new.quantity
                     when 'pick'    then i.reserved - new.quantity
                     else i.reserved
                   end,
         updated_at = now()
   where i.store_id = new.store_id and i.product_id = new.product_id;

  return new;
end;
$$;

drop trigger if exists tg_inv_movement_apply on public.inventory_movements;
create trigger tg_inv_movement_apply
  after insert on public.inventory_movements
  for each row execute function public.tg_inv_movement_apply();

-- Convenience view: current user's role ----------------------
create or replace function public.current_user_role()
returns public.app_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

-- Convenience: is admin? -------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role in ('admin','super_admin','store_manager')
       from public.profiles where id = auth.uid()),
    false
  );
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select role = 'super_admin' from public.profiles where id = auth.uid()),
    false
  );
$$;
