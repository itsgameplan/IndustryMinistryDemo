// JAHEZ shared data contracts. Owned by the orchestrator — feature agents must not edit.

export type FactoryId = "al-noor" | "delta";
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
  factory: FactoryId;
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
  solutionId: SolutionId;
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
  kind: "deployment" | "tier" | "info";
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
  assessment?: Assessment;
  website?: WebsiteContent;
  complianceDocs?: ComplianceDoc[];
  siteBoundary?: SiteBoundary;
  acknowledgedAlerts: string[];
  scheduledMaintenance: { machineId: string; date: string; note: string }[];
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
