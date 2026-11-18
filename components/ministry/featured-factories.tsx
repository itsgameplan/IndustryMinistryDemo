"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AlertTriangle, ArrowUpRight, Lightbulb, SearchX, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui";
import { TierBadge } from "@/components/shell/shared";
import type { VerificationView } from "@/components/ministry/verification-certificate";
import { governorateById, sectorById, type LicenceStatus, type PolicyInsight } from "@/lib/data/national";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<LicenceStatus, "green" | "amber" | "red"> = { valid: "green", expired: "amber", suspended: "red" };
const STATUS_LABEL: Record<LicenceStatus, string> = { valid: "Valid", expired: "Expired", suspended: "Suspended" };

export function FeaturedFactoriesTable({ views }: { views: VerificationView[] }) {
  const router = useRouter();
  if (!views.length) {
    return (
      <div className="bg-grid flex flex-col items-center rounded-xl border border-dashed border-line px-6 py-10 text-center">
        <SearchX className="size-5 text-muted" />
        <p className="mt-2 text-sm font-medium text-navy-900">No featured factories match these filters</p>
        <p className="mt-0.5 text-xs text-muted">Clear a filter to see the full featured list.</p>
      </div>
    );
  }
  return (
    <div className="-mx-5 overflow-x-auto scrollbar-thin">
      <table className="w-full min-w-[640px] text-sm">
        <caption className="sr-only">Featured factories with licence status and Jahez maturity tier. Select a row to open its verification certificate.</caption>
        <thead>
          <tr className="border-y border-line bg-canvas/60 text-left text-[10px] font-semibold uppercase tracking-wider text-muted">
            <th scope="col" className="px-5 py-2.5">Factory</th>
            <th scope="col" className="px-3 py-2.5">Governorate</th>
            <th scope="col" className="px-3 py-2.5">Tier</th>
            <th scope="col" className="px-3 py-2.5">Score</th>
            <th scope="col" className="px-3 py-2.5">Licence</th>
            <th scope="col" className="px-5 py-2.5 text-right"><span className="sr-only">Verify</span></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {views.map((v, i) => {
            const href = `/verify?id=${encodeURIComponent(v.record.licenseNo)}`;
            return (
              <motion.tr
                key={v.record.licenseNo}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => router.push(href)}
                className={cn("group cursor-pointer transition-colors hover:bg-canvas", v.record.live && "bg-teal-50/40")}
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-navy-900">{v.record.name}</span>
                    {v.record.live ? (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-teal-500 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">
                        <span className="size-1 animate-pulse rounded-full bg-white" /> Live
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{sectorById(v.record.sector).name} · <span className="font-mono">{v.record.licenseNo}</span></div>
                </td>
                <td className="px-3 py-3 text-navy-700">{governorateById(v.record.governorateId)?.name}</td>
                <td className="px-3 py-3">
                  <div className="flex flex-col items-start gap-1">
                    <TierBadge tier={v.tier} size="sm" />
                    {v.attestation === "provisional" ? <span className="text-[10px] font-medium text-gold-600">Provisional</span> : null}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-7 text-right font-semibold tabular-nums text-navy-900">{v.score}</span>
                    <span className="h-1.5 w-16 overflow-hidden rounded-full bg-navy-900/[0.06]" aria-hidden>
                      <span className="block h-full rounded-full bg-teal-500 transition-[width] duration-500" style={{ width: `${v.score}%` }} />
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3"><Badge tone={STATUS_TONE[v.record.status]}>{STATUS_LABEL[v.record.status]}</Badge></td>
                <td className="px-5 py-3 text-right">
                  <Link href={href} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-teal-700 transition hover:bg-teal-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
                    Verify <ArrowUpRight className="size-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                  </Link>
                </td>
              </motion.tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

const SEVERITY: Record<PolicyInsight["severity"], { label: string; icon: React.ReactNode; className: string }> = {
  risk: { label: "Gap", icon: <AlertTriangle />, className: "bg-red-50 text-red-700" },
  watch: { label: "Watch", icon: <Lightbulb />, className: "bg-amber-50 text-amber-700" },
  opportunity: { label: "Opportunity", icon: <TrendingUp />, className: "bg-teal-50 text-teal-700" },
};

export function InsightCard({ insight, index, active, onApply }: { insight: PolicyInsight; index: number; active: boolean; onApply: () => void }) {
  const sev = SEVERITY[insight.severity];
  return (
    <motion.li
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 + index * 0.08 }}
      className={cn("rounded-xl border bg-white/[0.04] p-3.5 transition", active ? "border-gold-400/70 bg-white/[0.08]" : "border-white/10 hover:border-white/20")}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold [&_svg]:size-3", sev.className)}>{sev.icon}{sev.label}</span>
        <button type="button" onClick={onApply} className="rounded-md px-1.5 py-0.5 text-[11px] font-medium text-teal-300 transition hover:bg-white/10 hover:text-teal-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400">
          {active ? "Focused" : "Focus view →"}
        </button>
      </div>
      <h3 className="mt-2 text-[13px] font-semibold leading-snug text-white">{insight.title}</h3>
      <p className="mt-1 text-xs leading-relaxed text-white/65">{insight.body}</p>
    </motion.li>
  );
}
