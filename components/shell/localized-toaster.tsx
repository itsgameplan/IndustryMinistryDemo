"use client";

import { Toaster } from "sonner";
import { useLocale } from "@/lib/i18n";

/** Toasts follow the reading direction and sit above the floating language switcher. */
export function LocalizedToaster() {
  const { isRtl } = useLocale();
  return <Toaster position={isRtl ? "bottom-left" : "bottom-right"} dir={isRtl ? "rtl" : "ltr"} offset={{ bottom: 72 }} richColors closeButton />;
}
