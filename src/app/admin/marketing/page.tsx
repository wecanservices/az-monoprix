import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListBanners } from "@/services/marketing/banners";
import { getSegmentCounts } from "@/services/analytics";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { BannersEditor } from "./banners-editor";
import { BroadcastForm } from "./broadcast-form";

export const dynamic = "force-dynamic";

export default async function AdminMarketingPage() {
  await requireAdmin();
  const sb = createAdminClient();
  const [banners, segments] = await Promise.all([
    adminListBanners(sb),
    getSegmentCounts(sb),
  ]);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Marketing" description="Bannières et campagnes." />

      <DataCard>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Envoyer une campagne</h2>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            Une notification in-app est créée pour chaque client du segment ciblé.
          </p>
        </div>
        <BroadcastForm segments={segments} />
      </DataCard>

      <DataCard>
        <div className="mb-3">
          <h2 className="text-sm font-semibold">Bannières</h2>
          <p className="text-xs text-[var(--color-foreground-muted)]">
            URL image publique (upload dans un produit puis colle ici, ou lien externe).
          </p>
        </div>
        <BannersEditor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initial={banners as any}
        />
      </DataCard>
    </div>
  );
}
