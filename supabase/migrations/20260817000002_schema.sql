-- ============================================================
-- AZ MONOPRIX — Core schema
-- ============================================================
-- Tables organized by domain. Foreign keys use ON DELETE
-- semantics that reflect business intent (restrict for reference
-- data, cascade for owned collections).
-- ============================================================

-- ============================================================
-- 1. IDENTITY & ROLES
-- ============================================================

-- profiles ---------------------------------------------------
-- 1:1 with auth.users. Extended user data + role.
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       citext,
  phone       text,
  full_name   text,
  avatar_url  text,
  role        public.app_role not null default 'customer',
  locale      text default 'fr',
  store_id    uuid,           -- FK added below (after stores table)
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_profiles_role on public.profiles(role);
create index if not exists idx_profiles_email on public.profiles(email);

-- customers --------------------------------------------------
create table if not exists public.customers (
  id                uuid primary key references public.profiles(id) on delete cascade,
  date_of_birth     date,
  gender            text check (gender in ('male','female','other')),
  loyalty_number    text unique,
  marketing_opt_in  boolean not null default true,
  created_at        timestamptz not null default now()
);

-- drivers ----------------------------------------------------
create table if not exists public.drivers (
  id                 uuid primary key references public.profiles(id) on delete cascade,
  vehicle_type       public.vehicle_type not null default 'motorbike',
  vehicle_plate      text,
  license_number     text,
  status             public.driver_status not null default 'offline',
  rating             numeric(3,2),
  total_deliveries   integer not null default 0,
  is_verified        boolean not null default false,
  bank_account       text,
  created_at         timestamptz not null default now()
);
create index if not exists idx_drivers_status on public.drivers(status);

-- ============================================================
-- 2. GEOGRAPHY (Algeria)
-- ============================================================

create table if not exists public.wilayas (
  code       text primary key,   -- '01' .. '58'
  name_fr    text not null,
  name_ar    text not null,
  name_en    text
);

create table if not exists public.communes (
  id           uuid primary key default gen_random_uuid(),
  wilaya_code  text not null references public.wilayas(code) on delete restrict,
  name_fr      text not null,
  name_ar      text,
  postal_code  text
);
create index if not exists idx_communes_wilaya on public.communes(wilaya_code);

-- ============================================================
-- 3. STORES & ZONES
-- ============================================================

