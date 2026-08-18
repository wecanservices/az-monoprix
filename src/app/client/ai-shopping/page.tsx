import { Sparkles } from "lucide-react";
import { AiShoppingChat } from "./chat";

export default function AiShoppingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-6 pt-4 flex flex-col gap-3">
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-az-red-700)] text-white p-4">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Sparkles className="w-4 h-4" /> Assistant Courses
        </div>
        <h1 className="text-xl font-bold mt-1">Votre assistant catalogue AZ Monoprix</h1>
        <p className="text-xs opacity-90 mt-1">
          Cherchez parmi 12 091 produits, comparez, ajoutez au panier —
          l'assistant vérifie stock et prix en direct.
        </p>
      </div>

      <AiShoppingChat />
    </main>
  );
}
