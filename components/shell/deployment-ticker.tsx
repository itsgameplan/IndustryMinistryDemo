"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { deployableDuration, deployableRoute } from "@/lib/data/deployables";
import { SERVICES, isServiceId } from "@/lib/data/services";
import { SOLUTIONS } from "@/lib/data/solutions";
import { getFactoryProfile, useJahez, useHydrated } from "@/lib/store";
import { useLocale, useT } from "@/lib/i18n";
import { localName, serviceTitle } from "@/lib/utils";

/** BroadcastChannel name used by /reset to make other open tabs reload. */
export const RESET_CHANNEL = "jahez-reset";

/**
 * Global simulated-deployment engine. Mounted once in the root layout so deployments
 * (flagship solutions and IMC services) continue while the presenter navigates anywhere,
 * and resume after refresh (progress is derived from the persisted start timestamp).
 */
export function DeploymentTicker() {
  const hydrated = useHydrated();
  const router = useRouter();
  const t = useT();
  const { locale } = useLocale();

  // When the demo is reset from another tab (/reset or npm run demo:reset), reload so stale
  // in-memory state is not written back to storage.
  useEffect(() => {
    if (typeof BroadcastChannel === "undefined") return;
    const ch = new BroadcastChannel(RESET_CHANNEL);
    ch.onmessage = () => {
      // The /reset page broadcasts this itself; only *other* tabs should reload.
      if (window.location.pathname === "/reset") return;
      try {
        // sessionStorage is per tab, so each tab clears its own Jahez keys (e.g. the sign-up draft).
        Object.keys(window.sessionStorage).filter((k) => k.startsWith("jahez")).forEach((k) => window.sessionStorage.removeItem(k));
      } catch {
        /* storage unavailable */
      }
      window.location.reload();
    };
    return () => ch.close();
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const { deployments, completeDeployment, completeSystemBuild, markDeploymentNotified, setActiveFactory } = useJahez.getState();
      for (const [factoryId, factoryState] of Object.entries(useJahez.getState().factories)) {
        for (const [name, build] of Object.entries(factoryState.systemBuilds ?? {})) {
          if (build.status === "running" && Date.now() - build.startedAt >= 12000) completeSystemBuild(factoryId as import("@/lib/types").FactoryId, name);
        }
      }
      for (const dep of Object.values(deployments)) {
        if (!useJahez.getState().factories[dep.factoryId]) continue;
        if (dep.status === "running" && Date.now() - dep.startedAt >= deployableDuration(dep.solutionId) * 1000) {
          completeDeployment(dep.factoryId, dep.solutionId);
        }
        const latest = useJahez.getState().deployments[`${dep.factoryId}:${dep.solutionId}`];
        if (latest?.status === "completed" && !latest.notified) {
          markDeploymentNotified(dep.factoryId, dep.solutionId);
          const service = isServiceId(dep.solutionId);
          const name = isServiceId(dep.solutionId) ? serviceTitle(SERVICES[dep.solutionId], locale) : localName(SOLUTIONS[dep.solutionId], locale);
          const factoryName = localName(getFactoryProfile(dep.factoryId), locale);
          toast.success(t(service ? "{name} is ready" : "{name} is live", { name }), {
            description: service ? t("Workspace prepared for {factory}. Open it to explore.", { factory: factoryName }) : t("Deployed for {factory}. Open it to explore and edit.", { factory: factoryName }),
            duration: 9000,
            action: {
              label: t("Open||action"),
              onClick: () => {
                setActiveFactory(dep.factoryId);
                router.push(deployableRoute(dep.solutionId));
              },
            },
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hydrated, router, t, locale]);

  return null;
}
