# JAHEZ — Task board

Phase 1 (JZ-001 – JZ-020) is complete: maturity tiers, assessment, roadmap, three flagship AI solutions (45 s builds), satellite intelligence, 3D digital twin, licence verification, Ministry dashboard, Reset Demo.

## Phase 2 — Industrial competitiveness services & simulated sign-up

| ID | Task | Pri | Owner | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| JZ-021 | Audit & extend architecture; ownership + contracts | P0 | Orchestrator | — | Done |
| JZ-022 | Simulated factory sign-up (`/register`) | P0 | Onboarding agent | 021, 023 | Done |
| JZ-023 | IMC catalogue (21 services, 9 categories), data models, store, recommendations | P0 | Orchestrator (foundation) | 021 | Done |
| JZ-024 | AI Services marketplace (`/services`, `/services/[serviceId]`, dashboards) | P0 | Marketplace agent | 023 | Done |
| JZ-025 | Extend deployment engine to services (≈12 s builds, notifications, persistence) | P0 | Orchestrator (engine) + Marketplace agent (console UI) | 023 | Done |
| JZ-026 | Marketing, sales & export workspaces (services 1, 2, 3, 13, 14) | P0 | Commercial agent | 023 | Done |
| JZ-027 | Strategy & Balanced Scorecard workspaces (5, 6, 17, 18, 19) | P0 | Strategy agent | 023 | Done |
| JZ-028 | Process & data analytics workspaces (7, 8, 15, 16) | P0 | Operations agent | 023 | Done |
| JZ-029 | HR & branding workspaces (9, 10, 11, 12) | P0 | Business services agent | 023 | Done |
| JZ-030 | Traceability & certification workspaces (4, 20, 21) | P0 | Compliance agent | 023 | Done |
| JZ-031 | Partner service coverage matrix (`/services/coverage`) | P1 | Marketplace agent | 023 | Done |
| JZ-032 | Optional Gemini integration | P1 | — | all P0 | Not implemented (optional) |
| JZ-033 | Integration, design QA, end-to-end testing | P0 | Orchestrator | all | Done (browser QA) |

## Integration contracts

- **Types** `lib/types.ts`: `FactoryId = "al-noor" | "delta" | \`reg-${string}\``, `ServiceId` (21 ids), `DeployableId = SolutionId | ServiceId`, `FactoryState.installedServices / serviceData / serviceRequests`, `Factory.registration`.
- **Catalogue** `lib/data/services.ts`: `SERVICES`, `SERVICE_LIST`, `SERVICE_CATEGORIES`, `PROPOSED_EXTENSIONS`. No confirmed prices — "Pricing to be confirmed"; estimates labelled illustrative.
- **Recommendations** `lib/recommendations.ts`: `recommendServices(factory, state)` — deterministic; curated lists for the two demo accounts.
- **Engine** `lib/data/deployables.ts` + `components/shell/deployment-ticker.tsx`: one engine for solutions (45 s) and services (12 s). Service completion adds to `installedServices` and never changes the maturity tier.
- **Store** `lib/store.ts`: `registerFactory`, `setServiceData`, `requestService`, `startDeployment(f, deployableId)`, `useAllFactories`, `useFactoryProfile`, `getFactoryProfile`. Persist version 2 migrates v1 state.
- **Workspaces**: `components/services/registry.tsx` maps each service to `components/services/workspaces/<group>/<serviceId>.tsx` (default export, `WorkspaceProps`). Shared kit: `components/services/kit.tsx` (`WorkspaceFrame`, `useServiceWorkspace`, `Panel`, `KpiTile`, `AIInsight`, `EditableText`, `StatusPill`, `CategoryGlyph`).

## File ownership

| Owner | Files |
| --- | --- |
| Orchestrator | `lib/types.ts`, `lib/store.ts`, `lib/tier.ts`, `lib/data/services.ts`, `lib/data/deployables.ts`, `lib/recommendations.ts`, `components/services/kit.tsx`, `components/services/registry.tsx`, `components/shell/*`, `components/ui/*` |
| Onboarding | `app/register/**`, `components/onboarding/**`, `app/page.tsx` (CTA only) |
| Marketplace | `app/(app)/services/**`, `components/services/marketplace/**`, `components/product/dashboard-*.tsx` (installed-services card, registered-factory support) |
| Commercial | `components/services/workspaces/commercial/**` |
| Strategy | `components/services/workspaces/strategy/**` |
| Operations | `components/services/workspaces/operations/**` |
| Business services | `components/services/workspaces/people-brand/**` |
| Compliance | `components/services/workspaces/compliance/**` |
