"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState } from "react";
import { FACTORIES } from "@/lib/data/factories";
import { SOLUTIONS } from "@/lib/data/solutions";
import { REQUIREMENTS } from "@/lib/data/tiers";
import type {
  AppNotification, Assessment, ComplianceDoc, Deployment, FactoryId, FactoryState,
  Locale, SiteBoundary, SolutionId, TierLevel, WebsiteContent,
} from "@/lib/types";

export const deploymentKey = (f: FactoryId, s: SolutionId) => `${f}:${s}`;

const initialFactoryState = (id: FactoryId): FactoryState => ({
  completedRequirements: [...FACTORIES[id].baselineRequirements],
  unlockedSolutions: [],
  acknowledgedAlerts: [],
  scheduledMaintenance: [],
});

interface JahezState {
  activeFactoryId: FactoryId;
  locale: Locale;
  factories: Record<FactoryId, FactoryState>;
  deployments: Record<string, Deployment>;
  notifications: AppNotification[];

  setActiveFactory: (id: FactoryId) => void;
  setLocale: (l: Locale) => void;
  updateFactory: (id: FactoryId, patch: Partial<FactoryState>) => void;
  setAssessment: (id: FactoryId, a: Assessment) => void;
  setWebsite: (id: FactoryId, w: WebsiteContent) => void;
  setComplianceDocs: (id: FactoryId, docs: ComplianceDoc[]) => void;
  updateComplianceDoc: (id: FactoryId, docId: string, patch: Partial<ComplianceDoc>) => void;
  setSiteBoundary: (id: FactoryId, b: SiteBoundary | undefined) => void;
  acknowledgeAlert: (id: FactoryId, alertId: string) => void;
  scheduleMaintenance: (id: FactoryId, item: { machineId: string; date: string; note: string }) => void;

  startDeployment: (f: FactoryId, s: SolutionId) => void;
  /** Called by the global ticker when elapsed >= duration. */
  completeDeployment: (f: FactoryId, s: SolutionId) => void;
  markDeploymentNotified: (f: FactoryId, s: SolutionId) => void;

  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: (f: FactoryId) => void;
  resetDemo: () => void;
}

const initial = () => ({
  activeFactoryId: "al-noor" as FactoryId,
  locale: "en" as Locale,
  factories: { "al-noor": initialFactoryState("al-noor"), delta: initialFactoryState("delta") },
  deployments: {} as Record<string, Deployment>,
  notifications: [] as AppNotification[],
});

