"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CartItem } from "@/services/types";
import { ProductImage } from "@/components/shared/product-image";
import { PriceTag } from "@/components/shared/price-tag";

export function CartItemRow({ item }: { item: CartItem }) {
  const router = useRouter();
  const [qty, setQty] = useState(item.quantity);
  const [, startTransition] = useTransition();

  async function patchQty(next: number) {
    setQty(next);
    startTransition(async () => {
      await fetch(`/api/v1/cart/items/${item.id}`, {
        method: next === 0 ? "DELETE" : "PATCH",
        headers: { "content-type": "application/json" },
        body: next === 0 ? undefined : JSON.stringify({ quantity: next }),
      });
      router.refresh();
    });
  }

  const unit = item.product?.promo_price ?? item.unit_price;
  const line = unit * qty;

  return (
    <div className="flex gap-3 py-3 border-b border-[var(--color-border)] last:border-0">
      <Link
        href={`/client/product/${item.product_id}`}
        className="shrink-0"
      >
        <ProductImage
          src={item.product?.images?.[0]}
          alt={item.product?.name_fr ?? ""}
          className="w-16 h-16 rounded-xl"
          sizes="64px"
        />
      </Link>
      <div className="flex-1 min-w-0">
        <Link
          href={`/client/product/${item.product_id}`}
          className="block text-sm font-medium line-clamp-2"
        >
          {item.product?.name_fr}
        </Link>
        <PriceTag
          price={item.unit_price}
          promoPrice={item.product?.promo_price ?? null}
          unit={item.product?.unit}
          size="sm"
          className="mt-1"
        />
        <div className="flex items-center justify-between mt-2">
          <div className="inline-flex items-center rounded-full border border-[var(--color-border)]">
            <button
              type="button"
              onClick={() => patchQty(Math.max(0, qty - 1))}
              className="w-7 h-7 grid place-items-center hover:bg-[var(--color-surface-muted)] rounded-full"
              aria-label="Retirer un"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="min-w-6 text-center text-sm font-semibold tabular-nums">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => patchQty(qty + 1)}
              className="w-7 h-7 grid place-items-center hover:bg-[var(--color-surface-muted)] rounded-full"
              aria-label="Ajouter un"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold">{Math.round(line).toLocaleString("fr-DZ")} DA</span>
            <button
              type="button"
              onClick={() => patchQty(0)}
              className="p-1.5 -mr-1 text-[var(--color-foreground-muted)] hover:text-[var(--color-az-danger)]"
              aria-label="Supprimer"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
