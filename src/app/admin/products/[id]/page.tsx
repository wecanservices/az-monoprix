import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  adminGetProduct,
  adminListBrands,
  adminListCategories,
  adminListStores,
} from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { ProductForm } from "../product-form";
import { StorePricingPanel } from "./store-pricing-panel";
import { ImagesPanel } from "./images-panel";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sb = createAdminClient();
  const [product, categories, brands, stores] = await Promise.all([
    adminGetProduct(sb, id),
    adminListCategories(sb),
    adminListBrands(sb),
    adminListStores(sb),
  ]);
  if (!product) notFound();

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title={product.name_fr} description={`SKU · ${product.sku}`} />
      <ProductForm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        product={product as any}
        categories={categories}
        brands={brands}
      />
      <ImagesPanel
        productId={product.id}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        initial={((product as any).images ?? []) as { id: string; url: string; position: number }[]}
      />
      <StorePricingPanel
        productId={product.id}
        basePrice={product.base_price}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        stores={stores as any}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        current={(product.store_products ?? []) as any}
      />
    </div>
  );
}
