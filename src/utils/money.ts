/**
 * Format Algerian dinar amounts consistently across the app.
 * Never format currency ad-hoc — always go through `formatDZD`.
 */
export function formatDZD(amount: number | string, locale = "fr-DZ"): string {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (!Number.isFinite(n)) return "—";
  // No fractional part in Algerian retail; keep it clean.
  return `${new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(n)} DA`;
}
