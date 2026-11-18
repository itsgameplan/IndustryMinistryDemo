import type { Requirement, TierDefinition } from "@/lib/types";

export const TIERS: TierDefinition[] = [
  { level: 0, name: "Offline", nameAr: "غير متصل", tagline: "Registered, not yet digital", description: "A registered factory with none of the required digital systems in place.", color: "#94A3B8" },
  { level: 1, name: "Visible", nameAr: "مرئي", tagline: "Discoverable and contactable", description: "Website, business contact channels, basic governance and SOP preparation.", color: "#38BDF8" },
  { level: 2, name: "Organised", nameAr: "منظم", tagline: "Core back-office systems", description: "Accounting, HR, safety systems, core policies and operational SOPs.", color: "#14B8A6" },
  { level: 3, name: "Connected", nameAr: "متصل", tagline: "Data flows across operations", description: "Inventory, supplier management, production tracking, quality systems and advanced governance.", color: "#6366F1" },
  { level: 4, name: "Intelligent", nameAr: "ذكي", tagline: "AI-driven, export-ready", description: "AI operations, predictive maintenance, intelligent QC, energy optimisation, cybersecurity governance and export readiness.", color: "#C9A24B" },
];

export const REQUIREMENTS: Requirement[] = [
  // Tier 1 — Visible
  { id: "t1-website", tier: 1, category: "presence", title: "Bilingual business website", description: "Public Arabic/English website with products, capabilities and location.", satisfiedBy: "website" },
  { id: "t1-contact", tier: 1, category: "presence", title: "Business contact channels", description: "Business email, phone and WhatsApp Business published consistently.", satisfiedBy: "website" },
  { id: "t1-governance", tier: 1, category: "governance", title: "Basic governance policies", description: "Code of conduct, data handling and health & safety policy statements.", satisfiedBy: "compliance" },
  { id: "t1-sop", tier: 1, category: "governance", title: "Relevant SOP preparation", description: "Documented SOPs for the factory's core production processes.", satisfiedBy: "compliance" },
  // Tier 2 — Organised
  { id: "t2-accounting", tier: 2, category: "finance", title: "Digital accounting & e-invoicing", description: "Accounting system integrated with ETA e-invoicing." },
  { id: "t2-hr", tier: 2, category: "people", title: "HR & payroll system", description: "Employee records, attendance, payroll and social insurance." },
  { id: "t2-safety", tier: 2, category: "safety", title: "Safety management system", description: "Incident reporting, PPE tracking and safety training records." },
  { id: "t2-policies", tier: 2, category: "governance", title: "Core policies & operational SOPs", description: "Approved policy set and SOPs covering all operational areas." },
  // Tier 3 — Connected
  { id: "t3-inventory", tier: 3, category: "supply", title: "Inventory management", description: "Real-time raw material, WIP and finished goods visibility." },
  { id: "t3-suppliers", tier: 3, category: "supply", title: "Supplier management", description: "Supplier qualification, purchase orders and performance scoring." },
  { id: "t3-production", tier: 3, category: "operations", title: "Production tracking (MES)", description: "Work orders, OEE and line-level production tracking." },
  { id: "t3-quality", tier: 3, category: "quality", title: "Quality management system", description: "ISO 9001-aligned QMS with inspection and NCR workflows." },
  { id: "t3-governance", tier: 3, category: "governance", title: "Advanced governance", description: "Internal audit, risk register and management review cadence." },
  // Tier 4 — Intelligent
  { id: "t4-predictive", tier: 4, category: "ai", title: "Predictive maintenance", description: "Sensor-driven failure prediction with maintenance scheduling.", satisfiedBy: "maintenance" },
  { id: "t4-ai-ops", tier: 4, category: "ai", title: "AI-powered operations", description: "AI models in daily operational decision-making with human oversight.", satisfiedBy: "maintenance" },
  { id: "t4-quality-ai", tier: 4, category: "quality", title: "Intelligent quality control", description: "Computer-vision or statistical AI for defect detection." },
  { id: "t4-energy", tier: 4, category: "operations", title: "Energy optimisation", description: "Metered energy with AI-driven load and tariff optimisation." },
  { id: "t4-cyber", tier: 4, category: "security", title: "Cybersecurity governance", description: "OT/IT security policy, asset inventory and incident response plan." },
  { id: "t4-export", tier: 4, category: "export", title: "Export readiness", description: "Traceability, export documentation and international certification." },
];

export const requirementsForTier = (tier: number) => REQUIREMENTS.filter((r) => r.tier === tier);
export const tierDef = (level: number) => TIERS[Math.max(0, Math.min(4, level))];
