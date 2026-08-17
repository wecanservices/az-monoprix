import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { adminGetPromotion } from "@/services/marketing/promotions";
import { adminListProducts } from "@/services/admin";
import { PageHeader } from "@/components/admin/page-header";
import { PromotionForm } from "../promotion-form";

export const dynamic = "force-dynamic";

export default async function EditPromotionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  const sb = createAdminClient();
  const [promo, products] = await Promise.all([
    adminGetPromotion(sb, id),
    adminListProducts(sb, { limit: 500 }),
  ]);
  if (!promo) notFound();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const productIds = ((promo as any).promotion_products ?? []).map((pp: any) => pp.product_id) as string[];
  return (
    <div className="max-w-4xl">
      <PageHeader title={promo.name} description={promo.description ?? ""} />
      <PromotionForm
        promo={{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(promo as any),
          product_ids: productIds,
        }}
        products={products.map((p) => ({ id: p.id, sku: p.sku, name_fr: p.name_fr }))}
      />
    </div>
  );
}
