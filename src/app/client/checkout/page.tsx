import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireCustomer } from "@/lib/auth/guards";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateCart } from "@/services/cart";
import { listUpcomingSlots } from "@/services/delivery/slots";
import { DEFAULT_STORE_ID } from "@/services/stores";
import { CheckoutForm } from "./form";

export const dynamic = "force-dynamic";

export default async function CheckoutPage() {
  const session = await requireCustomer();
  const sb = await createClient();
  const cart = await getOrCreateCart(sb, {
    customerId: session.id,
    storeId: DEFAULT_STORE_ID,
  });

  if (cart.items.length === 0) redirect("/client/cart");

  const slotDays = await listUpcomingSlots(sb, cart.store_id ?? DEFAULT_STORE_ID);
  const { data: addresses } = await sb
    .from("addresses")
    .select("id, label, full_name, phone, address_line, wilaya_code")
    .eq("customer_id", session.id)
    .order("is_default", { ascending: false });

  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4">
      <div className="flex items-center gap-2 mb-4">
        <Link
          href="/client/cart"
          className="p-2 -ml-2 rounded-full hover:bg-[var(--color-surface-muted)]"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <h1 className="text-xl font-semibold">Passer la commande</h1>
      </div>

      <CheckoutForm
        cart={cart}
        slotDays={slotDays}
        addresses={(addresses ?? []).map((a) => ({
          id: a.id,
          label: a.label,
          address_line: a.address_line,
          full_name: a.full_name,
          phone: a.phone,
          wilaya_code: a.wilaya_code,
        }))}
        customerName={session.full_name}
        customerPhone={session.phone}
      />
    </main>
  );
}
