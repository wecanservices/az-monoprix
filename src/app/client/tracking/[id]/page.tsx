import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { OrderTracking } from "@/components/client/order-tracking";
import { ReplacementProposals } from "@/components/client/replacement-proposals";
import type { OrderStatus } from "@/constants/order-status";

export const dynamic = "force-dynamic";

export default async function TrackingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireCustomer();
  const sb = await createClient();

  const { data: order } = await sb
    .from("orders")
    .select(
      `
      id, order_number, status, scheduled_end,
      delivery:deliveries(driver_id, otp_code,
        driver:profiles!deliveries_driver_id_fkey(full_name)
      ),
      replacements:order_replacements(
        id, replacement_product_id, quantity, customer_response,
        original_item_id,
        original_item:order_items!order_replacements_original_item_id_fkey(product_snapshot),
        replacement:products!order_replacements_replacement_product_id_fkey(
          id, name_fr, base_price,
          images:product_images(url, position)
        )
      )
    `,
    )
    .eq("id", id)
    .eq("customer_id", session.id)
    .maybeSingle();

  if (!order) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delivery: any = Array.isArray(order.delivery) ? order.delivery[0] : order.delivery;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const driver: any = delivery && (Array.isArray(delivery.driver) ? delivery.driver[0] : delivery.driver);
  const pendingReplacements = (order.replacements ?? []).filter(
    (r) => r.customer_response == null,
  );

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href={`/client/orders/${order.id}`}
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Suivi</div>
          <h1 className="text-lg font-semibold">{order.order_number}</h1>
        </div>
      </div>

      {pendingReplacements.length > 0 && (
        <div className="mb-4">
          <ReplacementProposals
            orderId={order.id}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            proposals={pendingReplacements as any[]}
          />
        </div>
      )}

      <OrderTracking
        orderId={order.id}
        initialStatus={order.status as OrderStatus}
        otpCode={delivery?.otp_code ?? null}
        driverName={driver?.full_name ?? null}
        scheduledEnd={order.scheduled_end ?? null}
      />
    </main>
  );
}
