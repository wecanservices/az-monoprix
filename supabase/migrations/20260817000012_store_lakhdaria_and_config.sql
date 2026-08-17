-- ============================================================
-- AZ MONOPRIX — Store officiel Lakhdaria (Bouira) + config
-- ============================================================

-- Le magasin réel est à Lakhdaria, wilaya de Bouira (10).
update public.stores
   set name        = 'AZ Monoprix — Lakhdaria',
       wilaya_code = '10',
       address     = 'Centre-ville, Lakhdaria, Bouira',
       phone       = '+213 26 00 00 00'
 where code = 'MONOPRIX-BE';

-- On garde le code court mais on l'aligne avec le nouveau lieu
update public.stores
   set code = 'MONOPRIX-LKH'
 where code = 'MONOPRIX-BE';

-- Feature flag paiement en ligne — activé (support multi-PSP)
insert into public.feature_flags (key, enabled, description)
values ('online_payment', true, 'Paiement en ligne (SATIM · CIB · Edahabia)')
on conflict (key) do update set enabled = true, description = excluded.description;

-- Feature flag AI Gemini
insert into public.feature_flags (key, enabled, description)
values ('ai_provider_gemini', true, 'Provider IA principal : Google Gemini')
on conflict (key) do update set enabled = true, description = excluded.description;

-- Réglages fidélité : 1 DA dépensé = 1 point, 1 point = 1 DA
insert into public.loyalty_config (id, points_per_dzd, dzd_per_point, min_redeem_points)
values (true, 1.0, 1.0, 100)
on conflict (id) do update
  set points_per_dzd = excluded.points_per_dzd,
      dzd_per_point  = excluded.dzd_per_point,
      min_redeem_points = excluded.min_redeem_points;
