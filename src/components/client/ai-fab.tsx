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
        fixed bottom-20 right-4 z-30
        h-14 pl-4 pr-5 rounded-full
        flex items-center gap-2
        bg-[var(--gradient-hero)] text-white
        shadow-[var(--shadow-glow-red)]
        hover:brightness-110 active:scale-95 transition
      "
    >
      <Sparkles className="w-5 h-5" />
      <span className="text-sm font-semibold whitespace-nowrap">Assistant IA</span>
    </Link>
  );
}
