"use client";

import { SolutionGate } from "@/components/shell/shared";
import { WebsiteBuilder } from "@/components/solutions/website/website-builder";

export default function WebsitePage() {
  return (
    <SolutionGate solutionId="website">
      <WebsiteBuilder />
    </SolutionGate>
  );
}
