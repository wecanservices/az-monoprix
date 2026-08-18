/**
 * Enrichit `product_images` en scrapant Open Food Facts par batch.
 *
 * Pour chaque barcode du catalogue Monoprix, on GET
 *   https://world.openfoodfacts.org/api/v2/product/{barcode}.json
 * et si `status == 1` + `image_front_url` présent → insert dans
 * `product_images` (position 0).
 *
 * Idempotent : ne recrée pas d'image si le produit en a déjà une à
 * la position 0 (skip amont sur SELECT distinct product_id).
 *
 * Usage :
 *   pnpm tsx scripts/enrich-photos.ts
 *
 * Requiert `.env.cloud` (NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY).
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";

loadEnv({ path: path.resolve(process.cwd(), ".env.cloud") });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("❌  NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY manquants dans .env.cloud");
  process.exit(1);
}

const USER_AGENT = "AZ-Monoprix-Catalog/1.0 (wecanservices.suivi@gmail.com)";
const CONCURRENCY = 5;
const INSERT_BATCH = 100;
const LOG_EVERY = 100;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_RETRIES = 3;

type Row = {
  sku: string;
  barcode: string;
  name_fr: string;
};

type OffResponse = {
  status: 0 | 1;
  product?: {
    image_front_url?: string;
    image_url?: string;
  };
};

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// -----------------------------------------------------------
// Helpers
// -----------------------------------------------------------

function sleep(ms: number) {
  return new Promise<void>((res) => setTimeout(res, ms));
}

async function fetchWithTimeout(url: string): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

async function fetchOffImage(barcode: string): Promise<string | null> {
  const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(
    barcode,
  )}.json?fields=image_front_url,image_url`;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const res = await fetchWithTimeout(url);
      if (res.status === 429) {
        const wait = 2000 * (attempt + 1);
        await sleep(wait);
        continue;
      }
      if (res.status === 404) return null;
      if (!res.ok) return null;
      const json = (await res.json()) as OffResponse;
      if (json.status !== 1 || !json.product) return null;
      const img = json.product.image_front_url ?? json.product.image_url ?? null;
      return img && img.length > 0 ? img : null;
    } catch {
      if (attempt < MAX_RETRIES - 1) await sleep(1000 * (attempt + 1));
    }
  }
  return null;
}

// Concurrency-limited map
async function pMap<T, R>(
  items: T[],
  worker: (item: T, index: number) => Promise<R>,
  concurrency: number,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const runners = Array.from({ length: concurrency }, async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      results[i] = await worker(items[i], i);
    }
  });
  await Promise.all(runners);
  return results;
}

// -----------------------------------------------------------
// Main
// -----------------------------------------------------------

async function main() {
  const jsonPath = path.resolve(process.cwd(), "scripts/data/monoprix-products.json");
  const rows: Row[] = JSON.parse(await readFile(jsonPath, "utf-8"));
  console.log(`📦  ${rows.length} produits à scanner (Open Food Facts)`);

  // Fetch product ids by barcode (in pages)
  console.log("🔍  Lecture des products depuis Supabase…");
  const barcodeToId = new Map<string, string>();
  const PAGE = 1000;
  let from = 0;
  while (true) {
    const { data, error } = await admin
      .from("products")
      .select("id, barcode")
      .not("barcode", "is", null)
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("❌  Lecture products :", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const p of data) {
      if (p.barcode) barcodeToId.set(p.barcode, p.id);
    }
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  → ${barcodeToId.size} products avec barcode en base`);

  // Fetch product ids that already have at least one image
  console.log("🖼   Détection des produits déjà photographiés…");
  const alreadyImaged = new Set<string>();
  from = 0;
  while (true) {
    const { data, error } = await admin
      .from("product_images")
      .select("product_id")
      .range(from, from + PAGE - 1);
    if (error) {
      console.error("❌  Lecture product_images :", error.message);
      process.exit(1);
    }
    if (!data || data.length === 0) break;
    for (const r of data) alreadyImaged.add(r.product_id);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  console.log(`  → ${alreadyImaged.size} products déjà avec une image (skip)`);

  // Build work list
  const work = rows.filter((r) => {
    const pid = barcodeToId.get(r.barcode);
    return pid && !alreadyImaged.has(pid);
  });
  console.log(`🎯  ${work.length} produits à interroger sur OFF`);

  let scanned = 0;
  let found = 0;
  let queuedInserts: { product_id: string; url: string; alt: string; position: number }[] = [];
  const t0 = Date.now();

  async function flushInserts(force = false) {
    if (!queuedInserts.length) return;
    if (!force && queuedInserts.length < INSERT_BATCH) return;
    const batch = queuedInserts.splice(0, queuedInserts.length);
    const { error } = await admin.from("product_images").insert(batch);
    if (error) {
      console.error(`\n⚠️  Insert product_images (${batch.length}) : ${error.message}`);
    }
  }

  await pMap(
    work,
    async (row) => {
      const img = await fetchOffImage(row.barcode);
      scanned++;
      if (img) {
        const pid = barcodeToId.get(row.barcode)!;
        queuedInserts.push({
          product_id: pid,
          url: img,
          alt: row.name_fr,
          position: 0,
        });
        found++;
        if (queuedInserts.length >= INSERT_BATCH) {
          await flushInserts(true);
        }
      }
      if (scanned % LOG_EVERY === 0) {
        const rate = (scanned / ((Date.now() - t0) / 1000)).toFixed(1);
        console.log(
          `  · ${scanned}/${work.length}  (${Math.round(
            (scanned / work.length) * 100,
          )}%)  trouvées=${found}  ~${rate} req/s`,
        );
      }
    },
    CONCURRENCY,
  );

  await flushInserts(true);

  const dt = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(
    `\n✅  Terminé en ${dt}s : ${found} photos trouvées / ${work.length} scannés (${
      work.length - found
    } sans photo)`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
