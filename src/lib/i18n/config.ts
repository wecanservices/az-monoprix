/**
 * AZ MONOPRIX — i18n configuration.
 *
 * On garde `fr` comme défaut pour le marché algérien (bilingue courant),
 * `ar` avec RTL, `en` pour l'ouverture internationale.
 */

export const LOCALES = ["fr", "ar", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";

/** Locales qui doivent être rendues en RTL. */
export const RTL_LOCALES: readonly Locale[] = ["ar"];

export function isRtl(locale: Locale): boolean {
  return RTL_LOCALES.includes(locale);
}

export const LOCALE_LABELS: Record<Locale, string> = {
  fr: "Français",
  ar: "العربية",
  en: "English",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  fr: "🇫🇷",
  ar: "🇩🇿",
  en: "🇬🇧",
};
