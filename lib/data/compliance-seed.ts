import type { ComplianceDoc } from "@/lib/types";

/**
 * AI-drafted governance documents for Al Noor Textiles (demo). References to laws and standards
 * are illustrative only — every document requires review by management and qualified legal/HSE advisers.
 */
const T0 = Date.UTC(2026, 10, 14, 9, 30);
const h = (hours: number) => T0 + hours * 3600_000;

export const COMPLIANCE_SEED: ComplianceDoc[] = [
  {
    id: "pol-conduct",
    type: "policy",
    title: "Code of Conduct",
    titleAr: "مدونة قواعد السلوك",
    category: "Governance",
    owner: "Managing Director",
    version: "v0.1",
    status: "in-review",
    requirementId: "t1-governance",
    updatedAt: h(2),
    body: `# Purpose
This Code sets out how everyone at Al Noor Textiles — owners, managers, employees, contractors and visitors — is expected to behave. It applies on the factory floor, in the office, on customer premises and when representing the company online.

# Our commitments
- Treat every colleague with dignity and respect, regardless of gender, religion, origin, age or disability.
- Provide fair wages, paid on time, with written employment terms for every worker.
- No child labour: no person under 18 is employed in production, and identity documents are verified at hiring.
- No forced labour: identity documents are never retained, and workers are free to resign with notice.
- Working hours and overtime follow applicable labour regulations; overtime is voluntary and recorded.

# Business integrity
- Accurate records: production, quality and financial records must be complete and honest.
- Conflicts of interest must be declared to the Managing Director in writing.
- Customer designs, price lists and buyer information are confidential.

# Speaking up
- Concerns can be raised with a supervisor, the HR officer or directly with the Managing Director.
- A locked suggestion box near the canteen allows anonymous reports; it is opened weekly by two people.
- No one will be punished for raising a concern in good faith.

# Breaches
Breaches are investigated promptly and fairly. Outcomes may include coaching, a written warning or dismissal, in line with the employment contract and applicable law.

# Acknowledgement
Every employee signs this Code at induction and again whenever it is materially updated.`,
  },
  {
    id: "pol-hse",
    type: "policy",
    title: "Health, Safety & Environment Policy",
    titleAr: "سياسة الصحة والسلامة والبيئة",
    category: "Health & safety",
    owner: "Production Manager",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-governance",
    updatedAt: h(5),
    body: `# Policy statement
Al Noor Textiles is committed to preventing injuries and ill health, protecting the environment around the Abu Rawash Industrial Zone, and continually improving how we work. Safety takes priority over output.

# Responsibilities
- Managing Director: provides resources and reviews HSE performance quarterly.
- Production Manager: owns this policy, the risk register and incident investigations.
- Shift supervisors: run the daily safety walk and stop unsafe work immediately.
- Every worker: follows SOPs, wears the required PPE and reports hazards and near misses.

# Key controls
- Machine guarding on all 24 circular knitting machines; interlocks are never bypassed.
- Lock-out / tag-out before maintenance, needle changes inside the cylinder or cleaning.
- Hearing protection in the knitting hall; dust masks in cutting and lint-heavy areas.
- Chemicals stored in a bunded area with safety data sheets displayed in Arabic.
- Fire extinguishers inspected monthly; evacuation drills twice a year.

# Environment
- Fabric offcuts and yarn waste are segregated and sold for recycling.
- Dyeing wastewater is handled only by the licensed partner dye-house.
- Electricity use of knitting machines is reviewed monthly to find savings.

# Incident reporting
All injuries, near misses and spills are recorded in the incident log within the same shift and reviewed at the weekly production meeting.

# Review
This policy is reviewed every 12 months, or sooner after a serious incident or a significant change to the factory.`,
  },
  {
    id: "pol-data",
    type: "policy",
    title: "Data Handling & Privacy Policy",
    titleAr: "سياسة التعامل مع البيانات والخصوصية",
    category: "Data & privacy",
    owner: "Office Manager",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-governance",
    updatedAt: h(7),
    body: `# Scope
This policy covers personal data about employees, customer contacts and suppliers, and confidential business data such as buyer designs, price lists and production plans. It is aligned in spirit with Egypt's personal data protection framework; references are illustrative and must be confirmed by legal counsel.

# Principles
- Collect only what is needed: employee files hold ID, contract, bank and emergency contact details only.
- Use data only for the purpose it was collected for.
- Keep data accurate and delete it when no longer needed.

# Access & storage
- Employee files are kept in a locked cabinet in the HR office; digital copies in a password-protected folder.
- Business email accounts replace personal mobile numbers for customer orders.
- Laptops use screen locks and are never shared with personal accounts.
- Customer designs are shared only with staff working on that order.

# Retention
- Employee records: duration of employment plus the period required by applicable law.
- Customer quotations and orders: 5 years.
- CCTV footage: 30 days unless needed for an investigation.

# Incidents
Lost devices, mis-sent emails or suspected data leaks are reported to the Office Manager the same day. The Managing Director decides on notifications to affected people.`,
  },
  {
    id: "pol-abc",
    type: "policy",
    title: "Anti-Bribery & Gifts Policy",
    titleAr: "سياسة مكافحة الرشوة والهدايا",
    category: "Governance",
    owner: "Managing Director",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-governance",
    updatedAt: h(9),
    body: `# Zero tolerance
Al Noor Textiles does not offer, pay, request or accept bribes or facilitation payments — directly or through agents, transporters or customs brokers.

# Gifts and hospitality
- Gifts above EGP 1,000 in value must be declared to the Managing Director and recorded in the gifts register.
- Cash or cash-equivalent gifts are never accepted.
- Gifts to public officials require prior written approval.

# Third parties
- Agents and brokers sign an anti-bribery clause before working with us.
- Payments are made only by bank transfer to the contracted company, never to individuals.

# Reporting
Any request for a bribe must be refused and reported the same day. Reports can be made anonymously through the suggestion box.

# Consequences
Breaching this policy is a serious disciplinary matter and may lead to dismissal and termination of supplier contracts.`,
  },
  {
    id: "sop-kn-01",
    type: "sop",
    title: "SOP-KN-01 Circular Knitting Machine Setup",
    titleAr: "إجراء تشغيل قياسي: إعداد ماكينة التريكو الدائرية",
    category: "Production",
    owner: "Knitting Supervisor",
    version: "v0.1",
    status: "in-review",
    requirementId: "t1-sop",
    updatedAt: h(11),
    body: `# Purpose
Ensure every circular knitting machine is set up consistently so the first roll meets the fabric specification for weight (g/m²), width and stitch length.

# Scope
All 24 circular knitting machines (single jersey, rib and interlock) in the knitting hall.

# Required PPE
- Cut-resistant gloves for needle handling
- Hearing protection
- Safety shoes

# Procedure
1. Confirm the job card: fabric type, yarn count, target GSM, open width and machine gauge.
2. Apply lock-out / tag-out before opening the guard or touching the cylinder.
3. Inspect needles and sinkers; replace any bent or broken needle and record it on the needle log.
4. Load yarn cones on the creel in the sequence on the job card; check every feeder for correct threading.
5. Set stitch cam positions to the values on the job card and record the readings.
6. Set yarn tension on each feeder with the tension meter (target ±0.5 cN of the job card).
7. Remove lock-out, close guards and run 2 metres at low speed.
8. Measure stitch length, width and GSM on the sample; adjust cams if outside tolerance.
9. Supervisor signs off the first-off sample before bulk running starts.

# Quality checks
- GSM within ±3% of target
- No holes, drop stitches or needle lines on the first 2 metres
- Width within ±1 cm of target

# Records
Job card, needle log and first-off sample approval are kept with the production order for 2 years.`,
  },
  {
    id: "sop-dy-01",
    type: "sop",
    title: "SOP-DY-01 Reactive Dyeing & Chemical Handling",
    titleAr: "إجراء تشغيل قياسي: الصباغة النشطة والتعامل مع الكيماويات",
    category: "Production",
    owner: "Production Manager",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-sop",
    updatedAt: h(13),
    body: `# Purpose
Define safe handling of dyes and auxiliary chemicals at Al Noor and the hand-over of fabric to the partner dye-house for reactive dyeing.

# Scope
Sample dyeing in the lab, chemical receipt and storage on site, and preparation of dye-house dispatches.

# Required PPE
- Chemical-resistant gloves and apron
- Safety goggles
- Dust mask when weighing powder dyes

# Procedure
1. On receipt, check every container label matches the delivery note and the safety data sheet (SDS) is on file in Arabic.
2. Store chemicals in the bunded store, separating alkalis (soda ash, caustic) from acids and oxidisers.
3. Weigh dyes in the lab under the extraction hood; close containers immediately after use.
4. Prepare lab dips using the recipe card; record liquor ratio, temperature and time.
5. Present lab dips to the customer under D65 light for shade approval.
6. Attach the approved recipe and shade standard to the dye-house dispatch note.
7. Clean spills immediately with the spill kit; never wash chemicals into floor drains.

# Emergency
- Skin contact: wash with running water for 15 minutes.
- Eye contact: use the eyewash station, then seek medical attention.
- Large spill: evacuate the area and inform the shift supervisor.

# Records
Chemical inventory, SDS register, recipe cards and shade approvals.`,
  },
  {
    id: "sop-qc-02",
    type: "sop",
    title: "SOP-QC-02 Fabric Inspection (4-Point System)",
    titleAr: "إجراء تشغيل قياسي: فحص الأقمشة بنظام النقاط الأربع",
    category: "Quality",
    owner: "Quality Lead",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-sop",
    updatedAt: h(15),
    body: `# Purpose
Grade every finished roll consistently using the 4-point system so only fabric meeting the customer's acceptance level is shipped.

# Scope
All knitted rolls, greige or dyed, before packing and dispatch.

# Equipment
- Inspection frame with backlight and length counter
- Measuring tape and GSM cutter with balance
- Defect stickers and inspection report form

# Procedure
1. Load the roll on the inspection frame and record roll number, order and length.
2. Run fabric at no more than 15 metres per minute under the backlight.
3. Mark each defect and assign points by length: up to 3 in = 1 point; 3–6 in = 2; 6–9 in = 3; over 9 in = 4.
4. Any hole counts 4 points regardless of size.
5. Measure width at the start, middle and end; cut a GSM sample.
6. Calculate points per 100 square yards and compare with the acceptance limit (default 40).
7. Label the roll Pass, Second or Reject and move it to the matching area.

# Common defects
- Holes and drop stitches
- Needle lines and barré
- Oil stains and slubs
- Shade variation side-centre-side

# Records
Inspection reports are filed per order; monthly defect statistics are shared with the knitting supervisor.`,
  },
  {
    id: "chk-safety-walk",
    type: "checklist",
    title: "Daily Safety Walk Checklist",
    titleAr: "قائمة جولة السلامة اليومية",
    category: "Health & safety",
    owner: "Shift Supervisor",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-sop",
    updatedAt: h(17),
    body: `# Before the shift starts
- [ ] Walkways and emergency exits clear of rolls, cones and trolleys
- [ ] All knitting machine guards closed and interlocks working
- [ ] First-aid kit stocked and log checked
- [ ] Hearing protection available at the knitting hall entrance

# During the walk
- [ ] Workers wearing required PPE in each area
- [ ] No loose clothing or jewellery near rotating cylinders
- [ ] Extension leads and cables in good condition, not crossing walkways
- [ ] Chemical store locked; no open containers outside the store
- [ ] Lint build-up removed from machines and light fittings

# Close-out
- [ ] Hazards found recorded in the safety log with an owner
- [ ] Near misses discussed at the shift hand-over`,
  },
  {
    id: "chk-fire",
    type: "checklist",
    title: "Fire & Evacuation Checklist",
    titleAr: "قائمة الحريق والإخلاء",
    category: "Health & safety",
    owner: "Production Manager",
    version: "v0.1",
    status: "draft",
    requirementId: "t1-sop",
    updatedAt: h(19),
    body: `# Monthly inspection
- [ ] Every extinguisher in place, sealed and pressure gauge in the green
- [ ] Fire alarm call points unobstructed and tested
- [ ] Emergency lighting working on battery
- [ ] Evacuation maps posted in Arabic at each exit
- [ ] Assembly point sign visible from the main gate

# Housekeeping
- [ ] Yarn and fabric waste removed from the knitting hall daily
- [ ] No storage within 1 metre of electrical panels
- [ ] Smoking only in the designated outdoor area

# Drills
- [ ] Evacuation drill held in the last 6 months
- [ ] Headcount completed at the assembly point within 4 minutes
- [ ] Drill findings recorded with corrective actions`,
  },
];

