"use client";

/**
 * Minimal EN/AR localisation for the Jahez demo.
 *
 * Usage in a client component:
 *   const t = useT();
 *   t("Digital maturity")                       // static text
 *   t("{count} solutions deployed", { count })  // interpolation with {name} placeholders
 *
 * The English source string is the key. Arabic lives in lib/i18n/dictionaries/<area>.ts;
 * any string without an Arabic entry falls back to English, so nothing ever renders blank.
 * The chosen locale is stored in a cookie so the server renders the same language and
 * direction on first paint (no hydration flash).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AR } from "./dictionaries";
import { LOCALE_COOKIE, localeDir, type Locale } from "./config";

export { LOCALES, LOCALE_COOKIE, isLocale, localeDir, type Locale } from "./config";

export type TranslateVars = Record<string, string | number>;
export type TFunction = (text: string, vars?: TranslateVars) => string;

function interpolate(text: string, vars?: TranslateVars): string {
  if (!vars) return text;
  return text.replace(/\{(\w+)\}/g, (match, key: string) => (key in vars ? String(vars[key]) : match));
}

/**
 * Separator for disambiguated keys. One English word can need different Arabic by context
 * ("Open" the button vs. "Open" the status), so such call sites use `t("Open||action")`:
 * the full key is looked up in the dictionary, and English shows only the part before "||".
 */
const CONTEXT_SEPARATOR = "||";

function englishOf(text: string): string {
  const i = text.indexOf(CONTEXT_SEPARATOR);
  return i === -1 ? text : text.slice(0, i);
}

/** Pure translation, usable outside React (e.g. building a toast message from known locale). */
export function translate(locale: Locale, text: string, vars?: TranslateVars): string {
  const source = locale === "ar" ? (AR[text] ?? AR[englishOf(text)] ?? englishOf(text)) : englishOf(text);
  return interpolate(source, vars);
}

type I18nContextValue = {
  locale: Locale;
  dir: "rtl" | "ltr";
  setLocale: (locale: Locale) => void;
  t: TFunction;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    const html = document.documentElement;
    html.lang = next;
    html.dir = localeDir(next);
  }, []);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      dir: localeDir(locale),
      setLocale,
      t: (text, vars) => translate(locale, text, vars),
    }),
    [locale, setLocale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

function useI18nContext(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useT/useLocale must be used inside <I18nProvider>");
  return ctx;
}

/** Returns the translate function for the active locale. */
export function useT(): TFunction {
  return useI18nContext().t;
}

/** Active locale, text direction and setter. */
export function useLocale() {
  const { locale, dir, setLocale } = useI18nContext();
  return { locale, dir, setLocale, isRtl: dir === "rtl" };
}
