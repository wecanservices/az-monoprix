-- ============================================================
-- AZ MONOPRIX — Seed catalogue de développement
-- ============================================================
-- Données fictives pour Phase 2. Clairement identifiables par le
-- SKU préfixé `AZ-` et le magasin `MONOPRIX-BE`.
-- ⚠️  À NE PAS déployer en production tel quel.
-- ============================================================

-- 1. MAGASIN --------------------------------------------------
insert into public.stores (id, code, name, wilaya_code, address, phone, opens_at, closes_at, prep_capacity, is_active)
values (
  '00000000-0000-0000-0000-000000000001',
  'MONOPRIX-BE',
  'AZ Monoprix — Bab Ezzouar',
  '16',
  'Centre commercial Bab Ezzouar, Alger',
  '+213 21 00 00 00',
  '08:00',
  '22:00',
  30,
  true
) on conflict (code) do nothing;

-- Créneaux récurrents (tous les jours, 4 slots) ---------------
insert into public.store_slots (store_id, day_of_week, starts_at, ends_at, capacity, mode)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  d,
  s::time,
  e::time,
  15,
  'delivery'::public.fulfillment_mode
from generate_series(0, 6) as d,
     (values ('10:00','12:00'), ('12:00','14:00'), ('14:00','16:00'), ('16:00','18:00'), ('18:00','20:00')) as t(s, e)
on conflict do nothing;

-- 2. CATÉGORIES -----------------------------------------------
insert into public.categories (id, slug, name_fr, name_ar, name_en, icon, position) values
  ('11111111-0000-0000-0000-000000000001','fruits-legumes','Fruits & légumes','فواكه وخضار','Fruits & Vegetables','🍎',1),
  ('11111111-0000-0000-0000-000000000002','viandes','Viandes & volailles','لحوم ودواجن','Meat & Poultry','🥩',2),
  ('11111111-0000-0000-0000-000000000003','poissons','Poissons','أسماك','Fish','🐟',3),
  ('11111111-0000-0000-0000-000000000004','laitiers','Produits laitiers','منتجات الألبان','Dairy','🥛',4),
  ('11111111-0000-0000-0000-000000000005','epicerie','Épicerie','بقالة','Grocery','🥫',5),
  ('11111111-0000-0000-0000-000000000006','boissons','Boissons','مشروبات','Beverages','🥤',6),
  ('11111111-0000-0000-0000-000000000007','confiserie','Confiserie','حلويات','Confectionery','🍫',7),
  ('11111111-0000-0000-0000-000000000008','surgeles','Surgelés','مجمدات','Frozen','❄️',8),
  ('11111111-0000-0000-0000-000000000009','hygiene','Hygiène','نظافة شخصية','Hygiene','🧴',9),
  ('11111111-0000-0000-0000-000000000010','maison','Maison & nettoyage','منزل ونظافة','Home & Cleaning','🧼',10),
  ('11111111-0000-0000-0000-000000000011','bebe','Bébé','منتجات الأطفال','Baby','👶',11),
  ('11111111-0000-0000-0000-000000000012','animalerie','Animalerie','منتجات الحيوانات','Pets','🐶',12)
on conflict (slug) do nothing;

-- 3. MARQUES --------------------------------------------------
insert into public.brands (id, slug, name) values
  ('22222222-0000-0000-0000-000000000001','soummam','Soummam'),
  ('22222222-0000-0000-0000-000000000002','danone','Danone'),
  ('22222222-0000-0000-0000-000000000003','candia','Candia'),
  ('22222222-0000-0000-0000-000000000004','ifri','Ifri'),
  ('22222222-0000-0000-0000-000000000005','cevital','Cevital'),
  ('22222222-0000-0000-0000-000000000006','ramy','Ramy'),
  ('22222222-0000-0000-0000-000000000007','local','Producteur local'),
  ('22222222-0000-0000-0000-000000000008','coca-cola','Coca-Cola'),
  ('22222222-0000-0000-0000-000000000009','nestle','Nestlé'),
  ('22222222-0000-0000-0000-000000000010','maggi','Maggi')
on conflict (slug) do nothing;