create table if not exists public.stores (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  name            text not null,
  wilaya_code     text references public.wilayas(code),
  commune_id      uuid references public.communes(id),
  address         text,
  location        geography(point, 4326),
  phone           text,
  opens_at        time,
  closes_at       time,
  prep_capacity   integer not null default 20,   -- commandes/heure
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- Now that stores exists, add the FK on profiles.
alter table public.profiles
  add constraint profiles_store_id_fkey
  foreign key (store_id) references public.stores(id) on delete set null
  not valid;
alter table public.profiles validate constraint profiles_store_id_fkey;

-- store_zones — polygones GeoJSON de livraison ---------------
create table if not exists public.store_zones (
  id              uuid primary key default gen_random_uuid(),
  store_id        uuid not null references public.stores(id) on delete cascade,
  name            text not null,
  area            geography(polygon, 4326) not null,
  delivery_fee    numeric(10,2) not null default 0,
  min_order       numeric(10,2) not null default 0,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);
create index if not exists idx_store_zones_store on public.store_zones(store_id);
create index if not exists idx_store_zones_area on public.store_zones using gist(area);

-- store_slots — créneaux horaires (récurrents ou datés) ------
create table if not exists public.store_slots (
  id             uuid primary key default gen_random_uuid(),
  store_id       uuid not null references public.stores(id) on delete cascade,
  day_of_week    smallint,       -- 0..6 (récurrent) OU
  slot_date      date,           -- date précise
  starts_at      time not null,
  ends_at        time not null,
  capacity       integer not null default 10,
  mode           public.fulfillment_mode not null default 'delivery',
  is_active      boolean not null default true,
  created_at     timestamptz not null default now(),
  check ((day_of_week is not null) or (slot_date is not null))
);
create index if not exists idx_store_slots_store on public.store_slots(store_id);

-- ============================================================
-- 4. CATALOG
-- ============================================================

create table if not exists public.categories (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid references public.categories(id) on delete set null,
  slug          text unique not null,
  name_fr       text not null,
  name_ar       text,
  name_en       text,
  icon          text,               -- emoji ou nom icône
  image_url     text,
  position      integer not null default 0,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
create index if not exists idx_categories_parent on public.categories(parent_id);

create table if not exists public.brands (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  name        text not null,
  logo_url    text,
  is_active   boolean not null default true
);

create table if not exists public.products (
  id                uuid primary key default gen_random_uuid(),
  sku               text unique not null,
  barcode           text unique,
  category_id       uuid references public.categories(id) on delete set null,
  brand_id          uuid references public.brands(id) on delete set null,
  name_fr           text not null,
  name_ar           text,
  name_en           text,
  slug              text unique,
  description_fr    text,
  description_ar    text,
  description_en    text,
  unit              text,                        -- 'kg', 'L', 'piece'…
  unit_size         numeric(10,3),
  weight_grams      integer,
  base_price        numeric(10,2) not null,       -- prix conseillé, override par store_products
  tva_rate          numeric(4,2) not null default 19.0,
  is_active         boolean not null default true,
  is_featured       boolean not null default false,
  attributes        jsonb not null default '{}'::jsonb,
  search_tsv        tsvector,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists idx_products_category on public.products(category_id);
create index if not exists idx_products_brand on public.products(brand_id);
create index if not exists idx_products_search on public.products using gin(search_tsv);
create index if not exists idx_products_name_trgm on public.products using gin (name_fr gin_trgm_ops);

create table if not exists public.product_images (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid not null references public.products(id) on delete cascade,
  url         text not null,
  alt         text,
  position    integer not null default 0
);
create index if not exists idx_product_images_product on public.product_images(product_id);

create table if not exists public.product_tags (
  product_id  uuid not null references public.products(id) on delete cascade,
  tag         text not null,
  primary key (product_id, tag)
);

-- store_products — prix + dispo par magasin -------------------
create table if not exists public.store_products (
  store_id      uuid not null references public.stores(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  price         numeric(10,2) not null,
  promo_price   numeric(10,2),
  is_available  boolean not null default true,
  updated_at    timestamptz not null default now(),
  primary key (store_id, product_id)
);
create index if not exists idx_store_products_promo on public.store_products(store_id)
  where promo_price is not null;

-- ============================================================
-- 5. INVENTORY
-- ============================================================

create table if not exists public.inventory (
  store_id     uuid not null references public.stores(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  on_hand      integer not null default 0 check (on_hand >= 0),
  reserved     integer not null default 0 check (reserved >= 0),
  low_stock    integer not null default 5,
  updated_at   timestamptz not null default now(),
  primary key (store_id, product_id)
);

create table if not exists public.inventory_movements (
  id            uuid primary key default gen_random_uuid(),
  store_id      uuid not null references public.stores(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  type          public.inventory_movement_type not null,
  quantity      integer not null,
  reference_id  uuid,               -- ex: order_id, transfer_id
  reference_type text,              -- 'order','transfer','manual'
  reason        text,
  actor_id      uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index if not exists idx_inv_moves_store_product on public.inventory_movements(store_id, product_id, created_at desc);

-- ============================================================
-- 6. ADDRESSES
-- ============================================================

create table if not exists public.addresses (
  id             uuid primary key default gen_random_uuid(),
  customer_id    uuid not null references public.customers(id) on delete cascade,
  label          text,                       -- 'Domicile', 'Bureau'…
  full_name      text,
  phone          text,
  wilaya_code    text references public.wilayas(code),
  commune_id     uuid references public.communes(id),
  address_line   text not null,
  building       text,
  floor          text,
  notes          text,
  location       geography(point, 4326),
  is_default     boolean not null default false,
  created_at     timestamptz not null default now()
);
create index if not exists idx_addresses_customer on public.addresses(customer_id);

-- ============================================================
-- 7. CART
-- ============================================================

create table if not exists public.carts (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers(id) on delete cascade,
  session_id   text,                      -- pour panier anonyme
  store_id     uuid references public.stores(id) on delete set null,
  currency     text not null default 'DZD',
  coupon_code  text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (customer_id is not null or session_id is not null)
);
create index if not exists idx_carts_customer on public.carts(customer_id);
create index if not exists idx_carts_session on public.carts(session_id);

create table if not exists public.cart_items (
  id            uuid primary key default gen_random_uuid(),
  cart_id       uuid not null references public.carts(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete restrict,
  quantity      integer not null check (quantity > 0),
  unit_price    numeric(10,2) not null,     -- snapshot au moment de l'ajout
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (cart_id, product_id)
);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);

-- ============================================================
-- 8. ORDERS
-- ============================================================

create table if not exists public.orders (
  id                  uuid primary key default gen_random_uuid(),
  order_number        text unique not null,
  customer_id         uuid not null references public.customers(id) on delete restrict,
  store_id            uuid not null references public.stores(id) on delete restrict,
  status              public.order_status not null default 'pending',
  fulfillment_mode    public.fulfillment_mode not null default 'delivery',
  slot_id             uuid references public.store_slots(id) on delete set null,
  scheduled_start     timestamptz,
  scheduled_end       timestamptz,
  address_snapshot    jsonb,                   -- adresse figée
  currency            text not null default 'DZD',
  subtotal            numeric(10,2) not null default 0,
  discount_total      numeric(10,2) not null default 0,
  delivery_fee        numeric(10,2) not null default 0,
  tax_total           numeric(10,2) not null default 0,
  total               numeric(10,2) not null default 0,
  notes               text,
  cancelled_reason    text,
  placed_at           timestamptz not null default now(),
  confirmed_at        timestamptz,
  delivered_at        timestamptz,
  cancelled_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_orders_customer on public.orders(customer_id, placed_at desc);
create index if not exists idx_orders_store_status on public.orders(store_id, status);
create index if not exists idx_orders_status on public.orders(status)
  where status not in ('delivered','cancelled','refunded');

create table if not exists public.order_items (
  id             uuid primary key default gen_random_uuid(),
  order_id       uuid not null references public.orders(id) on delete cascade,
  product_id     uuid not null references public.products(id) on delete restrict,
  product_snapshot jsonb not null,           -- {sku,name,unit,image_url}
  quantity       integer not null check (quantity > 0),
  quantity_picked integer,
  unit_price     numeric(10,2) not null,
  discount       numeric(10,2) not null default 0,
  total          numeric(10,2) not null,
  is_available   boolean,                    -- null tant que non préparé
  substitution_id uuid                       -- ref order_replacements.id
);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_order_items_product on public.order_items(product_id);

create table if not exists public.order_status_history (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid not null references public.orders(id) on delete cascade,
  from_status  public.order_status,
  to_status    public.order_status not null,
  actor_id     uuid references public.profiles(id) on delete set null,
  reason       text,
  metadata     jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists idx_osh_order on public.order_status_history(order_id, created_at desc);

create table if not exists public.order_replacements (
  id                 uuid primary key default gen_random_uuid(),
  order_id           uuid not null references public.orders(id) on delete cascade,
  original_item_id   uuid not null references public.order_items(id) on delete cascade,
  replacement_product_id uuid references public.products(id) on delete restrict,
  quantity           integer,
  proposed_at        timestamptz not null default now(),
  customer_response  text check (customer_response in ('accepted','rejected','refunded')),
  responded_at       timestamptz,
  actor_id           uuid references public.profiles(id) on delete set null
);

-- ============================================================
-- 9. DELIVERY
-- ============================================================

create table if not exists public.deliveries (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null unique references public.orders(id) on delete cascade,
  driver_id     uuid references public.drivers(id) on delete set null,
  assigned_at   timestamptz,
  accepted_at   timestamptz,
  picked_up_at  timestamptz,
  delivered_at  timestamptz,
  distance_km   numeric(6,2),
  eta_seconds   integer,
  otp_code      text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_deliveries_driver on public.deliveries(driver_id);

create table if not exists public.driver_locations (
  id           bigserial primary key,
  driver_id    uuid not null references public.drivers(id) on delete cascade,
  location     geography(point, 4326) not null,
  heading      numeric(5,2),
  speed_kmh    numeric(5,2),
  accuracy_m   numeric(6,2),
  recorded_at  timestamptz not null default now()
);
create index if not exists idx_driver_locations_driver_ts on public.driver_locations(driver_id, recorded_at desc);

create table if not exists public.delivery_proofs (
  id            uuid primary key default gen_random_uuid(),
  delivery_id   uuid not null references public.deliveries(id) on delete cascade,
  otp_verified  boolean not null default false,
  photo_url     text,
  signature_url text,
  location      geography(point, 4326),
  captured_at   timestamptz not null default now()
);

-- ============================================================
-- 10. CUSTOMER FEATURES
-- ============================================================

create table if not exists public.favorites (
  customer_id  uuid not null references public.customers(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (customer_id, product_id)
);

create table if not exists public.shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  name         text not null,
  is_shared    boolean not null default false,
  share_token  text unique,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.shopping_list_items (
  id           uuid primary key default gen_random_uuid(),
  list_id      uuid not null references public.shopping_lists(id) on delete cascade,
  product_id   uuid not null references public.products(id) on delete cascade,
  quantity     integer not null default 1 check (quantity > 0),
  created_at   timestamptz not null default now(),
  unique (list_id, product_id)
);

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  target_type  text not null check (target_type in ('product','order','driver')),
  target_id    uuid not null,
  rating       smallint not null check (rating between 1 and 5),
  comment      text,
  created_at   timestamptz not null default now(),
  unique (customer_id, target_type, target_id)
);
create index if not exists idx_reviews_target on public.reviews(target_type, target_id);

-- ============================================================
-- 11. MARKETING
-- ============================================================

create table if not exists public.promotions (
  id            uuid primary key default gen_random_uuid(),
  code          text unique,
  name          text not null,
  description   text,
  type          public.promotion_type not null,
  value         numeric(10,2),
  min_order     numeric(10,2),
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  is_active     boolean not null default true,
  banner_url    text,
  rules         jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create table if not exists public.promotion_products (
  promotion_id  uuid not null references public.promotions(id) on delete cascade,
  product_id    uuid not null references public.products(id) on delete cascade,
  primary key (promotion_id, product_id)
);

create table if not exists public.coupons (
  id            uuid primary key default gen_random_uuid(),
  code          text unique not null,
  description   text,
  type          public.promotion_type not null,
  value         numeric(10,2),
  min_order     numeric(10,2),
  max_redemptions integer,
  per_customer_limit integer,
  starts_at     timestamptz not null default now(),
  ends_at       timestamptz,
  is_active     boolean not null default true
);

create table if not exists public.coupon_redemptions (
  id           uuid primary key default gen_random_uuid(),
  coupon_id    uuid not null references public.coupons(id) on delete cascade,
  customer_id  uuid not null references public.customers(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete set null,
  amount_off   numeric(10,2) not null,
  redeemed_at  timestamptz not null default now()
);
create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions(coupon_id);

create table if not exists public.banners (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  image_url   text not null,
  link_url    text,
  position    integer not null default 0,
  starts_at   timestamptz not null default now(),
  ends_at     timestamptz,
  is_active   boolean not null default true
);

create table if not exists public.campaigns (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  segment      jsonb not null default '{}'::jsonb,  -- ex: {"role":"customer","last_order_days_gt":30}
  channel      public.notification_channel not null,
  payload      jsonb not null,
  scheduled_at timestamptz,
  sent_at      timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 12. LOYALTY
-- ============================================================

create table if not exists public.loyalty_config (
  id                     boolean primary key default true check (id),   -- singleton
  points_per_dzd         numeric(6,4) not null default 1.0,
  dzd_per_point          numeric(6,4) not null default 1.0,
  min_redeem_points      integer not null default 100,
  updated_at             timestamptz not null default now()
);

create table if not exists public.loyalty_accounts (
  customer_id  uuid primary key references public.customers(id) on delete cascade,
  balance      integer not null default 0,
  lifetime_earned integer not null default 0,
  updated_at   timestamptz not null default now()
);

create table if not exists public.loyalty_transactions (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid not null references public.customers(id) on delete cascade,
  order_id     uuid references public.orders(id) on delete set null,
  points       integer not null,          -- + earn, - burn
  reason       text,
  created_at   timestamptz not null default now()
);
create index if not exists idx_loyalty_txn_customer on public.loyalty_transactions(customer_id, created_at desc);

-- ============================================================
-- 13. PAYMENTS & FINANCE
-- ============================================================

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references public.orders(id) on delete cascade,
  method        public.payment_method not null,
  status        public.payment_status not null default 'pending',
  amount        numeric(10,2) not null,
  currency      text not null default 'DZD',
  provider      text,
  provider_ref  text,
  metadata      jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments(order_id);

create table if not exists public.refunds (
  id            uuid primary key default gen_random_uuid(),
  payment_id    uuid not null references public.payments(id) on delete restrict,
  amount        numeric(10,2) not null,
  reason        text,
  status        public.payment_status not null default 'pending',
  processed_at  timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.driver_wallets (
  driver_id     uuid primary key references public.drivers(id) on delete cascade,
  balance       numeric(10,2) not null default 0,
  updated_at    timestamptz not null default now()
);

create table if not exists public.driver_wallet_transactions (
  id            uuid primary key default gen_random_uuid(),
  driver_id     uuid not null references public.drivers(id) on delete cascade,
  order_id      uuid references public.orders(id) on delete set null,
  amount        numeric(10,2) not null,      -- + credit, - debit
  type          text not null,               -- 'delivery_fee','bonus','payout'
  description   text,
  created_at    timestamptz not null default now()
);
create index if not exists idx_dwt_driver on public.driver_wallet_transactions(driver_id, created_at desc);

-- ============================================================
-- 14. COMMUNICATION
-- ============================================================

create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  channel      public.notification_channel not null default 'in_app',
  title        text not null,
  body         text,
  link_url     text,
  metadata     jsonb,
  read_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

create table if not exists public.notification_tokens (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  platform     text not null,       -- 'web','android','ios'
  token        text not null,
  created_at   timestamptz not null default now(),
  unique (user_id, token)
);

create table if not exists public.chat_conversations (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers(id) on delete set null,
  agent_id     uuid references public.profiles(id) on delete set null,
  order_id     uuid references public.orders(id) on delete set null,
  subject      text,
  is_ai        boolean not null default false,
  is_closed    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.chat_messages (
  id               uuid primary key default gen_random_uuid(),
  conversation_id  uuid not null references public.chat_conversations(id) on delete cascade,
  sender_id        uuid references public.profiles(id) on delete set null,
  sender_role      text not null check (sender_role in ('customer','agent','ai','system')),
  body             text not null,
  attachments      jsonb,
  created_at       timestamptz not null default now()
);
create index if not exists idx_chat_messages_conv on public.chat_messages(conversation_id, created_at);

create table if not exists public.support_tickets (
  id           uuid primary key default gen_random_uuid(),
  customer_id  uuid references public.customers(id) on delete set null,
  order_id     uuid references public.orders(id) on delete set null,
  category     public.ticket_category not null,
  status       public.ticket_status not null default 'open',
  subject      text not null,
  description  text,
  assigned_to  uuid references public.profiles(id) on delete set null,
  resolved_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_tickets_status on public.support_tickets(status, created_at desc);

create table if not exists public.ticket_messages (
  id           uuid primary key default gen_random_uuid(),
  ticket_id    uuid not null references public.support_tickets(id) on delete cascade,
  sender_id    uuid references public.profiles(id) on delete set null,
  body         text not null,
  attachments  jsonb,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 15. AI
-- ============================================================

create table if not exists public.ai_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid references public.profiles(id) on delete cascade,
  purpose       text not null check (purpose in ('shopping','support','admin_query')),
  context       jsonb,             -- { store_id, budget, people, occasion… }
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.ai_messages (
  id                uuid primary key default gen_random_uuid(),
  conversation_id   uuid not null references public.ai_conversations(id) on delete cascade,
  role              text not null check (role in ('system','user','assistant','tool')),
  content           text,
  structured        jsonb,          -- réponse JSON validée (suggestions produits, SQL…)
  provided_skus     text[],         -- SKUs fournis en contexte (audit anti-hallucination)
  tokens_input      integer,
  tokens_output     integer,
  latency_ms        integer,
  created_at        timestamptz not null default now()
);
create index if not exists idx_ai_msg_conv on public.ai_messages(conversation_id, created_at);

create table if not exists public.ai_feedback (
  id                uuid primary key default gen_random_uuid(),
  message_id        uuid not null references public.ai_messages(id) on delete cascade,
  user_id           uuid references public.profiles(id) on delete set null,
  rating            smallint check (rating between -1 and 1),
  comment           text,
  created_at        timestamptz not null default now()
);

-- ============================================================
-- 16. SYSTEM
-- ============================================================

create table if not exists public.audit_log (
  id            bigserial primary key,
  actor_id      uuid references public.profiles(id) on delete set null,
  action        text not null,          -- 'order.cancel','product.update'…
  entity_type   text not null,
  entity_id     uuid,
  before_data   jsonb,
  after_data    jsonb,
  metadata      jsonb,
  created_at    timestamptz not null default now()
);
create index if not exists idx_audit_actor on public.audit_log(actor_id, created_at desc);
create index if not exists idx_audit_entity on public.audit_log(entity_type, entity_id, created_at desc);

create table if not exists public.settings (
  key          text primary key,
  value        jsonb not null,
  description  text,
  updated_at   timestamptz not null default now(),
  updated_by   uuid references public.profiles(id) on delete set null
);

create table if not exists public.feature_flags (
  key          text primary key,
  enabled      boolean not null default false,
  description  text,
  updated_at   timestamptz not null default now()
);
