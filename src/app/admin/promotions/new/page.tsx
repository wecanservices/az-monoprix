import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListProducts } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { PromotionForm } from "../promotion-form";

export const dynamic = "force-dynamic";

export default async function NewPromotionPage() {
  await requireAdmin();
  const products = await adminListProducts(createAdminClient(), { limit: 500 });
  return (
    <div className="max-w-4xl">
      <PageHeader title="Nouvelle promotion" />
      <PromotionForm products={products.map((p) => ({ id: p.id, sku: p.sku, name_fr: p.name_fr }))} />
    </div>
  );
}
