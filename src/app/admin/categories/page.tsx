import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListCategories } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { DataCard } from "@/components/admin/data-card";
import { CategoriesEditor } from "./categories-editor";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  await requireAdmin();
  const categories = await adminListCategories(createAdminClient());
  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Catégories"
        description={`${categories.length} catégories`}
      />
      <DataCard>
        <CategoriesEditor
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          initial={categories as any}
        />
      </DataCard>
    </div>
  );
}
