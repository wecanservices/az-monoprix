import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Inter, Fraunces } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getLocale } from "next-intl/server";
import { isRtl, type Locale } from "@/lib/i18n/config";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Serif accent — used sparingly for premium display touches (.az-display-serif)
// Variable font : on n'utilise ni `weight` ni `style` — Fraunces est
// entièrement variable (poids + italique + opsz axis).
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  title: {
    default: "AZ Monoprix — Qualité · Choix · Prix Justes",
    template: "%s · AZ Monoprix",
  },
  description:
    "AZ Monoprix — Supermarché premium à Lakhdaria (Bouira). Courses en ligne, livraison en 2h, drive et click & collect.",
  applicationName: "AZ Monoprix",
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/brand/favicon.svg", type: "image/svg+xml" }],
    apple: "/brand/logo-mark.svg",
  },
  openGraph: {
    title: "AZ Monoprix — Qualité · Choix · Prix Justes",
    description: "Supermarché premium à Lakhdaria · livraison en 2h.",
    type: "website",
    locale: "fr_DZ",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = isRtl(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={`${inter.variable} ${fraunces.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-[var(--color-surface-muted)]">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
