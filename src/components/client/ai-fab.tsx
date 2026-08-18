import Link from "next/link";
import { Sparkles } from "lucide-react";

/**
 * Bouton flottant Assistant IA — s'affiche par-dessus le contenu
 * en bas-droite, juste au-dessus de la bottom-nav.
 * Redirige vers `/client/ai-shopping` (chat Gemini pour construire
 * un panier à partir d'une description libre).
 */
export function AiFab() {
  return (
    <Link
      href="/client/ai-shopping"
      aria-label="Assistant IA courses"
      className="
        fixed bottom-24 right-4 z-30
        h-14 pl-4 pr-5 rounded-full
        inline-flex items-center gap-2
        text-white text-sm font-semibold
        border border-white/10
        shadow-[var(--shadow-glow-red-lg)]
        motion-safe:transition-transform motion-safe:duration-[var(--duration-base)]
        hover:-translate-y-0.5 active:scale-95
      "
      style={{
        background: "var(--gradient-cta)",
        boxShadow: "var(--shadow-glow-red-lg), inset 0 1px 0 0 rgb(255 255 255 / 0.18)",
      }}
    >
      <span className="grid place-items-center w-6 h-6 rounded-full bg-white/20 az-pulse-soft">
        <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
      </span>
      <span className="whitespace-nowrap">Assistant IA</span>
    </Link>
  );
}
