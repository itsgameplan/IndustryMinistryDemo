"use client";

import { Languages } from "lucide-react";
import { useLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/**
 * Always-visible EN ⇄ AR toggle, pinned to the bottom "end" corner of every page
 * (bottom-right in English, bottom-left in Arabic — opposite the sidebar).
 * The label is written in the language it switches to, so either reader can find it.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();
  const next = locale === "ar" ? "en" : "ar";
  const label = next === "ar" ? "العربية" : "English";
  const ariaLabel = next === "ar" ? "التبديل إلى العربية" : "Switch to English";

  return (
    <button
      type="button"
      onClick={() => setLocale(next)}
      aria-label={ariaLabel}
      title={ariaLabel}
      lang={next}
      className={cn(
        "fixed bottom-4 end-4 z-[60] flex h-11 items-center gap-2 rounded-full border border-line bg-white/95 ps-3 pe-4 text-sm font-semibold text-navy-900 shadow-lift backdrop-blur",
        "transition hover:border-teal-300 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 active:scale-[0.97]",
        "motion-reduce:transition-none motion-reduce:active:scale-100 print:hidden",
        next === "ar" && "font-arabic",
        className,
      )}
    >
      <span className="grid size-7 place-items-center rounded-full bg-navy-900 text-teal-300">
        <Languages className="size-4" aria-hidden />
      </span>
      {label}
    </button>
  );
}
