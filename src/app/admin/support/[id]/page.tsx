import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTicket } from "@/services/support";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { TicketConversation } from "./conversation";

export const dynamic = "force-dynamic";

export default async function AdminTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const t = await getTicket(createAdminClient(), id);
  if (!t) notFound();
  const cust = Array.isArray(t.customer) ? t.customer[0] : t.customer;
  const p = cust?.profile ? (Array.isArray(cust.profile) ? cust.profile[0] : cust.profile) : null;

  return (
    <div className="max-w-3xl space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/admin/support" className="p-2 -ml-2 rounded-lg hover:bg-[var(--color-surface-muted)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <PageHeader
          title={t.subject}
          description={`${t.category} · Statut : ${t.status}`}
        />
      </div>

      <DataCard>
        <div className="text-xs uppercase tracking-wider text-[var(--color-foreground-muted)]">
          Client
        </div>
        <div className="text-sm mt-1">
          {p?.full_name ?? "—"} · {p?.email} · {p?.phone ?? "—"}
        </div>
        {t.description && (
          <p className="text-sm text-[var(--color-foreground-muted)] mt-3">{t.description}</p>
        )}
      </DataCard>

      <TicketConversation
        ticketId={t.id}
        status={t.status}
        messages={(t.messages ?? []).map((m: {
          id: string; body: string; created_at: string;
          sender?: { full_name: string | null; role: string } | { full_name: string | null; role: string }[]
        }) => ({
          id: m.id,
          body: m.body,
          created_at: m.created_at,
          sender_name: Array.isArray(m.sender) ? m.sender[0]?.full_name : m.sender?.full_name,
          sender_role: Array.isArray(m.sender) ? m.sender[0]?.role : m.sender?.role,
        }))}
      />
    </div>
  );
}
