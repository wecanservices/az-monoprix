import { Logo } from "@/components/shared/logo";
import { Tagline } from "@/components/shared/tagline";
import { MapPin, Phone, Truck } from "lucide-react";

export function ClientFooter() {
  return (
    <footer className="mt-8 rounded-3xl bg-[var(--color-surface)] border border-[var(--color-border)] p-5 space-y-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <Logo size="lg" />
        <Tagline size="sm" />
      </div>
      <div className="grid grid-cols-3 gap-3 pt-4 border-t border-[var(--color-border)] text-xs">
        <div className="flex flex-col items-center gap-1 text-center">
          <MapPin className="w-4 h-4 text-[var(--color-primary)]" />
          <div className="font-semibold">Lakhdaria</div>
          <div className="text-[10px] text-[var(--color-foreground-muted)]">Bouira</div>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Truck className="w-4 h-4 text-[var(--color-az-green-700)]" />
          <div className="font-semibold">2 h max</div>
          <div className="text-[10px] text-[var(--color-foreground-muted)]">livraison</div>
        </div>
        <div className="flex flex-col items-center gap-1 text-center">
          <Phone className="w-4 h-4 text-[var(--color-primary)]" />
          <div className="font-semibold">026 00 00 00</div>
          <div className="text-[10px] text-[var(--color-foreground-muted)]">support</div>
        </div>
      </div>
      <p className="text-[10px] text-center text-[var(--color-foreground-muted)] pt-2">
        © {new Date().getFullYear()} AZ Monoprix · Tous droits réservés
      </p>
    </footer>
  );
}
