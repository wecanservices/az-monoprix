-- ============================================================
-- 2026-08-19 — Reset catalogue + suppression scanner code-barre
-- ============================================================
-- 1. Vide tout le catalogue précédent (Monoprix, seeds dev, etc.).
--    TRUNCATE ... CASCADE propage sur store_products / inventory /
--    product_images / product_tags / inventory_movements et sur les
--    cart_items / order_items (rebase complet avant l'import esmmar).
-- 2. Supprime la colonne `barcode` + son unique + reconstruit le
--    trigger tsv sans elle. L'UI scanner est retirée en parallèle.
-- ============================================================

begin;

-- 1. Wipe des tables catalogue et de tout ce qui pointe dessus.
truncate table
  public.products,
  public.product_images,
  public.product_tags,
  public.store_products,
  public.inventory,
  public.inventory_movements,
  public.cart_items,
  public.order_items
restart identity cascade;

-- 2. Reconstruit le trigger de recherche full-text sans barcode.
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
    setweight(to_tsvector('simple', unaccent(coalesce(new.sku,''))), 'B');
  return new;
end;
$$;

drop trigger if exists tg_products_refresh_tsv on public.products;
create trigger tg_products_refresh_tsv
  before insert or update of name_fr, name_ar, name_en, description_fr, sku
  on public.products
  for each row execute function public.tg_products_refresh_tsv();

-- 3. Drop de la colonne barcode (l'unique tombe avec).
alter table public.products drop column if exists barcode;

commit;
