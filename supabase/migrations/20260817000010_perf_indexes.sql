-- ============================================================
-- AZ MONOPRIX — Performance indexes (Phase 8)
-- ============================================================
-- Additional indexes on paths hit by the client & driver hot loops.
-- All wrapped in IF NOT EXISTS so migrations are idempotent.

create index if not exists idx_orders_customer_placed
  on public.orders (customer_id, placed_at desc);

create index if not exists idx_orders_scheduled_end
  on public.orders (scheduled_end) where status not in ('delivered','cancelled','refunded');

create index if not exists idx_deliveries_order
  on public.deliveries (order_id);

create index if not exists idx_deliveries_driver_open
  on public.deliveries (driver_id) where delivered_at is null;

create index if not exists idx_notifications_user_unread
  on public.notifications (user_id, created_at desc) where read_at is null;

create index if not exists idx_cart_items_product
  on public.cart_items (product_id);

create index if not exists idx_products_active_featured
  on public.products (is_active, is_featured) where is_active = true;

create index if not exists idx_products_search_tsv_gin
  on public.products using gin(search_tsv);

create index if not exists idx_store_products_promo
  on public.store_products (store_id, promo_price) where promo_price is not null;

create index if not exists idx_inventory_low
  on public.inventory (store_id) where on_hand <= low_stock;

create index if not exists idx_loyalty_txn_customer_created
  on public.loyalty_transactions (customer_id, created_at desc);

create index if not exists idx_ai_messages_conv_created
  on public.ai_messages (conversation_id, created_at);
