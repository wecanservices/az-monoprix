import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminListBrands, adminListCategories } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../product-form";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  await requireAdmin();
  const sb = createAdminClient();
  const [categories, brands] = await Promise.all([
    adminListCategories(sb),
    adminListBrands(sb),
  ]);
  return (
    <div className="max-w-3xl">
      <PageHeader title="Nouveau produit" />
      <ProductForm categories={categories} brands={brands} />
    </div>
  );
}
