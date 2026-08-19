/**
 * Import catalogue esmmar — 2 975 produits scrapés depuis la marketplace
 * esmmar-app.com (août 2026).
 *
 * Pour chaque produit :
 *   1. Upload de l'image locale (`images/<id>.<ext>`) dans le bucket
 *      Storage `product-images` sous `esmmar/<id>.<ext>`.
 *   2. Résolution / création de la catégorie principale.
 *   3. Insert dans `products` (sku=`ESMMAR-<id>`, name_fr, base_price=prix
 *      unitaire, slug, description, unit, is_featured=is_most_demanded).
 *   4. Insert dans `product_images` (URL publique du bucket).
 *   5. Insert dans `store_products` (price=unit_price, promo_price=unit_price
 *      quand `old_price` > unit_price).
 *   6. Insert dans `inventory` (on_hand=100 si in_stock, sinon 0).
 *
 * Le script est *destructif* : on n'a plus rien en base après la migration
 * `20260819000001_wipe_products_drop_barcode`, donc on part de zéro et
 * on fait des INSERT simples (pas d'upsert).
 *
 * Env :
 *   NEXT_PUBLIC_SUPABASE_URL       Supabase URL
 *   SUPABASE_SERVICE_ROLE_KEY      clé service (bypass RLS)
 *   STORE_CODE=MONOPRIX-LKH        magasin cible
 *   ESMMAR_EXPORT_DIR=~/Downloads/esmmar_export   dossier de l'export
 *
 * Usage : `pnpm import:esmmar`
 */

import { readFile } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import os from "node:os";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env.local") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORE_CODE = process.env.STORE_CODE ?? "MONOPRIX-LKH";
const EXPORT_DIR =
  process.env.ESMMAR_EXPORT_DIR ??
  path.join(os.homedir(), "Downloads", "esmmar_export");
const BUCKET = "product-images";
const BATCH_SIZE = Number(process.env.IMPORT_BATCH_SIZE ?? 100);
const DEFAULT_STOCK = Number(process.env.DEFAULT_STOCK ?? 100);

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.local");
  process.exit(1);
}

/** Shape brut du JSON esmmar. */
interface EsmmarProduct {
  id: number;
  name: string;
  tag: string | null;
  unit: string | null;
  price: string;              // prix carton (numeric texte)
  unit_price: string;         // prix unitaire (numeric texte)
  packaging: number;
  old_price: string | null;
  availability: "in_stock" | "out_of_stock";
  max_in_cart: number;
  description: string | null;
  image: string | null;
  gallery: string[];
  is_new: boolean;
  is_most_demanded: boolean;
  _category_id: number;
  _category_name: string;
  categories: string[];
}

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/* ─────────────────────── helpers ─────────────────────── */

function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function num(v: string | null | undefined): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Cherche `images/<id>.{jpg,jpeg,png,webp}` et renvoie {path, mime} ou null. */
function findLocalImage(id: number): { path: string; mime: string; ext: string } | null {
  const exts: Array<[string, string]> = [
    ["jpg", "image/jpeg"],
    ["jpeg", "image/jpeg"],
    ["png", "image/png"],
    ["webp", "image/webp"],
  ];
  for (const [ext, mime] of exts) {
    const p = path.join(EXPORT_DIR, "images", `${id}.${ext}`);
    if (existsSync(p)) return { path: p, mime, ext };
  }
  return null;
}

/* ─────────────────────── main ─────────────────────── */