export const useJahez = create<JahezState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setActiveFactory: (id) => set({ activeFactoryId: id }),
      setLocale: (locale) => set({ locale }),
      updateFactory: (id, patch) => set((s) => ({ factories: { ...s.factories, [id]: { ...s.factories[id], ...patch } } })),
      setAssessment: (id, assessment) => get().updateFactory(id, { assessment }),
      setWebsite: (id, website) => get().updateFactory(id, { website }),
      setComplianceDocs: (id, complianceDocs) => get().updateFactory(id, { complianceDocs }),
      updateComplianceDoc: (id, docId, patch) => {
        const docs = get().factories[id].complianceDocs ?? [];
        get().updateFactory(id, { complianceDocs: docs.map((d) => (d.id === docId ? { ...d, ...patch, updatedAt: Date.now() } : d)) });
      },
      setSiteBoundary: (id, siteBoundary) => get().updateFactory(id, { siteBoundary }),
      acknowledgeAlert: (id, alertId) => {
        const f = get().factories[id];
        if (!f.acknowledgedAlerts.includes(alertId)) get().updateFactory(id, { acknowledgedAlerts: [...f.acknowledgedAlerts, alertId] });
      },
      scheduleMaintenance: (id, item) => {
        const f = get().factories[id];
        get().updateFactory(id, { scheduledMaintenance: [...f.scheduledMaintenance.filter((x) => x.machineId !== item.machineId), item] });
      },

      startDeployment: (f, s) => {
        const key = deploymentKey(f, s);
        const existing = get().deployments[key];
        if (existing) return;
        set((st) => ({ deployments: { ...st.deployments, [key]: { factoryId: f, solutionId: s, startedAt: Date.now(), status: "running" } } }));
      },
      completeDeployment: (f, s) => {
        const key = deploymentKey(f, s);
        const dep = get().deployments[key];
        if (!dep || dep.status === "completed") return;
        const fs = get().factories[f];
        const before = computeTier(fs.completedRequirements);
        const reqs = Array.from(new Set([...fs.completedRequirements, ...SOLUTIONS[s].satisfies]));
        set((st) => ({
          deployments: { ...st.deployments, [key]: { ...dep, status: "completed", completedAt: Date.now() } },
          factories: { ...st.factories, [f]: { ...fs, completedRequirements: reqs, unlockedSolutions: Array.from(new Set([...fs.unlockedSolutions, s])) } },
        }));
        get().pushNotification({ factoryId: f, kind: "deployment", title: `${SOLUTIONS[s].name} deployed`, body: "Your AI-built solution is live and ready to explore.", href: SOLUTIONS[s].route });
        const after = computeTier(reqs);
        if (after > before) get().pushNotification({ factoryId: f, kind: "tier", title: `Tier ${after} requirements met`, body: "Provisional — ready for evidence review and inspection (demo).", href: "/dashboard" });
      },
      markDeploymentNotified: (f, s) => {
        const key = deploymentKey(f, s);
        const dep = get().deployments[key];
        if (dep) set((st) => ({ deployments: { ...st.deployments, [key]: { ...dep, notified: true } } }));
      },

      pushNotification: (n) =>
        set((s) => ({ notifications: [{ ...n, id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, createdAt: Date.now(), read: false }, ...s.notifications].slice(0, 40) })),
      markAllRead: (f) => set((s) => ({ notifications: s.notifications.map((n) => (n.factoryId === f ? { ...n, read: true } : n)) })),
      resetDemo: () => set({ ...initial() }),
    }),
    { name: "jahez-demo-v1", storage: createJSONStorage(() => localStorage), version: 1 }
  )
);

// ---------- Derived helpers ----------

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

/** Progress (0-1) toward the next tier above the current one. */
export function nextTierProgress(completed: string[]) {
  const current = computeTier(completed);
  if (current === 4) return { current, next: null as TierLevel | null, done: 0, total: 0, ratio: 1 };
  const next = (current + 1) as TierLevel;
  const reqs = REQUIREMENTS.filter((r) => r.tier === next);
  const done = reqs.filter((r) => completed.includes(r.id)).length;
  return { current, next, done, total: reqs.length, ratio: done / reqs.length };
}

/** Overall digital maturity score 0-100 (weighted by tier). */
export function maturityScore(completed: string[]) {
  const weights = { 1: 1, 2: 1.2, 3: 1.4, 4: 1.6 } as const;
  let got = 0, total = 0;
  for (const r of REQUIREMENTS) {
    total += weights[r.tier];
    if (completed.includes(r.id)) got += weights[r.tier];
  }
  return Math.round((got / total) * 100);
}

/** True once zustand has rehydrated from localStorage — gate persisted UI on this to avoid hydration mismatch. */
export function useHydrated() {
  const [h, setH] = useState(false);
  useEffect(() => {
    const unsub = useJahez.persist.onFinishHydration(() => setH(true));
    if (useJahez.persist.hasHydrated()) setH(true);
    return unsub;
  }, []);
  return h;
}

/** Convenience: active factory profile + state. */
export function useActiveFactory() {
  const id = useJahez((s) => s.activeFactoryId);
  const state = useJahez((s) => s.factories[s.activeFactoryId]);
  return { id, factory: FACTORIES[id], state, tier: computeTier(state.completedRequirements) };
}

/** Deployment progress for a solution, derived from wall clock so it survives refresh/navigation. */
export function deploymentProgress(dep: Deployment | undefined, now: number) {
  if (!dep) return { elapsed: 0, ratio: 0, running: false, done: false };
  const dur = SOLUTIONS[dep.solutionId].durationSeconds;
  const elapsed = dep.status === "completed" ? dur : Math.min(dur, (now - dep.startedAt) / 1000);
  return { elapsed, ratio: elapsed / dur, running: dep.status === "running", done: dep.status === "completed" };
}

/** Re-render every `ms` — used for live deployment progress. */
export function useNow(ms = 500) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}
