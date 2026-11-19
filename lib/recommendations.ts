// Deterministic service recommendation engine (JZ-023). Pure functions — no AI calls.
import { SERVICE_LIST } from "@/lib/data/services";
import type { Factory, FactoryState, ServiceDefinition, ServiceId, TierLevel } from "@/lib/types";
import { computeTier } from "@/lib/tier";

/** Curated recommendations for the two demo accounts (Phase 2 brief, section 7). */
const CURATED: Partial<Record<string, ServiceId[]>> = {
  "al-noor": ["brand-identity", "export-marketing", "sales-chatbot", "corporate-strategy"],
  delta: ["enterprise-bi", "process-mining", "bsc-design", "export-intelligence", "product-compliance", "traceability"],
};

export interface ServiceRecommendation {
  service: ServiceDefinition;
  score: number; // 0-100
  recommended: boolean;
  /** Factory tier meets the service's recommended tier. */
  ready: boolean;
  installed: boolean;
  reasons: string[];
  /** Preparation steps when not yet ready. */
  gaps: string[];
}

const EXPORT_SERVICES: ServiceId[] = ["export-marketing", "export-intelligence", "export-documentation", "traceability", "product-compliance", "technical-file"];

const SYSTEM_SIGNALS: { match: RegExp; services: ServiceId[]; reason: string }[] = [
  { match: /crm|customer/i, services: ["crm-pipeline", "sales-chatbot"], reason: "No CRM in place — enquiries are hard to track" },
  { match: /hr|payroll|attendance/i, services: ["hr-analytics", "talent-workforce"], reason: "HR records are manual or partial" },
  { match: /erp|mes|production/i, services: ["process-mining", "enterprise-bi"], reason: "Operational systems generate usable event data" },
  { match: /website|online|social/i, services: ["brand-identity", "brand-audit", "export-marketing"], reason: "Limited digital presence" },
  { match: /qms|iso|quality/i, services: ["product-compliance", "technical-file"], reason: "Quality system can anchor certification work" },
];

export function recommendServices(factory: Factory, state: Pick<FactoryState, "completedRequirements" | "installedServices">): ServiceRecommendation[] {
  const tier: TierLevel = computeTier(state.completedRequirements);
  const industry = `${factory.industry} ${factory.products.join(" ")}`.toLowerCase();
  const objectives = factory.objectives ?? [];
  const exportStatus = factory.exportStatus ?? "none";
  const curated = CURATED[factory.id];

  const recs = SERVICE_LIST.map((service) => {
    const reasons: string[] = [];
    let score = 30;

    const industryHit = service.recommendedIndustries.find((k) => k !== "all" && industry.includes(k));
    if (industryHit) { score += 15; reasons.push(`Strong fit for ${factory.industry.toLowerCase()}`); }
    else if (service.recommendedIndustries.includes("all")) score += 6;

    const objHits = service.objectives.filter((o) => objectives.includes(o));
    if (objHits.length) { score += Math.min(24, objHits.length * 12); reasons.push(`Supports your objective${objHits.length > 1 ? "s" : ""}: ${objHits.map(labelObjective).join(", ")}`); }

    const tierGap = service.recommendedTier - tier;
    if (tierGap <= 0) { score += 14; if (tierGap === 0) reasons.push(`Designed for Tier ${tier} factories`); }
    else if (tierGap === 1) { score -= 4; }
    else score -= 18 * (tierGap - 1);

    if (EXPORT_SERVICES.includes(service.id)) {
      if (exportStatus === "exploring" || exportStatus === "occasional") { score += 12; reasons.push("You are building export activity"); }
      else if (exportStatus === "regular") { score += 8; reasons.push("Supports your existing exports"); }
    }

    for (const sig of SYSTEM_SIGNALS) {
      if (!sig.services.includes(service.id)) continue;
      const sys = factory.systems.find((x) => sig.match.test(x.name));
      if (sys && sys.status !== "active" && !/erp|mes|production|qms|iso|quality/i.test(sys.name)) { score += 8; reasons.push(sig.reason); }
      if (sys && sys.status === "active" && /erp|mes|production|qms|iso|quality/i.test(sys.name)) { score += 8; reasons.push(sig.reason); }
    }

    const pinned = curated?.includes(service.id) ?? false;
    if (pinned) { score += 30; reasons.unshift(`Recommended for ${factory.name}'s current roadmap`); }

    const installed = state.installedServices.includes(service.id);
    const ready = tierGap <= 0;
    return {
      service,
      score: Math.max(5, Math.min(99, Math.round(score))),
      recommended: false as boolean,
      ready,
      installed,
      reasons: Array.from(new Set(reasons)).slice(0, 3),
      gaps: ready ? [] : [`Reach Tier ${service.recommendedTier} (currently Tier ${tier})`, ...service.preparationSteps],
    } satisfies ServiceRecommendation;
  });

  if (curated) {
    for (const r of recs) r.recommended = curated.includes(r.service.id);
  } else {
    const top = [...recs].filter((r) => r.service.recommendedTier <= tier + 1).sort((a, b) => b.score - a.score).slice(0, 6);
    for (const r of top) r.recommended = true;
  }
  return recs.sort((a, b) => Number(b.recommended) - Number(a.recommended) || b.score - a.score || a.service.number - b.service.number);
}

export const OBJECTIVE_LABELS: Record<NonNullable<Factory["objectives"]>[number], string> = {
  "grow-local-sales": "Grow local sales",
  "start-exporting": "Start exporting",
  "grow-exports": "Grow exports",
  "reduce-costs": "Reduce costs",
  "improve-quality": "Improve quality",
  certification: "Obtain certifications",
  "digitalise-operations": "Digitalise operations",
  "access-finance": "Access finance & incentives",
};

export function labelObjective(o: NonNullable<Factory["objectives"]>[number]) {
  return OBJECTIVE_LABELS[o].toLowerCase();
}
