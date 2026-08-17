import { Sparkles } from "lucide-react";
import { AiShoppingChat } from "./chat";

export default function AiShoppingPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pb-24 pt-4 space-y-4">
      <div className="rounded-2xl bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-az-red-700)] text-white p-5">
        <div className="flex items-center gap-2 text-xs uppercase tracking-widest opacity-80">
          <Sparkles className="w-4 h-4" /> Assistant Courses
        </div>
        <h1 className="text-2xl font-bold mt-1">Dites-nous ce dont vous avez besoin</h1>
        <p className="text-sm opacity-90 mt-1">
          Un budget, une occasion, un régime particulier — on prépare votre panier.
        </p>
      </div>

      <AiShoppingChat />
    </main>
  );
}
