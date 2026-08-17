import { Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth/guards";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { AdminAiChat } from "./chat";

export default async function AdminAiPage() {
  await requireAdmin();
  return (
    <div className="max-w-3xl space-y-4">
      <PageHeader
        title="Assistant Business"
        description="Interrogez vos données en langage naturel — les réponses sont ancrées sur les vues analytiques."
      />
      <DataCard>
        <div className="flex items-start gap-3 mb-3">
          <div className="w-9 h-9 rounded-lg bg-[var(--color-primary)]/10 text-[var(--color-primary)] grid place-items-center">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm">
              Posez une question sur les ventes, les stocks, les livreurs ou les clients.
              L'assistant se limite aux <strong>données réelles</strong> — il ne peut ni inventer ni modifier.
            </p>
          </div>
        </div>
        <AdminAiChat />
      </DataCard>
    </div>
  );
}
