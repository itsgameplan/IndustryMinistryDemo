import { REQUIREMENTS } from "@/lib/data/tiers";
import type { TierLevel } from "@/lib/types";

/** Highest tier where every requirement of that tier and all lower tiers is satisfied. */
export function computeTier(completed: string[]): TierLevel {
  const set = new Set(completed);
  let tier: TierLevel = 0;
  for (const t of [1, 2, 3, 4] as const) {
    if (REQUIREMENTS.filter((r) => r.tier === t).every((r) => set.has(r.id))) tier = t;
    else break;
  }
  return tier;
}
