import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import { DEFAULT_LOCALE, LOCALES, type Locale } from "./config";

/** Cookie name storing the user's locale preference. */
export const LOCALE_COOKIE = "az-locale";

/**
 * Resolves the active locale for the current request.
 *
 * Priority: cookie → Accept-Language → default.
 * Called from server components / route handlers.
 */
export async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const fromCookie = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isLocale(fromCookie)) return fromCookie;

  const hdrs = await headers();
  const accept = hdrs.get("accept-language") ?? "";
  const first = accept.split(",")[0]?.split("-")[0]?.toLowerCase();
  if (isLocale(first)) return first;

  return DEFAULT_LOCALE;
}

function isLocale(v: string | undefined): v is Locale {
  return !!v && (LOCALES as readonly string[]).includes(v);
}

/** next-intl request config — loads the right messages bundle. */
export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  const messages = (await import(`../../../locales/${locale}.json`)).default;
  return { locale, messages };
});
