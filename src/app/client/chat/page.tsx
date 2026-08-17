import { LifeBuoy } from "lucide-react";
import Link from "next/link";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { listCustomerTickets } from "@/services/support";
import { EmptyState } from "@/components/shared/empty-state";
import { NewTicketButton } from "./new-ticket-button";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  open: "Ouvert",
  in_progress: "En cours",
  resolved: "Résolu",
  closed: "Fermé",
};

export default async function ClientChatPage() {
  const session = await requireCustomer();
  const tickets = await listCustomerTickets(await createClient(), session.id);

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Aide & Support</h1>
        <NewTicketButton />
      </div>

      {tickets.length === 0 ? (
        <EmptyState
          icon={<LifeBuoy className="w-6 h-6" />}
          title="Aucun ticket ouvert"
          description="Ouvrez un ticket depuis n'importe quelle commande."
        />
      ) : (
        <ul className="space-y-2">
          {tickets.map((t) => (
            <li key={t.id}>
              <Link
                href={`/client/chat/${t.id}`}
                className="block p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] hover:border-[var(--color-border-strong)]"
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium text-sm">{t.subject}</span>
                  <span className="text-[10px] uppercase font-semibold text-[var(--color-primary)]">
                    {STATUS_LABEL[t.status] ?? t.status}
                  </span>
                </div>
                <div className="text-xs text-[var(--color-foreground-muted)] mt-0.5 capitalize">
                  {t.category}
                  {" · "}
                  {new Date(t.created_at).toLocaleDateString("fr-FR")}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
