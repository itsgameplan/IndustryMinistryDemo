"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { useEffect, useState, useSyncExternalStore } from "react";
import { FACTORIES, FACTORY_IDS } from "@/lib/data/factories";
import { SOLUTIONS } from "@/lib/data/solutions";
import { SERVICES, isServiceId } from "@/lib/data/services";
import { deployableDuration } from "@/lib/data/deployables";
import { REQUIREMENTS } from "@/lib/data/tiers";
import { computeTier } from "@/lib/tier";
import type {
  AppNotification, Assessment, ComplianceDoc, DemoFactoryId, DeployableId, Deployment, Factory, FactoryId, FactoryState,
  Locale, ServiceId, ServiceRequest, SiteBoundary, TierLevel, WebsiteContent,
} from "@/lib/types";

export { computeTier };

export const deploymentKey = (f: FactoryId, s: DeployableId) => `${f}:${s}`;

const emptyFactoryState = (completedRequirements: string[]): FactoryState => ({
  completedRequirements: [...completedRequirements],
  unlockedSolutions: [],
  systemBuilds: {},
  acknowledgedAlerts: [],
  scheduledMaintenance: [],
  installedServices: [],
  serviceData: {},
  serviceRequests: [],
});

const initialFactoryState = (id: DemoFactoryId): FactoryState => emptyFactoryState(FACTORIES[id].baselineRequirements);

interface JahezState {
  activeFactoryId: FactoryId;
  locale: Locale;
  factories: Record<FactoryId, FactoryState>;
  /** Factories created through the simulated sign-up. */
  registeredFactories: Partial<Record<FactoryId, Factory>>;
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

  /** Simulated sign-up: creates the factory, makes it active and posts a welcome notification. */
  registerFactory: (profile: Factory, init: { completedRequirements: string[]; assessment: Assessment }) => void;
  /** Persist a service workspace's editable output. */
  setServiceData: (id: FactoryId, serviceId: ServiceId, data: unknown) => void;
  requestService: (id: FactoryId, req: Omit<ServiceRequest, "id" | "createdAt" | "status">) => ServiceRequest;

  startDeployment: (f: FactoryId, s: DeployableId) => void;
  startSystemBuild: (f: FactoryId, name: string) => void;
  completeSystemBuild: (f: FactoryId, name: string) => void;
  /** Called by the global ticker when elapsed >= duration. */
  completeDeployment: (f: FactoryId, s: DeployableId) => void;
  markDeploymentNotified: (f: FactoryId, s: DeployableId) => void;

  pushNotification: (n: Omit<AppNotification, "id" | "createdAt" | "read">) => void;
  markAllRead: (f: FactoryId) => void;
  resetDemo: () => void;
}

const initial = () => ({
  activeFactoryId: "al-noor" as FactoryId,
  locale: "en" as Locale,
  factories: { "al-noor": initialFactoryState("al-noor"), delta: initialFactoryState("delta") } as Record<FactoryId, FactoryState>,
  registeredFactories: {} as Partial<Record<FactoryId, Factory>>,
  deployments: {} as Record<string, Deployment>,
  notifications: [] as AppNotification[],
});

const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

