"use client";

import { SolutionGate } from "@/components/shell/shared";
import { ComplianceWorkspace } from "@/components/solutions/compliance/compliance-workspace";

export default function CompliancePage() {
  return (
    <SolutionGate solutionId="compliance">
      <ComplianceWorkspace />
    </SolutionGate>
  );
}
