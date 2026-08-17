import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListStores } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { StoresEditor } from "./stores-editor";
import { WILAYAS } from "@/constants/wilayas";

export const dynamic = "force-dynamic";

export default async function AdminStoresPage() {
  await requireAdmin();
  const stores = await adminListStores(createAdminClient());
  return (
    <div className="max-w-4xl">
      <PageHeader title="Magasins" description={`${stores.length} magasins`} />
      <DataCard>
        <StoresEditor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initial={stores as any}
          wilayas={WILAYAS.map((w) => ({ code: w.code, name: w.name_fr }))}
        />
      </DataCard>
    </div>
  );
}
