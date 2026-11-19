"use client";

// Product-style illustrations for the AI solutions page. Pure SVG/CSS so they stay crisp,
// load instantly and animate without image assets.
import { motion, useReducedMotion } from "motion/react";
import type { SolutionId } from "@/lib/types";
import { useT } from "@/lib/i18n";

const float = (reduce: boolean | null, delay = 0, y = 8) =>
  reduce ? {} : { animate: { y: [0, -y, 0] }, transition: { duration: 5, repeat: Infinity, ease: "easeInOut" as const, delay } };

function WebsiteVisual() {
  const reduce = useReducedMotion();
  const t = useT();
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_30%_10%,#E0F2FE_0%,#F0FDFA_45%,#FFFFFF_100%)]">
      <motion.div {...float(reduce)} className="relative w-[78%] max-w-[420px]">
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_30px_60px_-20px_rgba(11,31,58,0.35)] ring-1 ring-navy-900/5">
          <div className="flex items-center gap-1.5 border-b border-line px-3 py-2">
            <span className="size-2 rounded-full bg-red-300" /><span className="size-2 rounded-full bg-amber-300" /><span className="size-2 rounded-full bg-emerald-300" />
            <span className="ms-3 h-3 flex-1 rounded-full bg-canvas" />
          </div>
          <div className="relative h-24 bg-gradient-to-br from-navy-800 to-teal-700 p-4">
            <div className="h-2.5 w-28 rounded-full bg-white/90" />
            <div className="mt-2 h-2 w-20 rounded-full bg-white/50" />
            <div className="mt-4 h-5 w-16 rounded-full bg-gold-400" />
            <div className="absolute end-4 top-4 font-arabic text-sm text-white/70" lang="ar">النور</div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="rounded-lg bg-canvas p-2">
                <div className="h-8 rounded-md bg-gradient-to-br from-teal-100 to-sky-100" />
                <div className="mt-1.5 h-1.5 w-3/4 rounded-full bg-navy-900/15" />
              </div>
            ))}
          </div>
        </div>
        <motion.div {...float(reduce, 1.2, 10)} className="absolute -end-6 -top-5 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-navy-900 shadow-lift ring-1 ring-line">
          EN · <span className="font-arabic">عربي</span>
        </motion.div>
        <motion.div {...float(reduce, 0.6, 6)} className="absolute -bottom-4 -start-5 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-[11px] font-semibold text-emerald-700 shadow-lift ring-1 ring-line">
          <span className="size-2 rounded-full bg-emerald-500" /> {t("Published")}
        </motion.div>
      </motion.div>
    </div>
  );
}

