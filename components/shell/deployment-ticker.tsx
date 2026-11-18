"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { SOLUTIONS } from "@/lib/data/solutions";
import { FACTORIES } from "@/lib/data/factories";
import { useJahez, useHydrated } from "@/lib/store";

/**
 * Global simulated-deployment engine. Mounted once in the root layout so deployments
 * continue while the presenter navigates anywhere in the app, and resume after refresh
 * (progress is derived from the persisted start timestamp).
 */
export function DeploymentTicker() {
  const hydrated = useHydrated();
  const router = useRouter();

  useEffect(() => {
    if (!hydrated) return;
    const tick = () => {
      const { deployments, completeDeployment, markDeploymentNotified, setActiveFactory } = useJahez.getState();
      for (const dep of Object.values(deployments)) {
        const sol = SOLUTIONS[dep.solutionId];
        if (dep.status === "running" && Date.now() - dep.startedAt >= sol.durationSeconds * 1000) {
          completeDeployment(dep.factoryId, dep.solutionId);
        }
        const latest = useJahez.getState().deployments[`${dep.factoryId}:${dep.solutionId}`];
        if (latest?.status === "completed" && !latest.notified) {
          markDeploymentNotified(dep.factoryId, dep.solutionId);
          toast.success(`${sol.name} is live`, {
            description: `Deployed for ${FACTORIES[dep.factoryId].name}. Open it to explore and edit.`,
            duration: 9000,
            action: {
              label: "Open",
              onClick: () => {
                setActiveFactory(dep.factoryId);
                router.push(sol.route);
              },
            },
          });
        }
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [hydrated, router]);

  return null;
}
