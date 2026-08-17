"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, MapPin, Bike, Store, Car, Wallet, CreditCard } from "lucide-react";
import type { Cart, DeliverySlot } from "@/services/types";
import { computeTotals } from "@/services/cart/totals";
import { formatDZD } from "@/utils/money";
import { slotIsoRange } from "@/services/delivery/slots";
import { cn } from "@/lib/utils";

type SlotDay = { date: string; label: string; slots: DeliverySlot[] };
type Address = {
  id: string;
  label: string | null;
  address_line: string;
  full_name: string | null;
  phone: string | null;
  wilaya_code: string | null;
};

const MODES = [
  { id: "delivery", label: "Livraison à domicile", icon: Bike, hint: "En 2h" },
  { id: "drive", label: "Drive", icon: Car, hint: "Retrait véhicule" },
  { id: "pickup", label: "Click & Collect", icon: Store, hint: "Retrait piéton" },
] as const;

const PAYMENTS = [
  { id: "cash_on_delivery", label: "Paiement à la livraison (espèces)", icon: Wallet },
  { id: "card_on_delivery", label: "Carte bancaire à la livraison", icon: CreditCard },
] as const;

export function CheckoutForm({
  cart,
  slotDays,
  addresses,
  customerName,
  customerPhone,
}: {
  cart: Cart;
  slotDays: SlotDay[];
  addresses: Address[];
  customerName: string | null;
  customerPhone: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<(typeof MODES)[number]["id"]>("delivery");
  const [addressId, setAddressId] = useState<string | null>(addresses[0]?.id ?? null);
  const [manualAddress, setManualAddress] = useState({
    full_name: customerName ?? "",
    phone: customerPhone ?? "",
    address_line: addresses[0]?.address_line ?? "",
  });
  const [slotDate, setSlotDate] = useState(slotDays[0]?.date ?? "");
  const [slotId, setSlotId] = useState<string | null>(slotDays[0]?.slots[0]?.id ?? null);
  const [payment, setPayment] = useState<(typeof PAYMENTS)[number]["id"]>("cash_on_delivery");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, startTransition] = useTransition();

  const deliveryFee = mode === "delivery" ? 250 : 0;
  const totals = useMemo(() => computeTotals(cart.items, { deliveryFee }), [cart.items, deliveryFee]);

  const activeSlots = slotDays.find((d) => d.date === slotDate)?.slots ?? [];
  const activeSlot = activeSlots.find((s) => s.id === slotId) ?? activeSlots[0];

  function submit() {
    setError(null);
    if (!activeSlot) {
      setError("Sélectionnez un créneau.");
      return;
    }
    if (mode === "delivery" && !manualAddress.address_line) {
      setError("Adresse requise pour la livraison.");
      return;
    }

    startTransition(async () => {
      const { start, end } = slotIsoRange(slotDate, activeSlot.starts_at, activeSlot.ends_at);
      const res = await fetch("/api/v1/checkout/place", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fulfillmentMode: mode,
          slotId: activeSlot.id,
          scheduledStart: start,
          scheduledEnd: end,
          addressSnapshot:
            mode === "delivery"
              ? {
                  addressId,
                  ...manualAddress,
                }
              : null,
          paymentMethod: payment,
          notes: notes || null,
          deliveryFee,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message ?? "Impossible de passer commande.");
        return;
      }
      router.push(`/client/orders/${json.data.orderId}?placed=1`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      {/* MODE */}
      <Section title="Mode de réception">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMode(m.id)}
              className={cn(
                "flex items-center gap-3 p-3 rounded-xl border text-left transition",
                mode === m.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
              )}
            >
              <m.icon className="w-5 h-5" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{m.label}</div>
                <div className="text-[11px] text-[var(--color-foreground-muted)]">{m.hint}</div>
              </div>
              {mode === m.id && <CheckCircle2 className="w-4 h-4 ml-auto text-[var(--color-primary)]" />}
            </button>
          ))}
        </div>
      </Section>

      {/* ADDRESS */}
      {mode === "delivery" && (
        <Section title="Adresse de livraison" icon={<MapPin className="w-4 h-4" />}>
          <div className="space-y-2">
            <input
              placeholder="Nom complet"
              value={manualAddress.full_name}
              onChange={(e) => setManualAddress({ ...manualAddress, full_name: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
            />
            <input
              placeholder="Téléphone"
              inputMode="tel"
              value={manualAddress.phone}
              onChange={(e) => setManualAddress({ ...manualAddress, phone: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm"
            />
            <textarea
              placeholder="Adresse complète (bâtiment, étage, quartier…)"
              rows={2}
              value={manualAddress.address_line}
              onChange={(e) => setManualAddress({ ...manualAddress, address_line: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none"
            />
          </div>
        </Section>
      )}

      {/* SLOT */}
      <Section title="Créneau">
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-4 px-4">
          {slotDays.map((d) => (
            <button
              key={d.date}
              type="button"
              onClick={() => {
                setSlotDate(d.date);
                setSlotId(d.slots[0]?.id ?? null);
              }}
              className={cn(
                "shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition",
                slotDate === d.date
                  ? "bg-[var(--color-primary)] text-white border-[var(--color-primary)]"
                  : "border-[var(--color-border)] text-[var(--color-foreground-muted)]",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
          {activeSlots.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSlotId(s.id)}
              className={cn(
                "px-3 py-2 rounded-xl border text-sm text-center transition",
                slotId === s.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5 font-semibold"
                  : "border-[var(--color-border)] hover:border-[var(--color-border-strong)]",
              )}
            >
              {s.starts_at.slice(0, 5)} — {s.ends_at.slice(0, 5)}
            </button>
          ))}
        </div>
      </Section>

      {/* PAYMENT */}
      <Section title="Paiement">
        <div className="space-y-2">
          {PAYMENTS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPayment(p.id)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl border text-left transition",
                payment === p.id
                  ? "border-[var(--color-primary)] bg-[var(--color-primary)]/5"
                  : "border-[var(--color-border)]",
              )}
            >
              <p.icon className="w-5 h-5" />
              <span className="text-sm font-medium flex-1">{p.label}</span>
              {payment === p.id && <CheckCircle2 className="w-4 h-4 text-[var(--color-primary)]" />}
            </button>
          ))}
          <div className="text-[11px] text-[var(--color-foreground-muted)] pt-1">
            Paiement en ligne (Edahabia · CIB) — arrivée prochainement.
          </div>
        </div>
      </Section>

      {/* NOTES */}
      <Section title="Note pour le préparateur (optionnel)">
        <textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Ex : sonnez à l'interphone, sac supplémentaire…"
          className="w-full px-3 py-2 rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] text-sm resize-none"
        />
      </Section>

      {/* SUMMARY */}
      <section className="rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)] p-4 space-y-2 text-sm">
        <Row label="Sous-total" value={formatDZD(totals.subtotal)} />
        <Row label="Livraison" value={formatDZD(totals.delivery_fee)} />
        <div className="border-t border-[var(--color-border)] my-2" />
        <Row label="Total" value={formatDZD(totals.total)} big />
      </section>

      {error && (
        <div className="rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={submit}
        disabled={busy}
        className="w-full h-12 rounded-full bg-[var(--color-primary)] text-[var(--color-primary-foreground)] text-sm font-semibold disabled:opacity-60"
      >
        {busy ? "Envoi…" : `Confirmer la commande · ${formatDZD(totals.total)}`}
      </button>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {children}
    </section>
  );
}

function Row({ label, value, big }: { label: string; value: string; big?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className={big ? "text-base font-semibold" : "text-sm text-[var(--color-foreground-muted)]"}>
        {label}
      </span>
      <span className={big ? "text-lg font-bold" : "text-sm font-semibold"}>{value}</span>
    </div>
  );
}