/** Pre-written improvement sections appended by "Ask AI to improve". */
export const AI_IMPROVEMENTS: Record<string, string> = {
  "pol-conduct": `# Training & monitoring (AI suggestion)
- New starters complete a 30-minute Code of Conduct briefing in Arabic during induction week.
- Supervisors refresh one Code topic at the monthly shift meeting.
- The Managing Director reviews suggestion-box themes each quarter and reports actions back to staff.`,
  "pol-hse": `# Objectives & indicators (AI suggestion)
- Zero lost-time injuries; track the lost-time injury rate monthly.
- 100% of daily safety walks completed and signed.
- At least 10 near misses reported per quarter — reporting is encouraged, not penalised.
- Close 90% of corrective actions within 14 days.`,
  "pol-data": `# Supplier & cloud services (AI suggestion)
- Cloud email and storage providers are reviewed for security settings before use.
- Two-factor authentication is enabled on all business email accounts.
- Former employees' access is removed on their last working day.`,
  "pol-abc": `# Risk areas specific to Al Noor (AI suggestion)
- Customs clearance of imported yarn and spare parts.
- Licence renewals and inspections.
- Large institutional uniform tenders — all tender correspondence is kept on file.`,
  "sop-kn-01": `# Troubleshooting (AI suggestion)
- Holes after setup: check for a broken latch needle and yarn tension spikes on the affected feeder.
- Barré lines: confirm all cones are from the same yarn lot and tensions are even.
- GSM too high: increase stitch length by one cam step and re-measure after 2 metres.`,
  "sop-dy-01": `# Waste & environmental controls (AI suggestion)
- Empty chemical containers are triple-rinsed and returned to the supplier or a licensed collector.
- Lab rinse water is collected and sent to the partner dye-house treatment plant.
- Monthly chemical stock count reconciles purchases, usage and waste.`,
  "sop-qc-02": `# Escalation rules (AI suggestion)
- Two consecutive rolls from the same machine graded Second: stop the machine and inform the knitting supervisor.
- Any roll over 60 points per 100 sq yd is quarantined pending Quality Lead review.
- Customer-specific limits on the purchase order override the default of 40 points.`,
  "chk-safety-walk": `# Additional checks (AI suggestion)
- [ ] Compressed-air guns fitted with safety nozzles
- [ ] Forklift / pallet-truck path clear and marked
- [ ] Drinking water available in the knitting hall during summer shifts`,
  "chk-fire": `# Additional checks (AI suggestion)
- [ ] Fire-door closers working and doors not wedged open
- [ ] Sprinkler or hose-reel pressure checked by the maintenance technician
- [ ] Two trained fire wardens named on every shift roster`,
};

export const DEFAULT_IMPROVEMENT = `# Review notes (AI suggestion)
- Add a named owner and a review date to each section.
- Link this document to the related SOPs and checklists.
- Translate the final approved version into Arabic for display on the floor.`;
