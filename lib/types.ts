// JAHEZ shared data contracts. Owned by the orchestrator — feature agents must not edit.

/** The two curated demo accounts. */
export type DemoFactoryId = "al-noor" | "delta";
/** Demo accounts plus factories created through the simulated sign-up (ids start with "reg-"). */
export type FactoryId = DemoFactoryId | `reg-${string}`;
export type TierLevel = 0 | 1 | 2 | 3 | 4;
export type SolutionId = "website" | "compliance" | "maintenance";
export type Locale = "en" | "ar";

export interface TierDefinition {
  level: TierLevel;
  name: string;
  nameAr: string;
  tagline: string;
  description: string;
  color: string; // hex accent
}

export interface Requirement {
  id: string;
  tier: Exclude<TierLevel, 0>;
  title: string;
  description: string;
  category: "presence" | "governance" | "operations" | "finance" | "people" | "safety" | "supply" | "quality" | "ai" | "security" | "export";
  /** Solution that satisfies this requirement when deployed, if any. */
  satisfiedBy?: SolutionId;
}

export type EmployeeRange = "1-49" | "50-199" | "200-499" | "500+";
export type ExportStatus = "none" | "exploring" | "occasional" | "regular";
export type BusinessObjective = "grow-local-sales" | "start-exporting" | "grow-exports" | "reduce-costs" | "improve-quality" | "certification" | "digitalise-operations" | "access-finance";

/** Extra details captured by the simulated sign-up (registered factories only). */
export interface RegistrationDetails {
  contactName: string;
  email: string;
  whatsapp: string;
  employeeRange: EmployeeRange;
  existingSystems: string[];
  registeredAt: number;
  /** Always unverified in the demo — a tier is proposed, never issued. */
  verification: "unverified";
}

export interface Factory {
  id: FactoryId;
  name: string;
  nameAr: string;
  industry: string;
  industryAr: string;
  location: string;
  governorate: string;
  coordinates: { lat: number; lng: number };
  founded: number;
  employees: number;
  annualRevenueEgp: string;
  products: string[];
  owner: { name: string; title: string; initials: string };
  registrationNo: string; // fictional
  licenseNo: string; // fictional
  siteAreaM2: number;
  baselineTier: TierLevel;
  /** Requirement ids already satisfied before using JAHEZ. */
  baselineRequirements: string[];
  systems: { name: string; status: "active" | "missing" | "partial"; note?: string }[];
  recommendedSolutions: SolutionId[];
  targetOutcome: string;
  experience: "approachable" | "command-center";
  /** Short narrative used on dashboards. */
  summary: string;
  exportStatus?: ExportStatus;
  objectives?: BusinessObjective[];
  /** Present only for factories created via sign-up. */
  registration?: RegistrationDetails;
}

export interface DeploymentStage {
  id: string;
  label: string;
  /** Seconds from start when this stage begins. */
  startsAt: number;
  agent: string;
}

export interface DeploymentLog {
  at: number; // seconds from start
  agent: string;
  message: string;
  level?: "info" | "success" | "warn";
}

export interface Solution {
  id: SolutionId;
  name: string;
  nameAr: string;
  shortDescription: string;
  description: string;
  icon: "globe" | "shield" | "activity";
  factory: DemoFactoryId;
  route: string; // where the unlocked solution lives
  satisfies: string[]; // requirement ids
  deliverables: string[];
  durationSeconds: number;
  stages: DeploymentStage[];
  logs: DeploymentLog[];
  priceNote: string;
}

export type DeploymentStatus = "running" | "completed";

export interface Deployment {
  factoryId: FactoryId;
  /** A flagship SolutionId or one of the 21 IMC ServiceIds. */
  solutionId: DeployableId;
  startedAt: number; // epoch ms
  status: DeploymentStatus;
  completedAt?: number;
  notified?: boolean;
}

export interface AppNotification {
  id: string;
  factoryId: FactoryId;
  title: string;
  body: string;
  href?: string;
  createdAt: number;
  read: boolean;
  kind: "deployment" | "tier" | "info" | "service";
}

// ---- Editable solution content ----

export interface WebsiteContent {
  theme: "indigo" | "teal" | "sand";
  heroTitle: { en: string; ar: string };
  heroSubtitle: { en: string; ar: string };
  about: { en: string; ar: string };
  products: { id: string; name: { en: string; ar: string }; description: { en: string; ar: string } }[];
  capabilities: { label: { en: string; ar: string }; value: string }[];
  certifications: string[];
  contact: { phone: string; whatsapp: string; email: string; address: { en: string; ar: string } };
  published: boolean;
}

export type DocStatus = "draft" | "in-review" | "approved";

export interface ComplianceDoc {
  id: string;
  type: "policy" | "sop" | "checklist";
  title: string;
  titleAr: string;
  category: string;
  owner: string;
  version: string;
  status: DocStatus;
  /** Markdown-ish body: lines starting with "# " are headings, "- " bullets. */
  body: string;
  updatedAt: number;
  requirementId?: string;
}

export interface SiteBoundary {
  points: { lat: number; lng: number }[];
  areaM2: number;
  analyzedAt?: number;
}

export interface Assessment {
  completedAt: number;
  answers: Record<string, string | string[]>;
  provisionalTier: TierLevel;
  score: number; // 0-100
}

