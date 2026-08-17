-- ============================================================
-- AZ MONOPRIX — Row Level Security
-- ============================================================
-- Enable RLS on every business table and define policies scoped
-- by the caller's role and ownership.
-- ============================================================

-- Enable RLS ---------------------------------------------------
do $$
declare t text;
begin
  for t in
    select unnest(array[
      'profiles','customers','drivers',
      'wilayas','communes',
      'stores','store_zones','store_slots',
      'categories','brands','products','product_images','product_tags','store_products',
      'inventory','inventory_movements',
      'addresses',
      'carts','cart_items',
      'orders','order_items','order_status_history','order_replacements',
      'deliveries','driver_locations','delivery_proofs',
      'favorites','shopping_lists','shopping_list_items','reviews',
      'promotions','promotion_products','coupons','coupon_redemptions','banners','campaigns',
      'loyalty_config','loyalty_accounts','loyalty_transactions',
      'payments','refunds','driver_wallets','driver_wallet_transactions',
      'notifications','notification_tokens',
      'chat_conversations','chat_messages',
      'support_tickets','ticket_messages',
      'ai_conversations','ai_messages','ai_feedback',
      'audit_log','settings','feature_flags'
    ])
  loop
    execute format('alter table public.%I enable row level security;', t);
  end loop;
end$$;

-- Reference data — readable by everyone -----------------------
create policy "wilayas_read_all" on public.wilayas
  for select using (true);
create policy "communes_read_all" on public.communes
  for select using (true);

-- PROFILES ----------------------------------------------------
create policy "profiles_read_own" on public.profiles
  for select using (id = auth.uid() or public.is_admin());
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid());
create policy "profiles_admin_all" on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- CUSTOMERS ---------------------------------------------------
create policy "customers_self" on public.customers
  for all using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- DRIVERS -----------------------------------------------------
create policy "drivers_self_read" on public.drivers
  for select using (id = auth.uid() or public.is_admin());
create policy "drivers_self_update" on public.drivers
  for update using (id = auth.uid())
  with check (id = auth.uid());
create policy "drivers_admin_manage" on public.drivers
  for all using (public.is_admin())
  with check (public.is_admin());

-- STORES & related — public read; admin write -----------------
create policy "stores_read_all" on public.stores
  for select using (is_active or public.is_admin());
create policy "stores_admin_write" on public.stores
  for all using (public.is_admin()) with check (public.is_admin());

create policy "store_zones_read_active" on public.store_zones
  for select using (is_active or public.is_admin());
create policy "store_zones_admin" on public.store_zones
  for all using (public.is_admin()) with check (public.is_admin());

create policy "store_slots_read" on public.store_slots
  for select using (is_active or public.is_admin());
create policy "store_slots_admin" on public.store_slots
  for all using (public.is_admin()) with check (public.is_admin());

-- CATALOG — public read; admin write --------------------------
create policy "categories_read" on public.categories
  for select using (is_active or public.is_admin());
create policy "categories_admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

create policy "brands_read" on public.brands
  for select using (is_active or public.is_admin());
create policy "brands_admin" on public.brands
  for all using (public.is_admin()) with check (public.is_admin());

create policy "products_read" on public.products
  for select using (is_active or public.is_admin());
create policy "products_admin" on public.products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "product_images_read" on public.product_images
  for select using (
    exists(select 1 from public.products p where p.id = product_id and p.is_active)
    or public.is_admin()
  );
create policy "product_images_admin" on public.product_images
  for all using (public.is_admin()) with check (public.is_admin());

create policy "product_tags_read" on public.product_tags
  for select using (true);
create policy "product_tags_admin" on public.product_tags
  for all using (public.is_admin()) with check (public.is_admin());

create policy "store_products_read" on public.store_products
  for select using (is_available or public.is_admin());
create policy "store_products_admin" on public.store_products
  for all using (public.is_admin()) with check (public.is_admin());

-- INVENTORY — admin only (stock is sensitive) -----------------
create policy "inventory_admin_all" on public.inventory
  for all using (public.is_admin()) with check (public.is_admin());

create policy "inventory_movements_admin" on public.inventory_movements
  for all using (public.is_admin()) with check (public.is_admin());

-- ADDRESSES — customer scope ---------------------------------
create policy "addresses_own" on public.addresses
  for all using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

-- CARTS — owner (by customer_id OR session cookie via app) ---
-- Note: anonymous carts (session_id) are managed via service_role in
-- the API layer; RLS covers only authenticated customers.
create policy "carts_owner" on public.carts
  for all using (customer_id = auth.uid() or public.is_admin())
  with check (customer_id = auth.uid() or public.is_admin());

create policy "cart_items_owner" on public.cart_items
  for all using (
    exists (select 1 from public.carts c
             where c.id = cart_id and c.customer_id = auth.uid())
    or public.is_admin()
  ) with check (
    exists (select 1 from public.carts c
             where c.id = cart_id and c.customer_id = auth.uid())
    or public.is_admin()
  );