export const useJahez = create<JahezState>()(
  persist(
    (set, get) => ({
      ...initial(),
      setActiveFactory: (id) => set({ activeFactoryId: id }),
      setLocale: (locale) => set({ locale }),
      updateFactory: (id, patch) => set((s) => ({ factories: { ...s.factories, [id]: { ...(s.factories[id] ?? emptyFactoryState([])), ...patch } } })),
      setAssessment: (id, assessment) => get().updateFactory(id, { assessment }),
      setWebsite: (id, website) => get().updateFactory(id, { website }),
      setComplianceDocs: (id, complianceDocs) => get().updateFactory(id, { complianceDocs }),
      updateComplianceDoc: (id, docId, patch) => {
        const docs = get().factories[id]?.complianceDocs ?? [];
        get().updateFactory(id, { complianceDocs: docs.map((d) => (d.id === docId ? { ...d, ...patch, updatedAt: Date.now() } : d)) });
      },
      setSiteBoundary: (id, siteBoundary) => get().updateFactory(id, { siteBoundary }),
      acknowledgeAlert: (id, alertId) => {
        const f = get().factories[id];
        if (f && !f.acknowledgedAlerts.includes(alertId)) get().updateFactory(id, { acknowledgedAlerts: [...f.acknowledgedAlerts, alertId] });
      },
      scheduleMaintenance: (id, item) => {
        const f = get().factories[id];
        if (f) get().updateFactory(id, { scheduledMaintenance: [...f.scheduledMaintenance.filter((x) => x.machineId !== item.machineId), item] });
      },

      registerFactory: (profile, init) => {
        set((s) => ({
          registeredFactories: { ...s.registeredFactories, [profile.id]: profile },
          factories: { ...s.factories, [profile.id]: { ...emptyFactoryState(init.completedRequirements), assessment: init.assessment } },
          activeFactoryId: profile.id,
        }));
        get().pushNotification({
          factoryId: profile.id,
          kind: "info",
          title: `Welcome to Jahez, ${profile.owner.name.split(" ")[0]}`,
          body: `Your proposed maturity tier is Tier ${init.assessment.provisionalTier} (unverified). Explore your roadmap and recommended services.`,
          href: "/services",
        });
      },
      setServiceData: (id, serviceId, data) => {
        const f = get().factories[id];
        if (f) get().updateFactory(id, { serviceData: { ...f.serviceData, [serviceId]: data } });
      },
      requestService: (id, req) => {
        const full: ServiceRequest = { ...req, id: uid(), createdAt: Date.now(), status: "submitted" };
        const f = get().factories[id];
        if (f) get().updateFactory(id, { serviceRequests: [full, ...f.serviceRequests] });
        get().pushNotification({ factoryId: id, kind: "info", title: "Service request submitted", body: `${req.title} — a Jahez advisor would follow up (simulated).`, href: "/services?tab=requests" });
        return full;
      },

      startDeployment: (f, s) => {
        const key = deploymentKey(f, s);
        if (get().deployments[key]) return;
        set((st) => ({ deployments: { ...st.deployments, [key]: { factoryId: f, solutionId: s, startedAt: Date.now(), status: "running" } } }));
      },
      startSystemBuild: (f, name) => {
        const fs = get().factories[f];
        if (!fs || fs.systemBuilds?.[name] || !getFactoryProfile(f).systems.some((system) => system.name === name)) return;
        get().updateFactory(f, { systemBuilds: { ...fs.systemBuilds, [name]: { startedAt: Date.now(), status: "running" } } });
      },
      completeSystemBuild: (f, name) => {
        const fs = get().factories[f];
        const build = fs?.systemBuilds?.[name];
        if (!fs || !build || build.status === "completed") return;
        get().updateFactory(f, { systemBuilds: { ...fs.systemBuilds, [name]: { ...build, status: "completed" } } });
        get().pushNotification({ factoryId: f, kind: "deployment", title: `${name} is ready`, body: "Your simulated system workspace is available.", href: `/systems/${encodeURIComponent(name)}` });
      },
      completeDeployment: (f, s) => {
        const key = deploymentKey(f, s);
        const dep = get().deployments[key];
        const fs = get().factories[f];
        if (!dep || dep.status === "completed" || !fs) return;

        if (isServiceId(s)) {
          // IMC services never change the maturity tier — tiers require verified evidence.
          set((st) => ({
            deployments: { ...st.deployments, [key]: { ...dep, status: "completed", completedAt: Date.now() } },
            factories: { ...st.factories, [f]: { ...fs, installedServices: Array.from(new Set([...fs.installedServices, s])) } },
          }));
          get().pushNotification({ factoryId: f, kind: "service", title: `${SERVICES[s].name} is ready`, body: "Your simulated AI workspace has been prepared and is ready to explore.", href: SERVICES[s].route });
          return;
        }

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
        set((s) => ({ notifications: [{ ...n, id: uid(), createdAt: Date.now(), read: false }, ...s.notifications].slice(0, 60) })),
      markAllRead: (f) => set((s) => ({ notifications: s.notifications.map((n) => (n.factoryId === f ? { ...n, read: true } : n)) })),
      resetDemo: () => set({ ...initial() }),
    }),
    {
      name: "jahez-demo-v1",
      storage: createJSONStorage(() => localStorage),
      version: 2,
      // v1 → v2: add service fields to each factory and the registered-factory map.
      migrate: (persisted) => {
        const s = (persisted ?? {}) as Partial<ReturnType<typeof initial>>;
        const factories = { ...(s.factories ?? initial().factories) } as Record<FactoryId, Partial<FactoryState>>;
        for (const id of Object.keys(factories) as FactoryId[]) {
          const f = factories[id];
          factories[id] = { ...emptyFactoryState(f.completedRequirements ?? []), ...f };
        }
        return { ...s, factories, registeredFactories: s.registeredFactories ?? {} } as unknown as JahezState;
      },
    }
  )
);

// ---------- Factory profiles ----------

export const isDemoFactoryId = (id: string): id is DemoFactoryId => (FACTORY_IDS as string[]).includes(id);

/** Non-hook lookup of a factory profile (demo or registered). Falls back to Al Noor. */
export function getFactoryProfile(id: FactoryId): Factory {
  if (isDemoFactoryId(id)) return FACTORIES[id];
  return useJahez.getState().registeredFactories[id] ?? FACTORIES["al-noor"];
}

export function useFactoryProfile(id: FactoryId): Factory {
  const registered = useJahez((s) => (isDemoFactoryId(id) ? undefined : s.registeredFactories[id]));
  return isDemoFactoryId(id) ? FACTORIES[id] : (registered ?? FACTORIES["al-noor"]);
}

/** Demo accounts first, then registered factories (newest last). */
export function useAllFactories(): Factory[] {
  const registered = useJahez((s) => s.registeredFactories);
  const regs = Object.values(registered).filter((f): f is Factory => Boolean(f)).sort((a, b) => (a.registration?.registeredAt ?? 0) - (b.registration?.registeredAt ?? 0));
  return [...FACTORY_IDS.map((id) => FACTORIES[id]), ...regs];
}

// ---------- Derived helpers ----------

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
  return useSyncExternalStore(
    (cb) => useJahez.persist.onFinishHydration(cb),
    () => useJahez.persist.hasHydrated(),
    () => false
  );
}

