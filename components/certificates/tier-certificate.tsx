"use client";

// Official-styled tier certificate, drawn entirely as SVG so the on-screen view and every
// export (SVG / PNG / PDF) are pixel-identical. Uses system serif/sans fonts only so the
// exported file renders the same without web fonts.
import { forwardRef, useMemo } from "react";
import { PseudoQr } from "@/components/ministry/pseudo-qr";
import { REQUIREMENTS, tierDef } from "@/lib/data/tiers";
import type { Factory, TierLevel } from "@/lib/types";

export const CERT_W = 1123;
export const CERT_H = 794;

export type CertificateStatus = "verified" | "provisional" | "locked";

export interface CertificateData {
  tier: TierLevel;
  factory: Factory;
  status: CertificateStatus;
  certificateNo: string;
  factoryCode: string;
  issuedOn: string;
  validUntil: string;
}

const NAVY = "#0B1F3A";
const GOLD = "#B8913A";
const GOLD_LIGHT = "#E6CF96";
const PAPER = "#FDFBF5";
const SERIF = "Georgia, 'Times New Roman', 'Noto Serif', serif";
const SANS = "'Segoe UI', 'Helvetica Neue', Arial, sans-serif";
const ARABIC = "'Segoe UI', Tahoma, 'Noto Naskh Arabic', Arial, sans-serif";

export function hashCode(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7);
}

/** Guilloche band: overlapping sine waves, a classic security-print motif. */
function Guilloche({ x, y, w, h, color, waves = 7, id }: { x: number; y: number; w: number; h: number; color: string; waves?: number; id: string }) {
  const paths = useMemo(() => {
    const out: string[] = [];
    for (let k = 0; k < waves; k++) {
      const phase = (k / waves) * Math.PI * 2;
      let d = "";
      for (let px = 0; px <= w; px += 4) {
        const py = h / 2 + Math.sin(px / 9 + phase) * (h / 2 - 1) * Math.cos(px / 61 + phase / 2);
        d += `${px === 0 ? "M" : "L"}${(x + px).toFixed(1)},${(y + py).toFixed(1)}`;
      }
      out.push(d);
    }
    return out;
  }, [x, y, w, h, waves]);
  return (
    <g id={id} fill="none" stroke={color} strokeWidth={0.6} opacity={0.55}>
      {paths.map((d, i) => <path key={i} d={d} />)}
    </g>
  );
}

/** Rosette seal with scalloped edge. */
function Seal({ cx, cy, tier, color }: { cx: number; cy: number; tier: TierLevel; color: string }) {
  const scallop = useMemo(() => {
    const n = 40;
    let d = "";
    for (let i = 0; i <= n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2;
      const r = i % 2 === 0 ? 62 : 56;
      d += `${i === 0 ? "M" : "L"}${(cx + Math.cos(a) * r).toFixed(2)},${(cy + Math.sin(a) * r).toFixed(2)}`;
    }
    return d + "Z";
  }, [cx, cy]);
  const ringText = "JAHEZ · INDUSTRIAL DIGITAL MATURITY PROGRAMME · ";
  return (
    <g>
      <path d={`M${cx - 26},${cy + 48} L${cx - 36},${cy + 72} L${cx - 22},${cy + 66} L${cx - 13},${cy + 76} L${cx - 2},${cy + 54}Z`} fill={color} opacity={0.9} />
      <path d={`M${cx + 26},${cy + 48} L${cx + 36},${cy + 72} L${cx + 22},${cy + 66} L${cx + 13},${cy + 76} L${cx + 2},${cy + 54}Z`} fill={color} opacity={0.75} />
      <path d={scallop} fill={GOLD} />
      <circle cx={cx} cy={cy} r={52} fill="none" stroke={GOLD_LIGHT} strokeWidth={1.2} />
      <circle cx={cx} cy={cy} r={50} fill={GOLD} />
      <circle cx={cx} cy={cy} r={34} fill="none" stroke={GOLD_LIGHT} strokeWidth={0.8} />
      <defs>
        <path id={`seal-ring-${tier}`} d={`M${cx},${cy} m-42,0 a42,42 0 1,1 84,0 a42,42 0 1,1 -84,0`} />
      </defs>
      <text fontFamily={SANS} fontSize={7.4} letterSpacing={1.6} fill="#FFF8E6" fontWeight={700}>
        <textPath href={`#seal-ring-${tier}`}>{ringText + ringText.slice(0, 18)}</textPath>
      </text>
      <text x={cx} y={cy - 6} textAnchor="middle" fontFamily={SANS} fontSize={9} letterSpacing={2} fill="#FFF8E6" fontWeight={700}>TIER</text>
      <text x={cx} y={cy + 22} textAnchor="middle" fontFamily={SERIF} fontSize={34} fill="#FFFFFF" fontWeight={700}>{tier}</text>
    </g>
  );
}