-- ORDERS -----------------------------------------------------
create policy "orders_customer_read" on public.orders
  for select using (
    customer_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.deliveries d
                where d.order_id = orders.id and d.driver_id = auth.uid())
  );
create policy "orders_customer_insert" on public.orders
  for insert with check (customer_id = auth.uid());
create policy "orders_admin_update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

create policy "order_items_read" on public.order_items
  for select using (
    exists (select 1 from public.orders o
             where o.id = order_id
               and (o.customer_id = auth.uid() or public.is_admin()
                    or exists (select 1 from public.deliveries d
                                where d.order_id = o.id and d.driver_id = auth.uid())))
  );
create policy "order_items_admin_write" on public.order_items
  for all using (public.is_admin()) with check (public.is_admin());

create policy "order_status_history_read" on public.order_status_history
  for select using (
    exists (select 1 from public.orders o
             where o.id = order_id
               and (o.customer_id = auth.uid() or public.is_admin()))
  );

create policy "order_replacements_read" on public.order_replacements
  for select using (
    exists (select 1 from public.orders o
             where o.id = order_id
               and (o.customer_id = auth.uid() or public.is_admin()))
  );
create policy "order_replacements_admin" on public.order_replacements
  for all using (public.is_admin()) with check (public.is_admin());

-- DELIVERIES / DRIVER LOCATIONS ------------------------------
create policy "deliveries_read" on public.deliveries
  for select using (
    driver_id = auth.uid()
    or public.is_admin()
    or exists (select 1 from public.orders o
                where o.id = order_id and o.customer_id = auth.uid())
  );
create policy "deliveries_driver_update" on public.deliveries
  for update using (driver_id = auth.uid() or public.is_admin())
  with check (driver_id = auth.uid() or public.is_admin());
create policy "deliveries_admin_insert" on public.deliveries
  for insert with check (public.is_admin());

create policy "driver_locations_own_insert" on public.driver_locations
  for insert with check (driver_id = auth.uid());
create policy "driver_locations_read" on public.driver_locations
  for select using (
    driver_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.deliveries d
        join public.orders o on o.id = d.order_id
       where d.driver_id = driver_locations.driver_id
         and o.customer_id = auth.uid()
         and d.delivered_at is null
    )
  );

create policy "delivery_proofs_read" on public.delivery_proofs
  for select using (
    exists (select 1 from public.deliveries d
              join public.orders o on o.id = d.order_id
             where d.id = delivery_id
               and (o.customer_id = auth.uid()
                    or d.driver_id = auth.uid()
                    or public.is_admin()))
  );
create policy "delivery_proofs_insert" on public.delivery_proofs
  for insert with check (
    exists (select 1 from public.deliveries d
             where d.id = delivery_id
               and (d.driver_id = auth.uid() or public.is_admin()))
  );

-- CUSTOMER FEATURES ------------------------------------------
create policy "favorites_own" on public.favorites
  for all using (customer_id = auth.uid()) with check (customer_id = auth.uid());

create policy "shopping_lists_own" on public.shopping_lists
  for all using (customer_id = auth.uid() or is_shared)
  with check (customer_id = auth.uid());

create policy "shopping_list_items_own" on public.shopping_list_items
  for all using (
    exists (select 1 from public.shopping_lists l
             where l.id = list_id and (l.customer_id = auth.uid() or l.is_shared))
  ) with check (
    exists (select 1 from public.shopping_lists l
             where l.id = list_id and l.customer_id = auth.uid())
  );

create policy "reviews_read_all" on public.reviews for select using (true);
create policy "reviews_own_write" on public.reviews
  for insert with check (customer_id = auth.uid());
create policy "reviews_own_update" on public.reviews
  for update using (customer_id = auth.uid()) with check (customer_id = auth.uid());
create policy "reviews_own_delete" on public.reviews
  for delete using (customer_id = auth.uid() or public.is_admin());

-- MARKETING --------------------------------------------------
create policy "promotions_read_active" on public.promotions
  for select using (is_active or public.is_admin());
create policy "promotions_admin" on public.promotions
  for all using (public.is_admin()) with check (public.is_admin());

create policy "promotion_products_read" on public.promotion_products for select using (true);
create policy "promotion_products_admin" on public.promotion_products
  for all using (public.is_admin()) with check (public.is_admin());

create policy "coupons_read_active" on public.coupons
  for select using (is_active or public.is_admin());
create policy "coupons_admin" on public.coupons
  for all using (public.is_admin()) with check (public.is_admin());

create policy "coupon_redemptions_read_own" on public.coupon_redemptions
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "coupon_redemptions_insert_own" on public.coupon_redemptions
  for insert with check (customer_id = auth.uid() or public.is_admin());

create policy "banners_read_active" on public.banners
  for select using (is_active or public.is_admin());
create policy "banners_admin" on public.banners
  for all using (public.is_admin()) with check (public.is_admin());

create policy "campaigns_admin" on public.campaigns
  for all using (public.is_admin()) with check (public.is_admin());