function ComplianceVisual() {
  const reduce = useReducedMotion();
  const t = useT();
  const docs = [
    { r: -9, x: -78, label: "Code of Conduct", c: "from-indigo-100" },
    { r: 8, x: 78, label: "HSE Policy", c: "from-amber-100" },
    { r: -2, x: 0, label: "SOP-DY-01", c: "from-teal-100" },
  ];
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_70%_10%,#EEF2FF_0%,#FEFCE8_50%,#FFFFFF_100%)]">
      <div className="relative h-[70%] w-[70%] max-w-[380px]">
        {docs.map((d, i) => (
          <motion.div
            key={d.label}
            initial={reduce ? false : { opacity: 0, y: 20, rotate: 0 }}
            animate={{ opacity: 1, y: 0, rotate: d.r, x: d.x }}
            transition={{ delay: 0.15 * i, type: "spring", stiffness: 120, damping: 16 }}
            className="absolute inset-x-[24%] top-[6%] bottom-[6%] rounded-2xl bg-white p-4 shadow-[0_24px_50px_-18px_rgba(11,31,58,0.35)] ring-1 ring-navy-900/5"
          >
            <div className={`h-10 rounded-xl bg-gradient-to-br ${d.c} to-white`} />
            <div className="mt-3 text-[11px] font-semibold text-navy-900">{t(d.label)}</div>
            {[90, 75, 82, 60].map((w, j) => <div key={j} className="mt-2 h-1.5 rounded-full bg-navy-900/10" style={{ width: `${w}%` }} />)}
            {i === 2 ? (
              <motion.div
                initial={reduce ? false : { scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, type: "spring", stiffness: 260, damping: 14 }}
                className="absolute bottom-4 end-4 grid size-10 place-items-center rounded-full bg-emerald-500 text-white shadow-lift"
              >
                <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth={3}><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
              </motion.div>
            ) : null}
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function MaintenanceVisual() {
  const reduce = useReducedMotion();
  const t = useT();
  const path = "M0,60 C30,58 45,52 70,55 C95,58 110,40 135,44 C160,48 175,30 200,26 C225,22 240,34 260,18 C275,8 290,12 300,6";
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_50%_0%,#1E3A63_0%,#0B1F3A_55%,#050E1F_100%)]">
      <div className="bg-grid-dark absolute inset-0 opacity-60" />
      <motion.div {...float(reduce, 0, 6)} className="relative w-[80%] max-w-[440px] rounded-2xl bg-white/[0.06] p-5 ring-1 ring-white/10 backdrop-blur">
        <div className="flex items-center justify-between text-[11px] text-white/60">
          <span className="font-semibold text-white">CNC-07 · {t("vibration")}</span>
          <span className="rounded-full bg-red-500/20 px-2 py-0.5 font-semibold text-red-300">{t("Failure risk {value}%", { value: 78 })}</span>
        </div>
        <svg viewBox="0 0 300 70" className="mt-4 h-24 w-full overflow-visible">
          <defs>
            <linearGradient id="mv-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#2DBFB0" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#2DBFB0" stopOpacity="0" />
            </linearGradient>
          </defs>
          <line x1="0" x2="300" y1="20" y2="20" stroke="#F87171" strokeDasharray="4 4" strokeWidth="1" opacity="0.7" />
          <path d={`${path} L300,70 L0,70Z`} fill="url(#mv-fill)" />
          <motion.path d={path} fill="none" stroke="#2DBFB0" strokeWidth="2.5" strokeLinecap="round" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 2, ease: "easeInOut" }} />
          <motion.circle cx="300" cy="6" r="4" fill="#F87171" animate={reduce ? undefined : { r: [4, 7, 4], opacity: [1, 0.5, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
        </svg>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[[t("Health"), "44"], [t("RUL"), t("{n} d", { n: 9 })], [t("Temp"), "63°C"]].map(([k, v]) => (
            <div key={k} className="rounded-xl bg-white/[0.06] px-3 py-2 ring-1 ring-white/10">
              <div className="text-[10px] uppercase tracking-wider text-white/45">{k}</div>
              <div className="text-sm font-semibold tabular-nums text-white">{v}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

function MarketplaceVisual() {
  const reduce = useReducedMotion();
  const tiles = ["#0EA5A4", "#6366F1", "#F59E0B", "#EC4899", "#A855F7", "#0284C7", "#14B8A6", "#C9A24B", "#16A34A"];
  return (
    <div className="absolute inset-0 grid place-items-center bg-[radial-gradient(120%_90%_at_50%_0%,#F0FDFA_0%,#FFFFFF_70%)]">
      <div className="grid grid-cols-3 gap-3">
        {tiles.map((c, i) => (
          <motion.span
            key={c}
            initial={reduce ? false : { opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.05 * i, type: "spring", stiffness: 200, damping: 16 }}
            className="size-14 rounded-2xl shadow-card"
            style={{ background: `linear-gradient(135deg, ${c}33, ${c}AA)` }}
          />
        ))}
      </div>
    </div>
  );
}

export function SolutionVisual({ id }: { id: SolutionId | "marketplace" }) {
  if (id === "website") return <WebsiteVisual />;
  if (id === "compliance") return <ComplianceVisual />;
  if (id === "maintenance") return <MaintenanceVisual />;
  return <MarketplaceVisual />;
}