async function main() {
  console.log(`📁  Dossier export : ${EXPORT_DIR}`);
  if (!existsSync(EXPORT_DIR)) {
    console.error(`❌  Dossier introuvable — passe ESMMAR_EXPORT_DIR=/chemin`);
    process.exit(1);
  }

  const jsonPath = path.join(EXPORT_DIR, "esmmar_produits.json");
  const rows: EsmmarProduct[] = JSON.parse(await readFile(jsonPath, "utf-8"));
  console.log(`📦  ${rows.length} produits à importer`);

  // 1. Store cible
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

  // 2. Résolution / création des catégories esmmar.
  //    On construit un index { name → uuid } en insérant à la volée.
  const uniqueCats = Array.from(
    new Set(rows.map((r) => r._category_name).filter(Boolean)),
  );
  const categoryId = new Map<string, string>();

  for (const name of uniqueCats) {
    const slug = `esmmar-${slugify(name)}`;
    const { data: existing } = await admin
      .from("categories")
      .select("id")
      .eq("slug", slug)
      .maybeSingle();
    if (existing) {
      categoryId.set(name, existing.id);
      continue;
    }
    const { data: created, error } = await admin
      .from("categories")
      .insert({ slug, name_fr: name, is_active: true, position: 100 })
      .select("id")
      .single();
    if (error) {
      console.warn(`⚠️  catégorie "${name}" : ${error.message}`);
      continue;
    }
    categoryId.set(name, created.id);
  }
  console.log(`🗂️   ${categoryId.size} catégories prêtes`);

  // 3. Boucle produits.
  let inserted = 0;
  let uploaded = 0;
  let skipped = 0;
  let errors = 0;
  const t0 = Date.now();

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const chunk = rows.slice(i, i + BATCH_SIZE);

    // 3a. Upload des images en parallèle (un lot à la fois).
    const imageUrls = new Map<number, string>();
    await Promise.all(
      chunk.map(async (r) => {
        const local = findLocalImage(r.id);
        if (!local) return;
        const buf = readFileSync(local.path);
        const objectPath = `esmmar/${r.id}.${local.ext}`;
        const { error } = await admin.storage
          .from(BUCKET)
          .upload(objectPath, buf, {
            contentType: local.mime,
            upsert: true,
          });
        if (error) {
          console.warn(`⚠️  upload ${objectPath} : ${error.message}`);
          return;
        }
        const { data: pub } = admin.storage.from(BUCKET).getPublicUrl(objectPath);
        imageUrls.set(r.id, pub.publicUrl);
        uploaded++;
      }),
    );

    // 3b. INSERT products
    const productsPayload = chunk
      .map((r) => {
        const price = num(r.unit_price) ?? num(r.price);
        if (price == null) {
          skipped++;
          return null;
        }
        const slug = `${slugify(r.name)}-${r.id}`;
        return {
          sku: `ESMMAR-${r.id}`,
          slug,
          name_fr: r.name,
          description_fr: r.description ?? null,
          category_id: categoryId.get(r._category_name) ?? null,
          base_price: price,
          unit: r.unit ?? null,
          is_active: true,
          is_featured: !!r.is_most_demanded,
        };
      })
      .filter(Boolean) as Array<{
        sku: string;
        slug: string;
        name_fr: string;
        description_fr: string | null;
        category_id: string | null;
        base_price: number;
        unit: string | null;
        is_active: boolean;
        is_featured: boolean;
      }>;

    if (productsPayload.length === 0) continue;

    const { data: inserts, error } = await admin
      .from("products")
      .insert(productsPayload)
      .select("id, sku");

    if (error) {
      console.error(`⚠️  INSERT products lot ${i} : ${error.message}`);
      errors += productsPayload.length;
      continue;
    }

    // Index sku → uuid pour rattacher store_products / inventory / image
    const idBySku = new Map(inserts!.map((p) => [p.sku, p.id]));

    // 3c. product_images
    const imagesPayload: Array<{ product_id: string; url: string; position: number }> = [];
    for (const r of chunk) {
      const pid = idBySku.get(`ESMMAR-${r.id}`);
      const url = imageUrls.get(r.id);
      if (pid && url) imagesPayload.push({ product_id: pid, url, position: 0 });
    }
    if (imagesPayload.length) {
      const { error: imgErr } = await admin
        .from("product_images")
        .insert(imagesPayload);
      if (imgErr) console.warn(`⚠️  product_images lot ${i} : ${imgErr.message}`);
    }

    // 3d. store_products (price + promo si old_price > unit_price)
    const spPayload = chunk
      .map((r) => {
        const pid = idBySku.get(`ESMMAR-${r.id}`);
        if (!pid) return null;
        const price = num(r.unit_price) ?? num(r.price) ?? 0;
        const old = num(r.old_price);
        return {
          store_id: store.id,
          product_id: pid,
          price,
          promo_price: old != null && old > price ? price : null,
          is_available: r.availability === "in_stock",
        };
      })
      .filter(Boolean) as Array<{
        store_id: string; product_id: string; price: number;
        promo_price: number | null; is_available: boolean;
      }>;

    const { error: spErr } = await admin.from("store_products").insert(spPayload);
    if (spErr) console.warn(`⚠️  store_products lot ${i} : ${spErr.message}`);

    // 3e. inventory
    const invPayload = chunk
      .map((r) => {
        const pid = idBySku.get(`ESMMAR-${r.id}`);
        if (!pid) return null;
        return {
          store_id: store.id,
          product_id: pid,
          on_hand: r.availability === "in_stock" ? DEFAULT_STOCK : 0,
          reserved: 0,
        };
      })
      .filter(Boolean) as Array<{
        store_id: string; product_id: string; on_hand: number; reserved: number;
      }>;

    const { error: invErr } = await admin.from("inventory").insert(invPayload);
    if (invErr) console.warn(`⚠️  inventory lot ${i} : ${invErr.message}`);

    inserted += productsPayload.length;
    process.stdout.write(
      `\r  → ${inserted}/${rows.length} (${Math.round((inserted / rows.length) * 100)}%) · ${uploaded} images`,
    );
  }

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅  Import terminé en ${dt}s — ${inserted} produits, ${uploaded} images, ${skipped} sans prix, ${errors} erreurs`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