-- LOYALTY ----------------------------------------------------
create policy "loyalty_config_read" on public.loyalty_config for select using (true);
create policy "loyalty_config_admin" on public.loyalty_config
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "loyalty_accounts_own" on public.loyalty_accounts
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "loyalty_accounts_admin" on public.loyalty_accounts
  for all using (public.is_admin()) with check (public.is_admin());

create policy "loyalty_txns_own_read" on public.loyalty_transactions
  for select using (customer_id = auth.uid() or public.is_admin());
create policy "loyalty_txns_admin" on public.loyalty_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- PAYMENTS ---------------------------------------------------
create policy "payments_read_own" on public.payments
  for select using (
    exists (select 1 from public.orders o
             where o.id = order_id and (o.customer_id = auth.uid() or public.is_admin()))
  );
create policy "payments_admin_write" on public.payments
  for all using (public.is_admin()) with check (public.is_admin());

create policy "refunds_admin" on public.refunds
  for all using (public.is_admin()) with check (public.is_admin());

create policy "driver_wallets_own" on public.driver_wallets
  for select using (driver_id = auth.uid() or public.is_admin());
create policy "driver_wallets_admin" on public.driver_wallets
  for all using (public.is_admin()) with check (public.is_admin());

create policy "dwt_own_read" on public.driver_wallet_transactions
  for select using (driver_id = auth.uid() or public.is_admin());
create policy "dwt_admin_write" on public.driver_wallet_transactions
  for all using (public.is_admin()) with check (public.is_admin());

-- COMMUNICATION ----------------------------------------------
create policy "notifications_own" on public.notifications
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "notification_tokens_own" on public.notification_tokens
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "chat_conv_own" on public.chat_conversations
  for select using (
    customer_id = auth.uid() or agent_id = auth.uid() or public.is_admin()
  );
create policy "chat_conv_insert_own" on public.chat_conversations
  for insert with check (customer_id = auth.uid() or public.is_admin());
create policy "chat_conv_admin_update" on public.chat_conversations
  for update using (public.is_admin() or agent_id = auth.uid())
  with check (public.is_admin() or agent_id = auth.uid());

create policy "chat_messages_scope" on public.chat_messages
  for select using (
    exists (select 1 from public.chat_conversations c
             where c.id = conversation_id
               and (c.customer_id = auth.uid() or c.agent_id = auth.uid() or public.is_admin()))
  );
create policy "chat_messages_insert" on public.chat_messages
  for insert with check (
    exists (select 1 from public.chat_conversations c
             where c.id = conversation_id
               and (c.customer_id = auth.uid() or c.agent_id = auth.uid() or public.is_admin()))
  );

create policy "tickets_read_own" on public.support_tickets
  for select using (customer_id = auth.uid() or assigned_to = auth.uid() or public.is_admin());
create policy "tickets_insert_own" on public.support_tickets
  for insert with check (customer_id = auth.uid());
create policy "tickets_admin_update" on public.support_tickets
  for update using (public.is_admin() or assigned_to = auth.uid())
  with check (public.is_admin() or assigned_to = auth.uid());

create policy "ticket_messages_scope" on public.ticket_messages
  for select using (
    exists (select 1 from public.support_tickets t
             where t.id = ticket_id
               and (t.customer_id = auth.uid() or t.assigned_to = auth.uid() or public.is_admin()))
  );
create policy "ticket_messages_insert" on public.ticket_messages
  for insert with check (
    exists (select 1 from public.support_tickets t
             where t.id = ticket_id
               and (t.customer_id = auth.uid() or t.assigned_to = auth.uid() or public.is_admin()))
  );

-- AI ---------------------------------------------------------
create policy "ai_conv_own" on public.ai_conversations
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "ai_msg_scope" on public.ai_messages
  for select using (
    exists (select 1 from public.ai_conversations c
             where c.id = conversation_id
               and (c.user_id = auth.uid() or public.is_admin()))
  );
create policy "ai_msg_insert_own" on public.ai_messages
  for insert with check (
    exists (select 1 from public.ai_conversations c
             where c.id = conversation_id
               and (c.user_id = auth.uid() or public.is_admin()))
  );

create policy "ai_feedback_own" on public.ai_feedback
  for insert with check (user_id = auth.uid());
create policy "ai_feedback_read" on public.ai_feedback
  for select using (user_id = auth.uid() or public.is_admin());

-- SYSTEM -----------------------------------------------------
create policy "audit_read_admin" on public.audit_log
  for select using (public.is_admin());
create policy "audit_insert_any" on public.audit_log
  for insert with check (true);   -- écrit par triggers / services

create policy "settings_read_admin" on public.settings
  for select using (public.is_admin());
create policy "settings_write_super" on public.settings
  for all using (public.is_super_admin()) with check (public.is_super_admin());

create policy "feature_flags_read_all" on public.feature_flags for select using (true);
create policy "feature_flags_write_super" on public.feature_flags
  for all using (public.is_super_admin()) with check (public.is_super_admin());
