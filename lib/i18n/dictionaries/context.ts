// Context-specific Arabic for English words whose meaning depends on where they appear.
// Call sites use `t("Open||action")`; English shows "Open". See CONTEXT_SEPARATOR in lib/i18n/index.tsx.
export const contextual: Record<string, string> = {
  "Open||action": "فتح",
  "Building||structure": "المبنى",
  "Current||electric": "التيار",
  "Marketplace||services": "سوق الخدمات",
  "Pipeline||deployment": "مسار التنفيذ",
  "Labels||overlay": "التسميات",
  "clear||status": "لا متأخرات",
  "Lean||manufacturing": "الإنتاج الرشيق",
};
