"use client";

// Service → workspace registry (orchestrator-owned). Each workspace file default-exports a
// component taking WorkspaceProps and lives at components/services/workspaces/<group>/<serviceId>.tsx.
import dynamic from "next/dynamic";
import type { ComponentType } from "react";
import type { ServiceId } from "@/lib/types";
import type { WorkspaceProps } from "./kit";

function WorkspaceLoading() {
  return (
    <div className="space-y-4">
      <div className="h-28 animate-pulse rounded-3xl bg-white" />
      <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-white" />)}</div>
      <div className="h-80 animate-pulse rounded-2xl bg-white" />
    </div>
  );
}

export const WORKSPACES: Record<ServiceId, ComponentType<WorkspaceProps>> = {
  "export-marketing": dynamic(() => import("./workspaces/commercial/export-marketing"), { loading: WorkspaceLoading }),
  "sales-chatbot": dynamic(() => import("./workspaces/commercial/sales-chatbot"), { loading: WorkspaceLoading }),
  "crm-pipeline": dynamic(() => import("./workspaces/commercial/crm-pipeline"), { loading: WorkspaceLoading }),
  "traceability": dynamic(() => import("./workspaces/compliance/traceability"), { loading: WorkspaceLoading }),
  "corporate-strategy": dynamic(() => import("./workspaces/strategy/corporate-strategy"), { loading: WorkspaceLoading }),
  "scenario-planning": dynamic(() => import("./workspaces/strategy/scenario-planning"), { loading: WorkspaceLoading }),
  "process-reengineering": dynamic(() => import("./workspaces/operations/process-reengineering"), { loading: WorkspaceLoading }),
  "process-mining": dynamic(() => import("./workspaces/operations/process-mining"), { loading: WorkspaceLoading }),
  "talent-workforce": dynamic(() => import("./workspaces/people-brand/talent-workforce"), { loading: WorkspaceLoading }),
  "hr-analytics": dynamic(() => import("./workspaces/people-brand/hr-analytics"), { loading: WorkspaceLoading }),
  "brand-identity": dynamic(() => import("./workspaces/people-brand/brand-identity"), { loading: WorkspaceLoading }),
  "brand-audit": dynamic(() => import("./workspaces/people-brand/brand-audit"), { loading: WorkspaceLoading }),
  "export-intelligence": dynamic(() => import("./workspaces/commercial/export-intelligence"), { loading: WorkspaceLoading }),
  "export-documentation": dynamic(() => import("./workspaces/commercial/export-documentation"), { loading: WorkspaceLoading }),
  "enterprise-bi": dynamic(() => import("./workspaces/operations/enterprise-bi"), { loading: WorkspaceLoading }),
  "data-governance": dynamic(() => import("./workspaces/operations/data-governance"), { loading: WorkspaceLoading }),
  "bsc-design": dynamic(() => import("./workspaces/strategy/bsc-design"), { loading: WorkspaceLoading }),
  "bsc-execution": dynamic(() => import("./workspaces/strategy/bsc-execution"), { loading: WorkspaceLoading }),
  "bsc-workshops": dynamic(() => import("./workspaces/strategy/bsc-workshops"), { loading: WorkspaceLoading }),
  "product-compliance": dynamic(() => import("./workspaces/compliance/product-compliance"), { loading: WorkspaceLoading }),
  "technical-file": dynamic(() => import("./workspaces/compliance/technical-file"), { loading: WorkspaceLoading }),
};
