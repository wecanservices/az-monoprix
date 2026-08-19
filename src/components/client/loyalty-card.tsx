import Image from "next/image";
import QRCode from "qrcode";
import { Award, MapPin, Phone, Wifi } from "lucide-react";
import { formatDZD } from "@/utils/money";

/**
 * Carte fidélité électronique premium — inspiration Amex Platinum /
 * Starbucks Reserve. Rendu 100% serveur (QR généré via `qrcode` npm).
 *
 * Deux modes :
 *   - full (défaut) — ratio ~1.586 style carte bancaire, QR + logo +
 *     chip + infos magasin, effet foil sur le badge tier
 *   - compact — version « widget profil » plus courte, sans QR
 */

export interface LoyaltyCardProps {
  customerId: string;
  customerName?: string | null;
  balance: number;
  lifetimeEarned: number;
  dzdPerPoint: number;
  memberSince?: string | null;
  compact?: boolean;
}

type TierKey = "bronze" | "silver" | "gold" | "platinum";

interface Tier {
  key: TierKey;
  label: string;
  /** gradient foil décoratif pour le badge et le halo */
  foil: string;
  /** couleur d'encre du badge (contraste avec foil) */
  ink: string;
  /** seuil bas du tier (inclus) */
  min: number;
  /** seuil haut (exclu) — pour calculer la progression */
  max: number | null;
}

const TIERS: Tier[] = [
  {
    key: "bronze",
    label: "Bronze",
    foil: "linear-gradient(135deg, #F5C48A 0%, #C77B4B 45%, #8A4A24 100%)",
    ink: "#3B1B08",
    min: 0,
    max: 2000,
  },
  {
    key: "silver",
    label: "Silver",
    foil: "linear-gradient(135deg, #F5F7FA 0%, #C8CDD3 45%, #7B818B 100%)",
    ink: "#1E293B",
    min: 2000,
    max: 8000,
  },
  {
    key: "gold",
    label: "Gold",
    foil:
      "linear-gradient(135deg, #FFF3B0 0%, #F6D365 30%, #E6A73B 60%, #B8791C 100%)",
    ink: "#3B2409",
    min: 8000,
    max: 20000,
  },
  {
    key: "platinum",
    label: "Platinum",
    foil:
      "linear-gradient(135deg, #FDFEFF 0%, #DDE3EA 30%, #A9B0BB 65%, #5D6472 100%)",
    ink: "#111827",
    min: 20000,
    max: null,
  },
];

function tierFor(lifetime: number): Tier {
  return (
    [...TIERS].reverse().find((t) => lifetime >= t.min) ?? TIERS[0]
  );
}

/** Numéro « type CB » 4x4 dérivé du UUID (16 chars hex). */
function memberNumber(id: string): string {
  const hex = id.replace(/-/g, "").slice(0, 16).toUpperCase();
  return hex.match(/.{1,4}/g)?.join("  ") ?? hex;
}

