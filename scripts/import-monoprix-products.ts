/**
 * Import Monoprix Lakhdaria — catalogue produits.
 *
 * Lit `scripts/data/monoprix-products.json` (généré depuis l'export
 * Excel du 16/08/2026) et insère :
 *   - `products`         (sku · barcode · name_fr · base_price · slug)
 *   - `store_products`   (prix + promo pour MONOPRIX-LKH)
 *   - `inventory`        (on_hand pour MONOPRIX-LKH)
 *
 * Idempotent : ré-exécution → upsert par barcode / (store_id,product_id).
 *
 * Usage :
 *   pnpm import:monoprix
 *
 * Requiert  NEXT_PUBLIC_SUPABASE_URL  +  SUPABASE_SERVICE_ROLE_KEY
 * dans `.env.local`.
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

// Charge .env.local — le script tourne hors Next
loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORE_CODE = process.env.STORE_CODE ?? "MONOPRIX-LKH";
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE ?? 500);

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
  process.exit(1);
}

type Row = {
  sku: string;
  barcode: string;
  name_fr: string;
  slug: string;
  base_price: number;
  price: number;
  promo_price: number | null;
  on_hand: number;
  family: string | null;
  brand: string | null;
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  // 1. Charger le JSON
  const jsonPath = path.resolve(process.cwd(), "scripts/data/monoprix-products.json");
  const rows: Row[] = JSON.parse(await readFile(jsonPath, "utf-8"));
  console.log(`📦  ${rows.length} produits à importer depuis ${path.basename(jsonPath)}`);

  // 2. Récupérer le store
  const { data: store, error: storeErr } = await admin
    .from("stores")
    .select("id, code, name")
    .eq("code", STORE_CODE)
    .single();
  if (storeErr || !store) {
    console.error(`❌  Store "${STORE_CODE}" introuvable — lance d'abord les migrations`);
    process.exit(1);
  }
  console.log(`🏬  Store cible : ${store.name} (${store.id})`);

  // 3. Upsert products par lots
  let inserted = 0;
  let errors = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);
    const productsPayload = chunk.map((r) => ({
      sku: r.sku,
      barcode: r.barcode,
      name_fr: r.name_fr,
      slug: r.slug,
      base_price: r.base_price,
      is_active: true,
    }));

    const { data: upserted, error } = await admin
      .from("products")
      .upsert(productsPayload, { onConflict: "barcode" })
      .select("id, barcode");

    if (error) {
      console.error(`⚠️  Lot ${i}-${i + chunk.length} : ${error.message}`);
      errors += chunk.length;
      continue;
    }
    if (!upserted) continue;

    // Index barcode → product_id
    const idByBarcode = new Map(upserted.map((p) => [p.barcode!, p.id]));

    // store_products
    const spPayload = chunk
      .map((r) => {
        const pid = idByBarcode.get(r.barcode);
        if (!pid) return null;
        return {
          store_id: store.id,
          product_id: pid,
          price: r.price,
          promo_price: r.promo_price,
          is_available: true,
        };
      })
      .filter(Boolean) as Array<{
        store_id: string; product_id: string; price: number;
        promo_price: number | null; is_available: boolean;
      }>;

    const { error: spErr } = await admin
      .from("store_products")
      .upsert(spPayload, { onConflict: "store_id,product_id" });
    if (spErr) console.error(`⚠️  store_products lot ${i} : ${spErr.message}`);

    // inventory
    const invPayload = chunk
      .map((r) => {
        const pid = idByBarcode.get(r.barcode);
        if (!pid) return null;
        return { store_id: store.id, product_id: pid, on_hand: r.on_hand };
      })
      .filter(Boolean) as Array<{ store_id: string; product_id: string; on_hand: number }>;

    const { error: invErr } = await admin
      .from("inventory")
      .upsert(invPayload, { onConflict: "store_id,product_id" });
    if (invErr) console.error(`⚠️  inventory lot ${i} : ${invErr.message}`);

    inserted += chunk.length;
    process.stdout.write(`\r  → ${inserted}/${rows.length} (${Math.round((inserted / rows.length) * 100)}%)`);
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`\n✅  Import terminé : ${inserted} produits en ${dt}s (${errors} erreurs)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
