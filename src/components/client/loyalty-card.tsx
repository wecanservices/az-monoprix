import QRCode from "qrcode";
import { Award, Sparkles } from "lucide-react";
import { formatDZD } from "@/utils/money";

/**
 * Carte fidélité électronique — style « portefeuille numérique ».
 *
 * Serveur uniquement : le QR code est généré en SVG côté serveur (aucune
 * dépendance client). Encode `az:loyalty:{customerId}` pour qu'une caisse
 * puisse le scanner et créditer les points via un endpoint admin dédié.
 */

export interface LoyaltyCardProps {
  customerId: string;
  customerName?: string | null;
  balance: number;
  lifetimeEarned: number;
  dzdPerPoint: number;
  memberSince?: string | null;
  /** compact = version widget profil (h plus courte, pas de QR) */
  compact?: boolean;
}

/** Détermine le niveau à partir du total gagné à vie. */
function computeTier(lifetime: number): {
  key: "bronze" | "silver" | "gold" | "platinum";
  label: string;
  ring: string; // gradient CSS pour le halo
  next?: { key: string; label: string; needed: number };
} {
  if (lifetime >= 20000)
    return {
      key: "platinum",
      label: "Platinum",
      ring: "linear-gradient(135deg, #E6E9F0 0%, #EEF1F5 40%, #C7CBD3 100%)",
    };
  if (lifetime >= 8000)
    return {
      key: "gold",
      label: "Gold",
      ring: "linear-gradient(135deg, #F6D365 0%, #FDA085 100%)",
      next: { key: "platinum", label: "Platinum", needed: 20000 - lifetime },
    };
  if (lifetime >= 2000)
    return {
      key: "silver",
      label: "Silver",
      ring: "linear-gradient(135deg, #E0E5EC 0%, #B8C2CC 100%)",
      next: { key: "gold", label: "Gold", needed: 8000 - lifetime },
    };
  return {
    key: "bronze",
    label: "Bronze",
    ring: "linear-gradient(135deg, #E9A170 0%, #C77B4B 100%)",
    next: { key: "silver", label: "Silver", needed: 2000 - lifetime },
  };
}

function shortNumber(id: string): string {
  // 4x4 groupes, dérivé du UUID → lisible « type carte bancaire »
  const hex = id.replace(/-/g, "").slice(0, 16).toUpperCase();
  return hex.match(/.{1,4}/g)?.join(" · ") ?? hex;
}

async function qrDataUrl(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#0A0A0A", light: "#FFFFFF" },
  });
}

export async function LoyaltyCard({
  customerId,
  customerName,
  balance,
  lifetimeEarned,
  dzdPerPoint,
  memberSince,
  compact = false,
}: LoyaltyCardProps) {
  const tier = computeTier(lifetimeEarned);
  const worth = Math.round(balance * dzdPerPoint);
  const number = shortNumber(customerId);
  const qrPayload = `az:loyalty:${customerId}`;
  const qrSvg = compact ? null : await qrDataUrl(qrPayload);

  // Pourcentage de progression vers le prochain palier
  const progressPct = tier.next
    ? Math.min(
        100,
        Math.max(
          0,
          Math.round(
            ((lifetimeEarned -
              (tier.key === "bronze" ? 0 : tier.key === "silver" ? 2000 : 8000)) /
              (tier.next.needed +
                (lifetimeEarned -
                  (tier.key === "bronze" ? 0 : tier.key === "silver" ? 2000 : 8000)))) *
              100,
          ),
        ),
      )
    : 100;

  return (
    <div className="relative w-full">
      {/* Halo décoratif tier — visible autour de la carte */}
      <div
        aria-hidden
        className="absolute -inset-1 rounded-[26px] opacity-70 blur-md"
        style={{ background: tier.ring }}
      />

      <article
        className="relative overflow-hidden rounded-[22px] text-white shadow-[var(--shadow-elev-4)]"
        style={{
          background:
            "linear-gradient(140deg, #7A0D19 0%, #B71C1C 45%, #E14D3A 100%)",
        }}
      >
        {/* halos radiaux décoratifs */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 100% 0%, rgba(255,255,255,0.22), transparent 45%), radial-gradient(ellipse at 0% 100%, rgba(0,0,0,0.35), transparent 55%)",
          }}
        />
        {/* pattern subtile */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.08] mix-blend-overlay"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-30deg, #fff 0 1px, transparent 1px 22px)",
          }}
        />

        <div className={compact ? "relative p-4" : "relative p-5"}>
          {/* Ligne top : marque + tier */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[9px] font-black uppercase tracking-[0.22em] opacity-80">
                AZ Monoprix · Fidélité
              </div>
              <div className="mt-0.5 az-display-serif text-lg leading-none italic">
                Membre {tier.label}
              </div>
            </div>
            <span
              className="grid place-items-center w-9 h-9 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]"
              style={{ background: tier.ring }}
            >
              <Award className="w-4 h-4 text-[#5A2A0F]" strokeWidth={2.4} />
            </span>
          </div>

          {/* Points balance */}
          <div className={compact ? "mt-3" : "mt-5"}>
            <div className="flex items-baseline gap-2">
              <div className="text-4xl font-black tabular-nums tracking-tight">
                {balance.toLocaleString("fr-DZ")}
              </div>
              <div className="text-xs uppercase tracking-widest opacity-90 font-semibold">
                points
              </div>
            </div>
            {worth > 0 && (
              <div className="mt-1 text-xs opacity-90">
                soit ~ <strong className="font-bold">{formatDZD(worth)}</strong> de réduction
              </div>
            )}
          </div>

          {/* Progression vers prochain tier */}
          {tier.next && (
            <div className={compact ? "mt-3" : "mt-4"}>
              <div className="flex items-center justify-between text-[10px] mb-1.5 opacity-90">
                <span className="uppercase tracking-widest font-semibold">
                  Vers {tier.next.label}
                </span>
                <span className="tabular-nums font-semibold">
                  encore {tier.next.needed.toLocaleString("fr-DZ")} pts
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-white/20 overflow-hidden">
                <div
                  className="h-full rounded-full bg-white/90"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          )}

          {compact ? null : (
            <>
              {/* Numéro membre + nom */}
              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase tracking-widest opacity-70">
                    Nº membre
                  </div>
                  <div className="font-mono text-[13px] tabular-nums mt-0.5 truncate">
                    {number}
                  </div>
                  <div className="mt-2 text-[9px] uppercase tracking-widest opacity-70">
                    Titulaire
                  </div>
                  <div className="text-sm font-semibold truncate">
                    {customerName ?? "Client AZ"}
                  </div>
                  {memberSince && (
                    <div className="text-[10px] opacity-70 mt-0.5">
                      Membre depuis{" "}
                      {new Date(memberSince).toLocaleDateString("fr-FR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {/* QR code */}
                {qrSvg && (
                  <div className="shrink-0 relative">
                    <div className="w-[92px] h-[92px] rounded-xl bg-white p-1.5 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.06),0_8px_24px_-12px_rgba(0,0,0,0.4)]">
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                      />
                    </div>
                    <div className="mt-1.5 text-[8px] text-center uppercase tracking-widest opacity-80 font-semibold flex items-center justify-center gap-1">
                      <Sparkles className="w-2.5 h-2.5" />
                      Scannez en caisse
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
