import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { signupAction } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const t = await getTranslations("auth.signup");
  const tl = await getTranslations("auth.login");
  const { error } = await searchParams;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">{t("title")}</h1>

      {error && (
        <div className="rounded-lg border border-[var(--color-az-danger)]/40 bg-[var(--color-az-danger-soft)] text-[var(--color-az-danger)] px-3 py-2 text-sm">
          {error}
        </div>
      )}

      <form action={signupAction} className="space-y-4">
        <div className="space-y-1.5">
          <label htmlFor="full_name" className="block text-sm font-medium">
            Nom complet
          </label>
          <input
            id="full_name"
            name="full_name"
            required
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-sm font-medium">
            {tl("email")}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-sm font-medium">
            {tl("password")}
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)]"
          />
        </div>
        <button
          type="submit"
          className="w-full rounded-lg bg-[var(--color-primary)] text-[var(--color-primary-foreground)] py-2.5 text-sm font-medium hover:opacity-95 transition"
        >
          {t("submit")}
        </button>
      </form>

      <p className="text-sm text-center text-[var(--color-foreground-muted)]">
        Déjà un compte ?{" "}
        <Link href="/login" className="text-[var(--color-primary)] font-medium">
          {tl("submit")}
        </Link>
      </p>
    </div>
  );
}
