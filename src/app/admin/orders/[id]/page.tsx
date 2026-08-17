import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { loadOrderForPrep } from "@/services/preparation";
import { rankDriversForOrder } from "@/services/dispatch";
import { PreparationPanel } from "./preparation-panel";
import { DispatchPanel } from "./dispatch-panel";
import { formatDZD } from "@/utils/money";

export const dynamic = "force-dynamic";

export default async function AdminOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sb = await createClient();
  const order = await loadOrderForPrep(sb, id);
  if (!order) notFound();

  const status = order.status as string;
  const showDispatch = ["ready", "partially_available"].includes(status);
  const candidates = showDispatch ? await rankDriversForOrder(sb, order.id) : [];

  return (
    <div className="max-w-4xl space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin/orders"
          className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="text-xs uppercase text-[var(--color-foreground-muted)]">Commande</div>
          <h1 className="text-xl font-semibold">{order.order_number}</h1>
        </div>
        <span className="ml-auto text-lg font-semibold">{formatDZD(Number(order.total))}</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="px-2 py-0.5 rounded-full bg-[var(--color-surface-muted)] font-medium">
          Statut : <strong>{status}</strong>
        </span>
      </div>

      <PreparationPanel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        order={order as any}
      />

      {showDispatch && (
        <DispatchPanel orderId={order.id} candidates={candidates} />
      )}
    </div>
  );
}
