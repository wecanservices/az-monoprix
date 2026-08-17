import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getTicket } from "@/services/support";
import { ClientTicketReply } from "./reply";

export const dynamic = "force-dynamic";

export default async function ClientTicketPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireCustomer();
  const { id } = await params;
  const t = await getTicket(await createClient(), id);
  if (!t || t.customer_id !== session.id) notFound();

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      <div className="flex items-center gap-2">
        <Link href="/client/chat" className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold">{t.subject}</h1>
          <div className="text-xs text-[var(--color-foreground-muted)] capitalize">
            {t.category} · {t.status}
          </div>
        </div>
      </div>

      <div className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-3">
        {t.description && <p className="text-sm text-[var(--color-foreground-muted)]">{t.description}</p>}
        {(t.messages ?? []).map((m: {
          id: string; body: string; created_at: string;
          sender?: { full_name: string | null; role: string } | { full_name: string | null; role: string }[]
        }) => {
          const sender = Array.isArray(m.sender) ? m.sender[0] : m.sender;
          const isAgent = sender?.role && ["admin", "super_admin", "store_manager"].includes(sender.role);
          return (
            <div
              key={m.id}
              className={
                "max-w-[85%] rounded-2xl px-3 py-2 text-sm " +
                (isAgent ? "bg-[var(--color-surface-muted)]" : "ml-auto bg-[var(--color-primary)]/10")
              }
            >
              <div className="text-[10px] text-[var(--color-foreground-muted)] mb-1">
                {isAgent ? "Support AZ Monoprix" : "Vous"} · {new Date(m.created_at).toLocaleString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
              </div>
              <div className="whitespace-pre-wrap">{m.body}</div>
            </div>
          );
        })}
      </div>

      {t.status !== "closed" && <ClientTicketReply ticketId={t.id} />}
    </main>
  );
}