-- 4. PRODUITS -------------------------------------------------
-- Format : sku, barcode, cat, brand, name, unit, weight, price
insert into public.products (sku, barcode, category_id, brand_id, name_fr, name_ar, description_fr, unit, unit_size, weight_grams, base_price, is_featured)
values
  -- Fruits & légumes
  ('AZ-FL-001','6130001000101','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Pommes rouges','تفاح أحمر','Pommes rouges locales de saison, croquantes et juteuses.','kg',1,1000,320,true),
  ('AZ-FL-002','6130001000102','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Bananes','موز','Bananes importées mûres à point.','kg',1,1000,380,false),
  ('AZ-FL-003','6130001000103','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Tomates fraîches','طماطم','Tomates locales cultivées en pleine terre.','kg',1,1000,180,true),
  ('AZ-FL-004','6130001000104','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Pommes de terre','بطاطا','Pommes de terre de calibre moyen.','kg',1,1000,90,false),
  ('AZ-FL-005','6130001000105','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Oignons','بصل','Oignons secs jaunes.','kg',1,1000,110,false),
  ('AZ-FL-006','6130001000106','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Carottes','جزر','Carottes fraîches.','kg',1,1000,140,false),
  ('AZ-FL-007','6130001000107','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Oranges','برتقال','Oranges de Blida, riches en vitamine C.','kg',1,1000,220,true),
  ('AZ-FL-008','6130001000108','11111111-0000-0000-0000-000000000001','22222222-0000-0000-0000-000000000007','Salade verte','خس','Salade fraîche, lavée.','pièce',1,300,80,false),

  -- Viandes
  ('AZ-VI-001','6130002000101','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000007','Escalope de poulet','صدر دجاج','Escalope de poulet fermier, sans os.','kg',1,1000,1450,true),
  ('AZ-VI-002','6130002000102','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000007','Viande hachée bœuf','لحم مفروم','Viande de bœuf hachée, 15% MG.','kg',1,1000,2200,false),
  ('AZ-VI-003','6130002000103','11111111-0000-0000-0000-000000000002','22222222-0000-0000-0000-000000000007','Merguez maison','مرقاز','Merguez épicée préparée sur place.','kg',1,1000,1350,false),

  -- Poissons
  ('AZ-PO-001','6130003000101','11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000007','Sardines fraîches','سردين','Sardines fraîches du port d''Alger.','kg',1,1000,650,true),
  ('AZ-PO-002','6130003000102','11111111-0000-0000-0000-000000000003','22222222-0000-0000-0000-000000000007','Dorade royale','دوراد','Dorade royale entière.','kg',1,1000,2400,false),

  -- Laitiers
  ('AZ-LA-001','6130004000101','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000003','Lait Candia UHT 1L','حليب كانديا 1 لتر','Lait demi-écrémé UHT, brique 1L.','L',1,1000,150,true),
  ('AZ-LA-002','6130004000102','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','Yaourt nature Soummam x4','ياغورت طبيعي','Yaourt nature Soummam, pack de 4 pots de 125g.','pack',4,500,180,false),
  ('AZ-LA-003','6130004000103','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000002','Danette chocolat x4','دانيت شوكولا','Crème dessert Danone au chocolat, pack de 4.','pack',4,500,320,true),
  ('AZ-LA-004','6130004000104','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000001','Fromage La Vache qui rit 16p','لا فاش كي ري','Fromage fondu portions x16.','pack',16,340,410,false),
  ('AZ-LA-005','6130004000105','11111111-0000-0000-0000-000000000004','22222222-0000-0000-0000-000000000006','Beurre Ramy 250g','زبدة رامي','Beurre doux, tablette de 250g.','pièce',1,250,290,false),

  -- Épicerie
  ('AZ-EP-001','6130005000101','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000005','Huile de tournesol 5L','زيت عباد الشمس','Huile Cevital 5L.','L',5,5000,1450,true),
  ('AZ-EP-002','6130005000102','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Semoule de blé fine 5kg','سميد رقيق','Semoule fine locale, sac 5kg.','kg',5,5000,780,false),
  ('AZ-EP-003','6130005000103','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Riz long grain 1kg','أرز','Riz long grain sachet 1kg.','kg',1,1000,290,false),
  ('AZ-EP-004','6130005000104','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Sucre blanc 1kg','سكر أبيض','Sucre cristallisé 1kg.','kg',1,1000,140,false),
  ('AZ-EP-005','6130005000105','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000010','Tomate concentrée 400g','رب طماطم','Concentré de tomate double 400g.','pièce',1,400,190,false),
  ('AZ-EP-006','6130005000106','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000010','Bouillon cube Maggi x24','مكعبات ماجي','Cubes de bouillon poule, boîte de 24.','pack',24,240,220,false),
  ('AZ-EP-007','6130005000107','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Café moulu 250g','قهوة مطحونة','Café moulu arabica 250g.','pièce',1,250,540,true),
  ('AZ-EP-008','6130005000108','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Thé vert 100g','شاي أخضر','Thé vert en vrac 100g.','pièce',1,100,380,false),
  ('AZ-EP-009','6130005000109','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Pain de mie complet','خبز الكامل','Pain de mie complet, sachet 500g.','pièce',1,500,220,false),
  ('AZ-EP-010','6130005000110','11111111-0000-0000-0000-000000000005','22222222-0000-0000-0000-000000000007','Œufs frais x12','بيض طازج','Œufs frais boîte de 12.','pack',12,720,380,true),

  -- Boissons
  ('AZ-BO-001','6130006000101','11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000004','Eau minérale Ifri 1.5L','ماء إيفري','Eau minérale plate 1.5L.','L',1.5,1500,45,false),
  ('AZ-BO-002','6130006000102','11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000008','Coca-Cola 2L','كوكا كولا','Coca-Cola 2L.','L',2,2000,220,true),
  ('AZ-BO-003','6130006000103','11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000006','Jus d''orange Ramy 1L','عصير برتقال','Jus d''orange 100% pur jus Ramy 1L.','L',1,1000,180,false),
  ('AZ-BO-004','6130006000104','11111111-0000-0000-0000-000000000006','22222222-0000-0000-0000-000000000004','Boisson gazeuse Ifri Cola 1L','إيفري كولا','Boisson gazeuse cola Ifri 1L.','L',1,1000,110,false),

  -- Confiserie
  ('AZ-CO-001','6130007000101','11111111-0000-0000-0000-000000000007','22222222-0000-0000-0000-000000000009','Chocolat Kit Kat 4 barres','كيت كات','Chocolat Kit Kat pack de 4.','pack',4,166,280,true),
  ('AZ-CO-002','6130007000102','11111111-0000-0000-0000-000000000007','22222222-0000-0000-0000-000000000009','Nutella 400g','نوتيلا','Pâte à tartiner Nutella 400g.','pièce',1,400,760,true),

  -- Surgelés
  ('AZ-SU-001','6130008000101','11111111-0000-0000-0000-000000000008','22222222-0000-0000-0000-000000000007','Frites surgelées 1kg','بطاطا مجمدة','Frites surgelées sac 1kg.','kg',1,1000,340,false),
  ('AZ-SU-002','6130008000102','11111111-0000-0000-0000-000000000008','22222222-0000-0000-0000-000000000007','Petits pois surgelés 500g','بازلاء مجمدة','Petits pois surgelés 500g.','pièce',1,500,280,false),

  -- Hygiène
  ('AZ-HY-001','6130009000101','11111111-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000007','Dentifrice fluor 75ml','معجون أسنان','Dentifrice au fluor tube 75ml.','pièce',1,75,220,false),
  ('AZ-HY-002','6130009000102','11111111-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000007','Savon liquide mains 250ml','صابون سائل','Savon liquide mains 250ml.','pièce',1,250,180,false),
  ('AZ-HY-003','6130009000103','11111111-0000-0000-0000-000000000009','22222222-0000-0000-0000-000000000007','Shampoing 400ml','شامبو','Shampoing usage fréquent 400ml.','pièce',1,400,420,false),

  -- Maison
  ('AZ-MA-001','6130010000101','11111111-0000-0000-0000-000000000010','22222222-0000-0000-0000-000000000007','Liquide vaisselle 1L','سائل غسل الأواني','Liquide vaisselle citron 1L.','L',1,1000,260,false),
  ('AZ-MA-002','6130010000102','11111111-0000-0000-0000-000000000010','22222222-0000-0000-0000-000000000007','Papier toilette x12','ورق التواليت','Papier toilette 2 plis, pack de 12.','pack',12,1200,540,true),
  ('AZ-MA-003','6130010000103','11111111-0000-0000-0000-000000000010','22222222-0000-0000-0000-000000000007','Lessive poudre 5kg','مسحوق غسيل','Lessive machine 5kg.','kg',5,5000,1450,false),

  -- Bébé
  ('AZ-BB-001','6130011000101','11111111-0000-0000-0000-000000000011','22222222-0000-0000-0000-000000000007','Couches taille 3 x40','حفاضات مقاس 3','Couches taille 3 (4-9kg), paquet de 40.','pack',40,3000,890,false),
  ('AZ-BB-002','6130011000102','11111111-0000-0000-0000-000000000011','22222222-0000-0000-0000-000000000009','Lait infantile 2ème âge 900g','حليب رضع','Lait infantile 2ème âge 900g.','pièce',1,900,1450,false)