export interface FactoryState {
  /** Requirement ids satisfied (baseline + deployed solutions + manual). */
  completedRequirements: string[];
  unlockedSolutions: SolutionId[];
  /** Simulated builds for reported systems without a dedicated solution workspace. */
  systemBuilds: Record<string, { startedAt: number; status: "running" | "completed" }>;
  assessment?: Assessment;
  website?: WebsiteContent;
  complianceDocs?: ComplianceDoc[];
  siteBoundary?: SiteBoundary;
  acknowledgedAlerts: string[];
  scheduledMaintenance: { machineId: string; date: string; note: string }[];
  /** IMC competitiveness services deployed for this factory. */
  installedServices: ServiceId[];
  /** Editable workspace outputs, keyed by service. Each workspace owns its own data shape. */
  serviceData: Partial<Record<ServiceId, unknown>>;
  /** Simulated "request this service" submissions. */
  serviceRequests: ServiceRequest[];
}

// ---- IMC competitiveness services (Phase 2) ----

export type ServiceCategoryId = "marketing-sales-export" | "strategy" | "bpr" | "hr" | "branding" | "export" | "data-analysis" | "bsc" | "product-compliance";

export type ServiceId =
  | "export-marketing" // 1
  | "sales-chatbot" // 2
  | "crm-pipeline" // 3
  | "traceability" // 4
  | "corporate-strategy" // 5
  | "scenario-planning" // 6
  | "process-reengineering" // 7
  | "process-mining" // 8
  | "talent-workforce" // 9
  | "hr-analytics" // 10
  | "brand-identity" // 11
  | "brand-audit" // 12
  | "export-intelligence" // 13
  | "export-documentation" // 14
  | "enterprise-bi" // 15
  | "data-governance" // 16
  | "bsc-design" // 17
  | "bsc-execution" // 18
  | "bsc-workshops" // 19
  | "product-compliance" // 20
  | "technical-file"; // 21

export type DeployableId = SolutionId | ServiceId;

/** Reusable workspace template a service is built on. */
export type WorkspaceTemplate = "analytics" | "document" | "process" | "assessment" | "board" | "planner" | "report" | "tracker" | "assistant";

export type ProductionFeasibility = "confirmed" | "conditional" | "not-assessed";

export interface ServiceCategory {
  id: ServiceCategoryId;
  number: number; // 1-9, IMC order
  name: string; // exact IMC category name
  nameAr: string;
  description: string;
  /** Icon key rendered by the marketplace (see components/services/kit.tsx CategoryIcon). */
  icon: "megaphone" | "compass" | "workflow" | "users" | "palette" | "ship" | "bar-chart" | "target" | "badge-check";
  accent: string; // hex
}

export interface ServiceDefinition {
  id: ServiceId;
  number: number; // 1-21, IMC order
  name: string; // exact IMC service name
  nameAr: string;
  category: ServiceCategoryId;
  tagline: string;
  description: string;
  expectedImpact: string[];
  /** Industry keywords this service fits best ("all" = any). */
  recommendedIndustries: string[];
  /** Minimum maturity tier recommended before activation. */
  recommendedTier: TierLevel;
  prerequisites: string[];
  /** What a factory should do first when it is not yet ready. */
  preparationSteps: string[];
  limitations: string[];
  /** Indicative real-world delivery timeline. */
  timeline: string;
  /** Commercial model — never a confirmed price. */
  pricingModel: string;
  /** Optional, explicitly illustrative estimate. */
  illustrativeEstimate?: string;
  capacityNotes: string;
  feasibility: ProductionFeasibility;
  template: WorkspaceTemplate;
  /** What the simulated workspace demonstrates. */
  demoDeliverables: string[];
  /** Objectives this service advances (used by the recommendation engine). */
  objectives: BusinessObjective[];
  /** True when real-world delivery requires human consultants/facilitators. */
  humanDelivered?: boolean;
  route: string; // /services/<id>
  deploySeconds: number;
  /** Agents shown in the build console, in order. */
  buildAgents: { agent: string; label: string }[];
}

export interface ServiceRequest {
  id: string;
  serviceId: ServiceId | "custom";
  title: string;
  message: string;
  preferredStart: string;
  createdAt: number;
  status: "submitted" | "under-review";
}

// ---- Telemetry ----

export type MachineType = "cnc" | "press" | "lathe" | "robot" | "furnace" | "compressor" | "conveyor" | "loom" | "dyeing";

export interface Machine {
  id: string;
  name: string;
  type: MachineType;
  line: string;
  model: string;
  installed: number;
  /** Position on factory floor in twin units (x, z), y is up. */
  position: [number, number];
  baseTemp: number;
  baseVibration: number; // mm/s RMS
  baseEfficiency: number; // %
  /** 0..1 degradation used to create a believable failing machine. */
  degradation: number;
  sensors: { id: string; kind: "temperature" | "vibration" | "current" | "pressure" | "acoustic"; label: string }[];
}

export interface MachineReading {
  machineId: string;
  timestamp: number;
  temperature: number; // °C
  vibration: number; // mm/s
  current: number; // A
  pressure: number; // bar
  efficiency: number; // %
  health: number; // 0-100
  rulDays: number; // remaining useful life estimate
  failureProbability: number; // 0-1 within 14 days
  status: "healthy" | "watch" | "critical";
}

export interface MachineAlert {
  id: string;
  machineId: string;
  severity: "info" | "warning" | "critical";
  title: string;
  detail: string;
  recommendation: string;
}
