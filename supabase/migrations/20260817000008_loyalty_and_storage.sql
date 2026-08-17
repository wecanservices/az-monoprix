-- ============================================================
-- AZ MONOPRIX — Loyalty attribution + Storage bucket
-- ============================================================

-- 1. Attribue automatiquement des points quand une commande est livrée
create or replace function public.tg_orders_award_loyalty()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  cfg   record;
  earn  integer;
  paid  numeric;
begin
  if new.status = 'delivered'
     and (old.status is null or old.status <> 'delivered') then

    select points_per_dzd into cfg from public.loyalty_config where id = true;
    if cfg is null then return new; end if;

    paid := coalesce(new.subtotal, 0) - coalesce(new.discount_total, 0);
    earn := floor(paid * cfg.points_per_dzd);

    if earn > 0 then
      -- Ensure account exists.
      insert into public.loyalty_accounts (customer_id)
        values (new.customer_id)
        on conflict do nothing;

      insert into public.loyalty_transactions (customer_id, order_id, points, reason)
        values (new.customer_id, new.id, earn, 'Points gagnés sur commande ' || new.order_number);

      update public.loyalty_accounts
         set balance = balance + earn,
             lifetime_earned = lifetime_earned + earn,
             updated_at = now()
       where customer_id = new.customer_id;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists tg_orders_award_loyalty on public.orders;
create trigger tg_orders_award_loyalty
  after update of status on public.orders
  for each row execute function public.tg_orders_award_loyalty();


-- 2. Redeem points → décrémente le solde et loggue la transaction
create or replace function public.redeem_loyalty_points(
  p_customer_id uuid,
  p_points integer,
  p_order_id uuid default null,
  p_reason  text default null
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  bal integer;
begin
  select balance into bal from public.loyalty_accounts where customer_id = p_customer_id for update;
  if bal is null then bal := 0; end if;
  if bal < p_points then
    raise exception 'Solde insuffisant : % points disponibles, % demandés', bal, p_points;
  end if;

  insert into public.loyalty_transactions (customer_id, order_id, points, reason)
    values (p_customer_id, p_order_id, -p_points, coalesce(p_reason, 'Points utilisés'));

  update public.loyalty_accounts
     set balance = balance - p_points,
         updated_at = now()
   where customer_id = p_customer_id;

  return bal - p_points;
end;
$$;


-- 3. Storage bucket for product images
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'product-images', 'product-images', true, 5242880,
  array['image/png','image/jpeg','image/webp','image/gif']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- Public read; admin write only.
do $$
begin
  begin
    execute $p$
      create policy "product_images_public_read" on storage.objects
        for select using (bucket_id = 'product-images');
    $p$;
  exception when duplicate_object then null; end;

  begin
    execute $p$
      create policy "product_images_admin_write" on storage.objects
        for all using (bucket_id = 'product-images' and public.is_admin())
        with check (bucket_id = 'product-images' and public.is_admin());
    $p$;
  exception when duplicate_object then null; end;
end$$;