function Corner({ x, y, rot }: { x: number; y: number; rot: number }) {
  return (
    <g transform={`translate(${x},${y}) rotate(${rot})`} fill="none" stroke={GOLD} strokeWidth={1.4}>
      <path d="M0,46 L0,0 L46,0" />
      <path d="M8,46 L8,8 L46,8" strokeWidth={0.7} />
      <path d="M0,0 C18,6 26,14 30,30 C14,26 6,18 0,0Z" fill={GOLD} opacity={0.85} stroke="none" />
      <circle cx={16} cy={16} r={2.4} fill={NAVY} stroke="none" />
    </g>
  );
}

export const TierCertificate = forwardRef<SVGSVGElement, { data: CertificateData; className?: string }>(function TierCertificate({ data, className }, ref) {
  const { tier, factory, status, certificateNo, factoryCode, issuedOn, validUntil } = data;
  const t = tierDef(tier);
  const reqs = tier === 0 ? [] : REQUIREMENTS.filter((r) => r.tier <= tier);
  const tierReqs = tier === 0 ? ["Registered industrial establishment", "Factory profile and contact details on file", "Baseline digital maturity assessment completed"] : REQUIREMENTS.filter((r) => r.tier === tier).map((r) => r.title);
  const statusLabel = status === "verified" ? "VERIFIED" : status === "provisional" ? "PROVISIONAL" : "NOT YET ACHIEVED";
  const statusColor = status === "verified" ? "#0A7D55" : status === "provisional" ? "#A16207" : "#64748B";
  const cx = CERT_W / 2;

  return (
    <svg ref={ref} xmlns="http://www.w3.org/2000/svg" viewBox={`0 0 ${CERT_W} ${CERT_H}`} className={className} role="img" aria-label={`Tier ${tier} ${t.name} certificate for ${factory.name}`}>
      <defs>
        <radialGradient id="paper" cx="50%" cy="45%" r="75%">
          <stop offset="0%" stopColor="#FFFEFA" />
          <stop offset="100%" stopColor="#F5EEDC" />
        </radialGradient>
        <pattern id="micro" width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.45" fill={NAVY} opacity="0.07" />
        </pattern>
        <linearGradient id="tierband" x1="0" x2="1">
          <stop offset="0%" stopColor={t.color} stopOpacity="0" />
          <stop offset="18%" stopColor={t.color} stopOpacity="0.95" />
          <stop offset="82%" stopColor={t.color} stopOpacity="0.95" />
          <stop offset="100%" stopColor={t.color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Paper & security background */}
      <rect width={CERT_W} height={CERT_H} fill={PAPER} />
      <rect width={CERT_W} height={CERT_H} fill="url(#paper)" />
      <rect width={CERT_W} height={CERT_H} fill="url(#micro)" />
      <g opacity={0.05} fill={NAVY} fontFamily={SERIF} fontSize={250} fontWeight={700} textAnchor="middle">
        <text x={cx} y={CERT_H / 2 + 90}>{tier}</text>
      </g>

      {/* Frames */}
      <rect x={18} y={18} width={CERT_W - 36} height={CERT_H - 36} fill="none" stroke={NAVY} strokeWidth={3} />
      <rect x={26} y={26} width={CERT_W - 52} height={CERT_H - 52} fill="none" stroke={GOLD} strokeWidth={1} />
      <Guilloche id="g-top" x={40} y={32} w={CERT_W - 80} h={14} color={GOLD} />
      <rect x={40} y={52} width={CERT_W - 80} height={CERT_H - 104} fill="none" stroke={NAVY} strokeWidth={0.8} opacity={0.6} />
      <Corner x={34} y={34} rot={0} />
      <Corner x={CERT_W - 34} y={34} rot={90} />
      <Corner x={CERT_W - 34} y={CERT_H - 34} rot={180} />
      <Corner x={34} y={CERT_H - 34} rot={270} />

      {/* Header */}
      <g transform={`translate(${cx - 22}, 70)`}>
        {/* Jahez mark (see components/brand/logo.tsx), scaled from its 40×40 grid */}
        <g transform="scale(1.1)">
          <rect width={40} height={40} rx={11} fill="#0B1F3A" />
          <path d="M10.5 19.5 17 26 29.5 12.5" fill="none" stroke="#2DBFB0" strokeWidth={4.4} strokeLinecap="round" strokeLinejoin="round" />
          <circle cx={20} cy={32.2} r={2.3} fill="#D1AE5C" />
        </g>
      </g>
      <text x={cx} y={134} textAnchor="middle" fontFamily={SANS} fontSize={11} letterSpacing={4} fill={NAVY} fontWeight={700}>JAHEZ · INDUSTRIAL DIGITAL MATURITY PROGRAMME</text>
      <text x={cx} y={152} textAnchor="middle" fontFamily={ARABIC} fontSize={12} fill={NAVY} opacity={0.75} direction="rtl">جاهز · برنامج النضج الرقمي الصناعي</text>

      <text x={cx} y={202} textAnchor="middle" fontFamily={SERIF} fontSize={40} fill={NAVY} letterSpacing={1}>Certificate of Digital Maturity</text>
      <text x={cx} y={232} textAnchor="middle" fontFamily={ARABIC} fontSize={19} fill={NAVY} opacity={0.85} direction="rtl">شهادة النضج الرقمي</text>

      {/* Tier band */}
      <rect x={cx - 260} y={248} width={520} height={34} fill="url(#tierband)" />
      <text x={cx} y={271} textAnchor="middle" fontFamily={SANS} fontSize={15} letterSpacing={5} fill="#fff" fontWeight={700}>
        TIER {tier} · {t.name.toUpperCase()}
      </text>
      <text x={cx} y={300} textAnchor="middle" fontFamily={ARABIC} fontSize={13} fill={NAVY} opacity={0.75} direction="rtl">المستوى {tier} · {t.nameAr}</text>

      {/* Body */}
      <text x={cx} y={334} textAnchor="middle" fontFamily={SERIF} fontSize={15} fontStyle="italic" fill={NAVY} opacity={0.8}>This is to certify that</text>
      <text x={cx} y={374} textAnchor="middle" fontFamily={SERIF} fontSize={34} fill={NAVY} fontWeight={700}>{factory.name}</text>
      <text x={cx} y={400} textAnchor="middle" fontFamily={ARABIC} fontSize={16} fill={NAVY} opacity={0.8} direction="rtl">{factory.nameAr}</text>
      <text x={cx} y={424} textAnchor="middle" fontFamily={SANS} fontSize={12} fill={NAVY} opacity={0.7}>{factory.industry} · {factory.location}</text>
      <text x={cx} y={454} textAnchor="middle" fontFamily={SERIF} fontSize={14} fill={NAVY} opacity={0.85}>
        {tier === 0
          ? "is registered on the Jahez platform and has completed its baseline digital maturity assessment."
          : `has satisfied every requirement of Tier ${tier} (${t.tagline.toLowerCase()}) and of all preceding tiers.`}
      </text>

      {/* Requirements met */}
      <text x={cx} y={486} textAnchor="middle" fontFamily={SANS} fontSize={9.5} letterSpacing={2.5} fill={GOLD} fontWeight={700}>
        {tier === 0 ? "REGISTRATION CRITERIA" : `TIER ${tier} REQUIREMENTS MET · ${reqs.length} CUMULATIVE`}
      </text>
      {tierReqs.map((r, i) => {
        const col = tierReqs.length > 3 ? i % 2 : 0;
        const row = tierReqs.length > 3 ? Math.floor(i / 2) : i;
        const x = tierReqs.length > 3 ? cx - 250 + col * 270 : cx - 150;
        return (
          <g key={r} transform={`translate(${x}, ${504 + row * 19})`}>
            <circle cx={5} cy={-4} r={5} fill={status === "locked" ? "#CBD5E1" : t.color} />
            <path d="M2.4,-4 L4.4,-2 L7.8,-6.2" stroke="#fff" strokeWidth={1.4} fill="none" />
            <text x={16} y={0} fontFamily={SANS} fontSize={12} fill={NAVY}>{r}</text>
          </g>
        );
      })}

      {/* Identity & registry details */}
      <line x1={80} y1={572} x2={CERT_W - 80} y2={572} stroke={GOLD} strokeWidth={0.8} />
      {[
        ["JAHEZ FACTORY ID", factoryCode],
        ["COMMERCIAL REG. NO.", factory.registrationNo],
        ["INDUSTRIAL LICENCE", factory.licenseNo],
        ["CERTIFICATE NO.", certificateNo],
        ["DATE OF ISSUE", issuedOn],
        ["VALID UNTIL", validUntil],
      ].map(([label, value], i) => (
        <g key={label} transform={`translate(${96 + i * 156}, 594)`}>
          <text fontFamily={SANS} fontSize={8} letterSpacing={1.4} fill={NAVY} opacity={0.55} fontWeight={700}>{label}</text>
          <text y={18} fontFamily={SANS} fontSize={12.5} fill={NAVY} fontWeight={600}>{value}</text>
        </g>
      ))}

      {/* Signature, seal, verification */}
      <g transform="translate(96, 674)">
        <path d="M0,0 C18,-22 30,10 46,-10 C58,-26 66,4 82,-8 C96,-18 104,0 122,-6 C138,-12 150,-2 168,-8" fill="none" stroke={NAVY} strokeWidth={1.4} opacity={0.85} />
        <line x1={0} y1={8} x2={210} y2={8} stroke={NAVY} strokeWidth={0.8} />
        <text y={24} fontFamily={SANS} fontSize={11} fill={NAVY} fontWeight={600}>Programme Director</text>
        <text y={38} fontFamily={SANS} fontSize={9.5} fill={NAVY} opacity={0.6}>Jahez Digital Maturity Programme</text>
      </g>
      <g transform="translate(330, 674)">
        <path d="M0,-4 C14,-18 22,-2 34,-12 C46,-22 52,-4 66,-10 C80,-16 88,-2 104,-8" fill="none" stroke={NAVY} strokeWidth={1.4} opacity={0.85} />
        <line x1={0} y1={8} x2={190} y2={8} stroke={NAVY} strokeWidth={0.8} />
        <text y={24} fontFamily={SANS} fontSize={11} fill={NAVY} fontWeight={600}>Lead Assessor</text>
        <text y={38} fontFamily={SANS} fontSize={9.5} fill={NAVY} opacity={0.6}>Evidence review & inspection</text>
      </g>

      <g transform={`translate(${cx + 90} 674) scale(0.84) translate(${-(cx + 90)} -674)`}>
        <Seal cx={cx + 90} cy={674} tier={tier} color={t.color} />
      </g>

      <g transform={`translate(${CERT_W - 300}, 626)`}>
        <g transform="translate(0,-4)"><PseudoQr seed={certificateNo} size={86} /></g>
        <text x={100} y={14} fontFamily={SANS} fontSize={8} letterSpacing={1.4} fill={NAVY} opacity={0.55} fontWeight={700}>STATUS</text>
        <text x={100} y={31} fontFamily={SANS} fontSize={11} fill={statusColor} fontWeight={700}>{statusLabel}</text>
        {status === "provisional" ? <text x={100} y={43} fontFamily={SANS} fontSize={8.5} fill={NAVY} opacity={0.65}>Pending evidence review</text> : null}
        <text x={100} y={58} fontFamily={SANS} fontSize={8} letterSpacing={1.4} fill={NAVY} opacity={0.55} fontWeight={700}>VERIFY</text>
        <text x={100} y={71} fontFamily={SANS} fontSize={10} fill={NAVY}>jahez.demo/verify</text>
        <text x={100} y={84} fontFamily={SANS} fontSize={9} fill={NAVY} opacity={0.7}>Ref. {certificateNo}</text>
      </g>

      {/* Mandatory demonstration notice — part of every export */}
      <text x={cx} y={CERT_H - 35} textAnchor="middle" fontFamily={SANS} fontSize={8.5} letterSpacing={1.2} fill="#8A6A1F">
        SPECIMEN · DEMONSTRATION CERTIFICATE GENERATED BY THE JAHEZ DEMO — NOT AN OFFICIAL MINISTRY OF INDUSTRY DOCUMENT OR AUTHORISATION
      </text>

      {status === "locked" ? (
        <g>
          <rect width={CERT_W} height={CERT_H} fill={PAPER} opacity={0.55} />
          <g transform={`translate(${cx}, ${CERT_H / 2}) rotate(-14)`}>
            <rect x={-250} y={-36} width={500} height={72} fill="none" stroke="#64748B" strokeWidth={3} rx={6} />
            <text y={14} textAnchor="middle" fontFamily={SANS} fontSize={34} letterSpacing={6} fill="#64748B" fontWeight={800}>NOT YET ACHIEVED</text>
          </g>
        </g>
      ) : null}
    </svg>
  );
});