on conflict (sku) do nothing;

-- 5. store_products (prix + dispo) + promos ------------------
insert into public.store_products (store_id, product_id, price, promo_price, is_available)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  p.base_price,
  case
    when p.sku in ('AZ-FL-001','AZ-LA-001','AZ-LA-003','AZ-EP-001','AZ-BO-002','AZ-CO-002','AZ-MA-002','AZ-EP-010','AZ-EP-007','AZ-VI-001')
      then round(p.base_price * 0.85)  -- -15% pour ces produits
    else null
  end,
  true
from public.products p
on conflict do nothing;

-- 6. Inventory de départ (stock généreux) --------------------
insert into public.inventory (store_id, product_id, on_hand, reserved, low_stock)
select
  '00000000-0000-0000-0000-000000000001'::uuid,
  p.id,
  100,
  0,
  10
from public.products p
on conflict do nothing;

-- 7. Bannières & Promotions ----------------------------------
insert into public.banners (title, image_url, link_url, position) values
  ('Ramadan approche — jusqu''à -20%', '/banners/ramadan.svg', '/client/promotions', 1),
  ('Frais et local, livré en 2h', '/banners/fresh.svg', '/client/categories/fruits-legumes', 2),
  ('Nouveauté : Assistant Courses IA', '/banners/ai.svg', '/client/ai-shopping', 3)
on conflict do nothing;

insert into public.promotions (code, name, description, type, value, min_order, starts_at, is_active)
values
  ('SEMAINE15', 'Semaine gourmande -15%', '15% sur une sélection de produits phares', 'percentage', 15, 1000, now(), true),
  ('BIENVENUE', 'Bienvenue chez AZ Monoprix', '500 DA offerts dès 3000 DA d''achat', 'fixed_amount', 500, 3000, now(), true)
on conflict (code) do nothing;
