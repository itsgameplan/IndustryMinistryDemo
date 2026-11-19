import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { DeploymentTicker } from "@/components/shell/deployment-ticker";
import { LanguageSwitcher } from "@/components/shell/language-switcher";
import { LocalizedToaster } from "@/components/shell/localized-toaster";
import { I18nProvider } from "@/lib/i18n";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isLocale, localeDir } from "@/lib/i18n/config";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Jahez · جاهز — Factory Digital Transformation",
  description: "AI-powered factory digital maturity, transformation and intelligence platform (demonstration).",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // The language choice lives in a cookie so the first server render already has the right text and direction.
  const saved = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(saved) ? saved : DEFAULT_LOCALE;

  return (
    <html lang={locale} dir={localeDir(locale)} className={`${inter.variable} ${plexArabic.variable} h-full antialiased`}>
      <body className="min-h-full">
        <I18nProvider initialLocale={locale}>
          {children}
          <DeploymentTicker />
          <LanguageSwitcher />
          <LocalizedToaster />
        </I18nProvider>
      </body>
    </html>
  );
}
