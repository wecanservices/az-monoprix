"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Upload } from "lucide-react";
import { DataCard } from "@/components/admin/data-card";
import { env } from "@/config/env";

interface Image { id: string; url: string; position: number }

/**
 * Two-step signed upload to Supabase Storage:
 *   1. POST /api/v1/admin/upload { action: "sign", productId, ext } → signed URL
 *   2. PUT that URL with the file bytes
 *   3. POST /api/v1/admin/upload { action: "attach", productId, url } → creates product_image
 * No file bytes ever transit through our Next server.
 */
export function ImagesPanel({ productId, initial }: { productId: string; initial: Image[] }) {
  const router = useRouter();
  const [images, setImages] = useState<Image[]>(initial);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError(null);
    const ext = file.name.split(".").pop() ?? "jpg";
    // 1. Sign
    const signRes = await fetch("/api/v1/admin/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign", productId, ext }),
    });
    if (!signRes.ok) throw new Error("Signature échouée");
    const { data: sig } = await signRes.json();

    // 2. Upload directly to Supabase Storage
    const uploadUrl = `${env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/product-images/${sig.path}?token=${sig.token}`;
    const put = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": file.type },
      body: file,
    });
    if (!put.ok) throw new Error("Upload échoué");

    // 3. Attach to product
    const attachRes = await fetch("/api/v1/admin/upload", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "attach", productId, url: sig.publicUrl, position: images.length }),
    });
    if (!attachRes.ok) throw new Error("Attachement échoué");
    const j = await attachRes.json();
    setImages((im) => [...im, { id: j.data.id, url: sig.publicUrl, position: im.length }]);
    router.refresh();
  }

  function onFilePicked(files: FileList | null) {
    if (!files || !files.length) return;
    startTransition(async () => {
      try {
        for (const f of Array.from(files)) await upload(f);
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function remove(id: string) {
    if (!confirm("Retirer cette image ?")) return;
    startTransition(async () => {
      // Use a lightweight delete via the general product API? Simplest:
      // let the admin do it via SQL for now — kept as UI-only remove.
      setImages((im) => im.filter((i) => i.id !== id));
      // Attach to a proper DELETE endpoint in P5.6+ if needed.
    });
  }

  return (
    <DataCard>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">Images ({images.length})</h2>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary)] text-white text-xs font-semibold"
        >
          <Upload className="w-3.5 h-3.5" /> Ajouter
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(e) => onFilePicked(e.target.files)}
        />
      </div>
      {error && <div className="mb-3 text-xs text-[var(--color-az-danger)]">{error}</div>}
      {images.length === 0 ? (
        <p className="text-xs text-[var(--color-foreground-muted)]">
          Aucune image. Ajoutez au moins une photo carrée (idéalement 800×800px).
        </p>
      ) : (
        <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((im) => (
            <div key={im.id} className="relative group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={im.url} alt="" className="w-full aspect-square object-cover rounded-lg border border-[var(--color-border)]" />
              <button
                type="button"
                onClick={() => remove(im.id)}
                className="absolute top-1 right-1 w-7 h-7 grid place-items-center rounded-full bg-white/95 opacity-0 group-hover:opacity-100 transition text-[var(--color-az-danger)]"
                aria-label="Retirer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </DataCard>
  );
}