/** Génère un QR en SVG optimisé pour affichage ~120px. */
async function qrSvg(payload: string): Promise<string> {
  return QRCode.toString(payload, {
    type: "svg",
    errorCorrectionLevel: "M",
    margin: 0,
    color: { dark: "#0B0710", light: "#FFFFFF" },
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
  const tier = tierFor(lifetimeEarned);
  const next = TIERS.find((t) => t.min > lifetimeEarned);
  const worth = Math.round(balance * dzdPerPoint);
  const number = memberNumber(customerId);
  const qr = compact ? null : await qrSvg(`az:loyalty:${customerId}`);

  const spanInTier = next ? next.min - tier.min : 1;
  const progressPct = next
    ? Math.min(100, Math.max(3, Math.round(((lifetimeEarned - tier.min) / spanInTier) * 100)))
    : 100;

  return (
    <div className="relative w-full az-fade-in-up">
      {/* Halo foil autour de la carte — trahit visuellement le tier */}
      <div
        aria-hidden
        className="absolute -inset-[3px] rounded-[28px] opacity-70 blur-md motion-safe:animate-[az-pulse-soft_4s_ease-in-out_infinite]"
        style={{ background: tier.foil }}
      />

      <article
        className="
          relative overflow-hidden text-white
          rounded-[24px] shadow-[var(--shadow-elev-5)]
        "
        style={{
          background:
            "linear-gradient(135deg, #4A0710 0%, #6E0F1A 25%, #A2192A 55%, #E14D3A 100%)",
        }}
      >
        {/* Foil sheen diagonal */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "linear-gradient(115deg, transparent 20%, rgba(255,255,255,0.22) 42%, transparent 60%)",
            mixBlendMode: "overlay",
          }}
        />
        {/* Radial glow gauche/bas */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(140% 90% at -10% 110%, rgba(0,0,0,0.5), transparent 55%), radial-gradient(80% 60% at 100% 0%, rgba(255,220,180,0.28), transparent 60%)",
          }}
        />
        {/* Guilloché fin */}
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 w-full h-full opacity-[0.10] mix-blend-overlay"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <pattern id="guilloche" x="0" y="0" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M0,30 Q15,0 30,30 T60,30" fill="none" stroke="white" strokeWidth="0.6" />
              <path d="M0,45 Q15,15 30,45 T60,45" fill="none" stroke="white" strokeWidth="0.4" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#guilloche)" />
        </svg>

        <div className={compact ? "relative p-4" : "relative p-5"}>
          {/* ─── En-tête : logo + branding + tier badge ─── */}
          <header className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="relative w-9 h-9 shrink-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                <Image
                  src="/brand/logo-mark.svg"
                  alt="AZ Monoprix"
                  fill
                  sizes="36px"
                  className="object-contain"
                />
              </div>
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.24em] leading-none opacity-90">
                  AZ Monoprix
                </div>
                <div className="az-display-serif italic text-[15px] leading-tight mt-0.5">
                  Carte Fidélité
                </div>
              </div>
            </div>

            {/* Tier badge foil */}
            <div className="shrink-0 flex flex-col items-end gap-1">
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[inset_0_1px_0_rgba(255,255,255,0.55),0_2px_6px_rgba(0,0,0,0.25)]"
                style={{ background: tier.foil, color: tier.ink }}
              >
                <Award className="w-3 h-3" strokeWidth={2.6} />
                {tier.label}
              </span>
              {!compact && (
                <span className="text-[9px] uppercase tracking-widest opacity-70">
                  Membre {tier.label}
                </span>
              )}
            </div>
          </header>

          {/* ─── Ligne « chip + wifi » comme une vraie CB ─── */}
          {!compact && (
            <div className="mt-4 flex items-center gap-3">
              {/* Chip */}
              <div
                className="w-10 h-8 rounded-[6px] shadow-[inset_0_1px_0_rgba(255,255,255,0.5),0_1px_2px_rgba(0,0,0,0.3)]"
                style={{
                  background:
                    "linear-gradient(135deg, #F5D68A 0%, #C29A4B 50%, #8A6A2F 100%)",
                  backgroundImage:
                    "linear-gradient(0deg, transparent 45%, rgba(0,0,0,0.35) 45%, rgba(0,0,0,0.35) 55%, transparent 55%), linear-gradient(90deg, transparent 15%, rgba(0,0,0,0.25) 15%, rgba(0,0,0,0.25) 20%, transparent 20%, transparent 35%, rgba(0,0,0,0.25) 35%, rgba(0,0,0,0.25) 40%, transparent 40%, transparent 60%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.25) 65%, transparent 65%, transparent 80%, rgba(0,0,0,0.25) 80%, rgba(0,0,0,0.25) 85%, transparent 85%), linear-gradient(135deg, #F5D68A 0%, #C29A4B 50%, #8A6A2F 100%)",
                }}
                aria-hidden
              />
              <Wifi
                className="w-4 h-4 rotate-90 opacity-70"
                strokeWidth={2.4}
                aria-hidden
              />
            </div>
          )}

          {/* ─── Points ─── */}
          <div className={compact ? "mt-3" : "mt-4"}>
            <div className="flex items-baseline gap-2">
              <div className="text-[42px] leading-[0.9] font-black tabular-nums tracking-[-0.02em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)]">
                {balance.toLocaleString("fr-DZ")}
              </div>
              <div className="text-[11px] font-black uppercase tracking-[0.22em] opacity-90">
                points
              </div>
            </div>
            {worth > 0 && (
              <div className="mt-1 text-[12px] opacity-90">
                soit ~ <strong className="font-black">{formatDZD(worth)}</strong> de
                réduction
              </div>
            )}
          </div>

          {/* ─── Progression vers tier suivant ─── */}
          {next && (
            <div className={compact ? "mt-3" : "mt-4"}>
              <div className="flex items-center justify-between text-[10px] mb-1.5 opacity-95">
                <span className="uppercase tracking-widest font-black flex items-center gap-1">
                  Vers <span style={{ color: "#FFE9B6" }}>{next.label}</span>
                </span>
                <span className="tabular-nums font-black">
                  {(next.min - lifetimeEarned).toLocaleString("fr-DZ")} pts restants
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-black/25 overflow-hidden ring-1 ring-inset ring-white/10">
                <div
                  className="absolute inset-y-0 left-0 rounded-full shadow-[0_0_10px_rgba(255,230,180,0.6)]"
                  style={{
                    width: `${progressPct}%`,
                    background:
                      "linear-gradient(90deg, #FFE7B0 0%, #F6C24E 60%, #E39A2A 100%)",
                  }}
                />
              </div>
            </div>
          )}

          {compact ? null : (
            <>
              {/* ─── Nº membre + titulaire + QR ─── */}
              <div className="mt-5 flex items-end justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[9px] uppercase tracking-widest opacity-70">
                    Nº membre
                  </div>
                  <div className="font-mono text-[12.5px] tabular-nums mt-0.5 tracking-wide truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]">
                    {number}
                  </div>

                  <div className="mt-2.5 text-[9px] uppercase tracking-widest opacity-70">
                    Titulaire
                  </div>
                  <div className="text-[14px] font-black uppercase tracking-wide truncate">
                    {customerName ?? "Client AZ"}
                  </div>
                  {memberSince && (
                    <div className="text-[9.5px] opacity-75 mt-0.5 uppercase tracking-widest">
                      Membre depuis{" "}
                      {new Date(memberSince).toLocaleDateString("fr-FR", {
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  )}
                </div>

                {/* QR + label */}
                {qr && (
                  <div className="shrink-0 flex flex-col items-center gap-1.5">
                    <div className="relative w-[104px] h-[104px] rounded-2xl bg-white p-2 shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05),0_10px_28px_-14px_rgba(0,0,0,0.55)]">
                      {/* Coins décoratifs */}
                      <span className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-white/80 rounded-tl-md" />
                      <span className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-white/80 rounded-tr-md" />
                      <span className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-white/80 rounded-bl-md" />
                      <span className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-white/80 rounded-br-md" />
                      <div
                        className="w-full h-full"
                        dangerouslySetInnerHTML={{ __html: qr }}
                      />
                    </div>
                    <div className="text-[8.5px] uppercase tracking-[0.18em] font-black opacity-90 text-center leading-tight">
                      Scannez
                      <br />
                      en caisse
                    </div>
                  </div>
                )}
              </div>

              {/* ─── Footer merchant ─── */}
              <footer className="mt-5 pt-3 border-t border-white/15 flex items-center justify-between gap-3 text-[10px] opacity-90">
                <span className="flex items-center gap-1.5 min-w-0">
                  <MapPin className="w-3 h-3 shrink-0" strokeWidth={2.4} />
                  <span className="truncate">Centre-ville · Lakhdaria, Bouira</span>
                </span>
                <span className="flex items-center gap-1.5 shrink-0">
                  <Phone className="w-3 h-3" strokeWidth={2.4} />
                  <span className="tabular-nums">+213 26 00 00 00</span>
                </span>
              </footer>
            </>
          )}
        </div>
      </article>
    </div>
  );
}
