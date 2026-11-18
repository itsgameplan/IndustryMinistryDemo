"use client";

import { Suspense } from "react";
import { SolutionGate } from "@/components/shell/shared";
import { Skeleton } from "@/components/ui";
import { MaintenanceCommandCenter } from "@/components/solutions/maintenance/command-center";

export default function MaintenancePage() {
  return (
    <SolutionGate solutionId="maintenance">
      <Suspense fallback={<Skeleton className="h-[70vh]" />}>
        <MaintenanceCommandCenter />
      </Suspense>
    </SolutionGate>
  );
}
