// Logo mark and product classification for the generated factory website (photos live in site-photos.ts).

export type Kind = "fabric" | "polo" | "workwear" | "linen" | "generic";

export function productKind(id: string, nameEn: string): Kind {
  const s = `${id} ${nameEn}`.toLowerCase();
  if (/fabric|roll|knit fabric/.test(s)) return "fabric";
  if (/polo|t-shirt|tee/.test(s)) return "polo";
  if (/work|uniform|coverall/.test(s)) return "workwear";
  if (/linen|hospital|health|sheet|scrub/.test(s)) return "linen";
  return "generic";
}

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <rect width="32" height="32" rx="9" fill="var(--p)" />
      <path d="M8 11 L12 19 L16 11 L20 19 L24 11" fill="none" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 21 L24 21" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}