const FALLBACK_STATE = emptyFactoryState([]);

/** Convenience: active factory profile + state. Falls back to Al Noor if the active id no longer exists. */
export function useActiveFactory() {
  const rawId = useJahez((s) => s.activeFactoryId);
  const exists = useJahez((s) => Boolean(s.factories[s.activeFactoryId]));
  const id: FactoryId = exists ? rawId : "al-noor";
  const state = useJahez((s) => s.factories[id]) ?? FALLBACK_STATE;
  const factory = useFactoryProfile(id);
  return { id, factory, state, tier: computeTier(state.completedRequirements) };
}

/** Deployment progress, derived from wall clock so it survives refresh/navigation. */
export function deploymentProgress(dep: Deployment | undefined, now: number) {
  if (!dep) return { elapsed: 0, ratio: 0, running: false, done: false };
  const dur = deployableDuration(dep.solutionId);
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

// ---------- Notification localisation ----------

type Translate = (text: string, vars?: Record<string, string | number>) => string;

/** Templates used by the store's notifications, matched at render time so persisted state keeps its shape. */
const NOTIFICATION_TEMPLATES: { re: RegExp; key: string; vars: string[]; translateVars?: string[] }[] = [
  { re: /^Welcome to Jahez, (.+)$/, key: "Welcome to Jahez, {name}", vars: ["name"] },
  { re: /^Your proposed maturity tier is Tier (\d) \(unverified\)\. Explore your roadmap and recommended services\.$/, key: "Your proposed maturity tier is Tier {tier} (unverified). Explore your roadmap and recommended services.", vars: ["tier"] },
  { re: /^(.+) — a Jahez advisor would follow up \(simulated\)\.$/, key: "{title} — a Jahez advisor would follow up (simulated).", vars: ["title"], translateVars: ["title"] },
  { re: /^Tier (\d) requirements met$/, key: "Tier {tier} requirements met", vars: ["tier"] },
  { re: /^(.+) is ready$/, key: "{name} is ready", vars: ["name"], translateVars: ["name"] },
  { re: /^(.+) deployed$/, key: "{name} deployed", vars: ["name"], translateVars: ["name"] },
];

/** Translate a stored notification title/body with `t` from `useT()`. */
export function localizeNotificationText(text: string, t: Translate): string {
  const direct = t(text);
  if (direct !== text) return direct;
  for (const tpl of NOTIFICATION_TEMPLATES) {
    const m = tpl.re.exec(text);
    if (!m) continue;
    const vars: Record<string, string> = {};
    tpl.vars.forEach((v, i) => { vars[v] = tpl.translateVars?.includes(v) ? t(m[i + 1]) : m[i + 1]; });
    return t(tpl.key, vars);
  }
  return text;
}
