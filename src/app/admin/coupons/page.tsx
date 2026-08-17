import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListCoupons } from "@/services/marketing/coupons";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CouponsEditor } from "./coupons-editor";

export const dynamic = "force-dynamic";

export default async function AdminCouponsPage() {
  await requireAdmin();
  const coupons = await adminListCoupons(createAdminClient());
  return (
    <div className="max-w-5xl">
      <PageHeader title="Coupons" description={`${coupons.length} coupons`} />
      <DataCard>
        <CouponsEditor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initial={coupons as any}
        />
      </DataCard>
      {coupons.length === 0 && <EmptyState title="Ajoutez votre premier coupon ci-dessus." />}
    </div>
  );
}
