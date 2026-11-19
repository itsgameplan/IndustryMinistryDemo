// Unified lookup for anything the simulated deployment engine can build:
// the three flagship AI solutions (45 s) and the 21 IMC services (~12 s).
import { SOLUTIONS } from "@/lib/data/solutions";
import { SERVICES, isServiceId } from "@/lib/data/services";
import type { DeployableId, DeploymentLog, DeploymentStage, Factory, ServiceId } from "@/lib/types";
import type { TFunction } from "@/lib/i18n";

export interface DeployScript {
  id: DeployableId;
  kind: "solution" | "service";
  name: string;
  route: string;
  durationSeconds: number;
  stages: DeploymentStage[];
  logs: DeploymentLog[];
}

export const deployableName = (id: DeployableId) => (isServiceId(id) ? SERVICES[id].name : SOLUTIONS[id].name);
export const deployableRoute = (id: DeployableId) => (isServiceId(id) ? SERVICES[id].route : SOLUTIONS[id].route);
export const deployableDuration = (id: DeployableId) => (isServiceId(id) ? SERVICES[id].deploySeconds : SOLUTIONS[id].durationSeconds);

/** Scripted, factory-personalised build sequence for an IMC service. Deterministic. */
export function serviceScript(id: ServiceId, factory: Pick<Factory, "name" | "industry" | "products" | "governorate">): DeployScript {
  const s = SERVICES[id];
  const dur = s.deploySeconds;
  const agents = [...s.buildAgents, { agent: "Release Agent", label: "Publishing workspace" }];
  const slot = dur / agents.length;
  const stages: DeploymentStage[] = agents.map((a, i) => ({ id: `st-${i}`, label: a.label, agent: a.agent, startsAt: Math.round(i * slot * 10) / 10 }));
  const product = factory.products[0] ?? "core products";
  const logs: DeploymentLog[] = [];
  agents.forEach((a, i) => {
    const t0 = i * slot;
    if (i === 0) logs.push({ at: Math.max(0.4, t0 + 0.4), agent: a.agent, message: `Loaded ${factory.name} profile · ${factory.industry}, ${factory.governorate}` });
    else logs.push({ at: t0 + 0.3, agent: a.agent, message: `${a.label}…` });
    if (i === agents.length - 1) return;
    const deliverable = s.demoDeliverables[i % s.demoDeliverables.length];
    logs.push({ at: t0 + slot * 0.55, agent: a.agent, message: i === 1 ? `Personalising outputs for "${product}"` : `Preparing: ${deliverable}` });
    logs.push({ at: t0 + slot * 0.9, agent: a.agent, message: `${a.label} complete`, level: "success" });
  });
  logs.push({ at: dur - 0.6, agent: "Release Agent", message: "Simulated outputs generated from demo data — review before real-world use", level: "warn" });
  logs.push({ at: dur, agent: "Release Agent", message: `${s.name} workspace ready`, level: "success" });
  return { id, kind: "service", name: s.name, route: s.route, durationSeconds: dur, stages, logs };
}

/**
 * Localises a service build log line. Most lines are fixed strings (translated directly via the
 * marketplace dictionary); the two lines that embed factory data are matched and re-templated here.
 */
export function localizeDeployLog(message: string, t: TFunction): string {
  let m = message.match(/^Loaded (.+) profile · (.+), (.+)$/);
  if (m) return t("Loaded {factory} profile · {industry}, {governorate}", { factory: m[1], industry: t(m[2]), governorate: t(m[3]) });
  m = message.match(/^Personalising outputs for "(.+)"$/);
  if (m) return t("Personalising outputs for \"{product}\"", { product: t(m[1]) });
  return t(message);
}

export function getDeployable(id: DeployableId, factory: Pick<Factory, "name" | "industry" | "products" | "governorate">): DeployScript {
  if (isServiceId(id)) return serviceScript(id, factory);
  const sol = SOLUTIONS[id];
  return { id, kind: "solution", name: sol.name, route: sol.route, durationSeconds: sol.durationSeconds, stages: sol.stages, logs: sol.logs };
}
