// Tasteful SVG illustrations for the generated factory website (no external images).

type Kind = "fabric" | "polo" | "workwear" | "linen" | "generic";

export function productKind(id: string, nameEn: string): Kind {
  const s = `${id} ${nameEn}`.toLowerCase();
  if (/fabric|roll|knit fabric/.test(s)) return "fabric";
  if (/polo|t-shirt|tee/.test(s)) return "polo";
  if (/work|uniform|coverall/.test(s)) return "workwear";
  if (/linen|hospital|health|sheet|scrub/.test(s)) return "linen";
  return "generic";
}

export function ProductArt({ kind, className }: { kind: Kind; className?: string }) {
  return (
    <svg viewBox="0 0 240 150" className={className} aria-hidden>
      <defs>
        <pattern id={`knit-${kind}`} width="12" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 0 L6 8 L12 0" fill="none" stroke="var(--p)" strokeOpacity="0.16" strokeWidth="1.4" />
        </pattern>
      </defs>
      <rect width="240" height="150" fill="var(--soft)" />
      <rect width="240" height="150" fill={`url(#knit-${kind})`} />
      {kind === "fabric" && (
        <g>
          <rect x="54" y="54" width="132" height="54" rx="6" fill="var(--p)" opacity="0.9" />
          <rect x="54" y="54" width="132" height="54" rx="6" fill={`url(#knit-${kind})`} />
          <ellipse cx="186" cy="81" rx="12" ry="27" fill="var(--dark)" />
          <ellipse cx="186" cy="81" rx="4" ry="9" fill="var(--soft)" />
          <path d="M54 108 Q40 118 30 132 L120 132 Q110 120 112 108 Z" fill="var(--p)" opacity="0.55" />
          <rect x="70" y="40" width="96" height="12" rx="6" fill="var(--accent)" opacity="0.85" />
        </g>
      )}
      {kind === "polo" && (
        <g transform="translate(70 22)">
          <path d="M28 6 L44 0 Q50 10 56 0 L72 6 L100 26 L88 46 L76 38 L76 108 L24 108 L24 38 L12 46 L0 26 Z" fill="var(--p)" />
          <path d="M44 0 Q50 10 56 0 L56 22 L44 22 Z" fill="var(--dark)" opacity="0.5" />
          <circle cx="50" cy="12" r="1.8" fill="var(--soft)" />
          <circle cx="50" cy="18" r="1.8" fill="var(--soft)" />
          <rect x="60" y="34" width="10" height="8" rx="1.5" fill="var(--accent)" />
          <path d="M24 98 L76 98" stroke="var(--dark)" strokeOpacity="0.35" strokeWidth="2" />
        </g>
      )}
      {kind === "workwear" && (
        <g transform="translate(66 18)">
          <path d="M30 4 L54 0 L78 4 L108 24 L98 50 L86 44 L86 114 L22 114 L22 44 L10 50 L0 24 Z" fill="var(--dark)" />
          <path d="M54 0 L54 114" stroke="var(--soft)" strokeOpacity="0.35" strokeWidth="1.5" strokeDasharray="3 4" />
          <rect x="22" y="70" width="64" height="7" fill="var(--accent)" />
          <rect x="22" y="84" width="64" height="4" fill="var(--soft)" opacity="0.6" />
          <rect x="30" y="30" width="16" height="14" rx="2" fill="var(--p)" />
          <rect x="62" y="30" width="16" height="14" rx="2" fill="var(--p)" />
        </g>
      )}
      {kind === "linen" && (
        <g>
          {[0, 1, 2, 3].map((i) => (
            <g key={i} transform={`translate(${62 + i * 3} ${100 - i * 18})`}>
              <rect width="112" height="16" rx="4" fill={i % 2 ? "#FFFFFF" : "var(--p)"} opacity={i % 2 ? 1 : 0.85} stroke="var(--dark)" strokeOpacity="0.12" />
              <path d="M8 8 L104 8" stroke={i % 2 ? "var(--p)" : "#FFFFFF"} strokeOpacity="0.35" strokeDasharray="2 3" />
            </g>
          ))}
          <path d="M170 44 l6 0 l0 -6 l6 0 l0 6 l6 0 l0 6 l-6 0 l0 6 l-6 0 l0 -6 l-6 0 Z" fill="var(--accent)" />
        </g>
      )}
      {kind === "generic" && (
        <g>
          <circle cx="120" cy="75" r="40" fill="var(--p)" opacity="0.85" />
          <circle cx="120" cy="75" r="40" fill={`url(#knit-${kind})`} />
          <circle cx="120" cy="75" r="12" fill="var(--soft)" />
          <path d="M160 75 Q190 70 200 110" stroke="var(--accent)" strokeWidth="4" fill="none" strokeLinecap="round" />
        </g>
      )}
    </svg>
  );
}

/** Stylised circular-knitting machine + fabric for the hero. */
export function HeroArt({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 320 300" className={className} aria-hidden>
      <defs>
        <linearGradient id="hero-fab" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity="0.95" />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity="0.55" />
        </linearGradient>
        <pattern id="hero-knit" width="10" height="9" patternUnits="userSpaceOnUse">
          <path d="M0 0 L5 7 L10 0" fill="none" stroke="var(--p)" strokeOpacity="0.35" strokeWidth="1.2" />
        </pattern>
      </defs>
      <circle cx="160" cy="150" r="138" fill="#FFFFFF" opacity="0.05" />
      <circle cx="160" cy="150" r="104" fill="none" stroke="#FFFFFF" strokeOpacity="0.14" strokeDasharray="4 8" />
      {/* creel of yarn cones */}
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
        const a = (i / 8) * Math.PI * 2;
        const x = 160 + Math.cos(a) * 104;
        const y = 150 + Math.sin(a) * 104;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <path d="M-7 9 L-4 -9 L4 -9 L7 9 Z" fill="var(--accent)" opacity={0.6 + (i % 3) * 0.13} />
          </g>
        );
      })}
      {/* machine cylinder */}
      <ellipse cx="160" cy="96" rx="62" ry="16" fill="#FFFFFF" opacity="0.9" />
      <rect x="98" y="96" width="124" height="64" fill="url(#hero-fab)" />
      <rect x="98" y="96" width="124" height="64" fill="url(#hero-knit)" />
      <ellipse cx="160" cy="96" rx="44" ry="10" fill="var(--dark)" opacity="0.65" />
      {/* fabric tube flowing down */}
      <path d="M98 160 Q110 206 120 246 L200 246 Q210 206 222 160 Z" fill="url(#hero-fab)" />
      <path d="M98 160 Q110 206 120 246 L200 246 Q210 206 222 160 Z" fill="url(#hero-knit)" />
      <ellipse cx="160" cy="248" rx="40" ry="9" fill="var(--accent)" />
      {/* yarn lines */}
      {[118, 140, 180, 202].map((x, i) => (
        <path key={x} d={`M${x} 40 Q${x + (i % 2 ? 6 : -6)} 66 ${x + (160 - x) * 0.25} 92`} stroke="#FFFFFF" strokeOpacity="0.45" fill="none" />
      ))}
    </svg>
  );
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
