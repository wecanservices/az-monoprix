-- ============================================================
-- AZ MONOPRIX — Extensions & enums
-- ============================================================
-- All custom types used across the schema live here so subsequent
-- migrations can reference them without ordering headaches.
-- ============================================================

-- Extensions --------------------------------------------------
create extension if not exists "pgcrypto";        -- gen_random_uuid()
create extension if not exists "citext";          -- case-insensitive text (emails)
create extension if not exists "pg_trgm";         -- trigram search (product name search)
create extension if not exists "unaccent";        -- accent-insensitive search
create extension if not exists "postgis";         -- geo (store zones, driver locations)

-- Application roles -------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'guest',
      'customer',
      'driver',
      'store_manager',
      'admin',
      'super_admin'
    );
  end if;
end$$;

-- Driver status -----------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'driver_status') then
    create type public.driver_status as enum (
      'offline',
      'online',
      'busy'
    );
  end if;
end$$;

-- Vehicle type ------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'vehicle_type') then
    create type public.vehicle_type as enum (
      'motorbike',
      'scooter',
      'car',
      'van',
      'bike',
      'foot'
    );
  end if;
end$$;

-- Order lifecycle ---------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'order_status') then
    create type public.order_status as enum (
      'pending',
      'confirmed',
      'preparing',
      'partially_available',
      'ready',
      'assigned',
      'accepted',
      'go_to_store',
      'at_store',
      'picked_up',
      'go_to_customer',
      'at_customer',
      'delivered',
      'cancelled',
      'refunded'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'fulfillment_mode') then
    create type public.fulfillment_mode as enum ('delivery', 'drive', 'pickup');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_method') then
    create type public.payment_method as enum (
      'cash_on_delivery',
      'card_on_delivery',
      'card_online',
      'edahabia',
      'cib',
      'wallet'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'payment_status') then
    create type public.payment_status as enum (
      'pending',
      'authorized',
      'captured',
      'failed',
      'refunded',
      'partially_refunded'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'inventory_movement_type') then
    create type public.inventory_movement_type as enum (
      'receive',
      'reserve',
      'release',
      'pick',
      'return',
      'adjust',
      'transfer_in',
      'transfer_out',
      'loss'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'promotion_type') then
    create type public.promotion_type as enum (
      'percentage',
      'fixed_amount',
      'buy_x_get_y',
      'bundle',
      'free_shipping'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_status') then
    create type public.ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'ticket_category') then
    create type public.ticket_category as enum (
      'order', 'product', 'payment', 'delivery', 'driver', 'refund', 'other'
    );
  end if;
end$$;

do $$
begin
  if not exists (select 1 from pg_type where typname = 'notification_channel') then
    create type public.notification_channel as enum ('push', 'sms', 'email', 'in_app');
  end if;
end$$;
