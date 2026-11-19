// Deterministic content pools for the AI brand studio (brand-identity workspace).
// All copy is demo content; "regeneration" cycles through these variants after a short simulated delay.
import { seedKeyFor } from "@/components/services/kit";
import type { Factory } from "@/lib/types";

export type Lang = "en" | "ar";
export interface Bi { en: string; ar: string }
export type Channel = "linkedin" | "facebook" | "instagram";
export type VoiceAxis = "formal" | "technical" | "bold" | "modern";

export interface Palette { id: string; name: string; primary: string; dark: string; accent: string; soft: string }
export interface PatternKind { kind: "knit" | "disc" | "grid" }

export interface BrandPack {
  wordmark: Bi;
  initials: string;
  pattern: PatternKind["kind"];
  palettes: Palette[];
  statements: Bi[];
  pillars: { title: string; body: string }[];
  audiences: { name: string; need: string }[];
  taglines: Bi[][]; // sets of 4, cycled on regenerate
  posts: Record<Channel, Bi[]>;
  products: { id: string; name: Bi; copy: Bi[] }[];
  voice: Record<VoiceAxis, number>;
}

const AL_NOOR: BrandPack = {
  wordmark: { en: "Al Noor Textiles", ar: "النور للمنسوجات" },
  initials: "AN",
  pattern: "knit",
  palettes: [
    { id: "nile", name: "Nile Cotton", primary: "#0F7A72", dark: "#0B2B33", accent: "#D1AE5C", soft: "#EAF6F4" },
    { id: "indigo", name: "Indigo Loom", primary: "#3446A8", dark: "#161E52", accent: "#E3B05B", soft: "#EEF0FB" },
    { id: "sand", name: "Desert Sand", primary: "#9A6B35", dark: "#33241A", accent: "#2F7A72", soft: "#F7F0E6" },
  ],
  statements: [
    {
      en: "For Egyptian brands, institutions and export buyers who need dependable cotton knits and garments, Al Noor Textiles is the family-run Giza mill that knits, dyes to order and sews under one roof — so every order arrives consistent, on time and built for heavy use.",
      ar: "للعلامات التجارية والمؤسسات المصرية ومشتري التصدير الذين يحتاجون إلى أقمشة تريكو وملابس قطنية يُعتمد عليها، النور للمنسوجات هو المصنع العائلي في الجيزة الذي يُنسج ويصبغ حسب الطلب ويخيط تحت سقف واحد — ليصل كل طلب متسقًا وفي موعده ومصممًا للاستخدام الشاق.",
    },
    {
      en: "Al Noor Textiles turns long-staple Egyptian cotton into fabrics and garments that survive daily wear and industrial washing — with the flexibility of a family mill and the discipline buyers expect from a certified supplier.",
      ar: "تحوّل النور للمنسوجات القطن المصري طويل التيلة إلى أقمشة وملابس تتحمّل الاستخدام اليومي والغسيل الصناعي — بمرونة المصنع العائلي وانضباط المورد المعتمد الذي يتوقعه المشترون.",
    },
  ],
  pillars: [
    { title: "Under one roof", body: "Knitting, dyeing coordination, cutting and sewing in one site — fewer hand-offs, faster samples." },
    { title: "Built for washing", body: "Fabrics engineered for hospital and workwear laundering cycles, inspected roll by roll." },
    { title: "Flexible partner", body: "Private-label runs from 300 pieces with one dedicated account lead per order." },
  ],
  audiences: [
    { name: "Local apparel brands", need: "Consistent fabric quality and short sample-to-bulk lead times" },
    { name: "Hospitals & institutions", need: "Durable linen and uniforms that survive industrial laundering" },
    { name: "Gulf & EU importers", need: "A reliable Egyptian cotton partner with documentation and compliance" },
  ],
  taglines: [
    [
      { en: "Egyptian cotton, knitted with care.", ar: "قطن مصري، يُنسج بعناية." },
      { en: "From yarn to uniform, under one roof.", ar: "من الخيط إلى الزي، تحت سقف واحد." },
      { en: "Made in Giza. Made to last.", ar: "صُنع في الجيزة. صُنع ليدوم." },
      { en: "Fabric you can trust, wash after wash.", ar: "قماش تثق به، غسلة بعد غسلة." },
    ],
    [
      { en: "Knitting comfort into every thread.", ar: "ننسج الراحة في كل خيط." },
      { en: "Quality cotton, delivered on time.", ar: "قطن عالي الجودة، في موعده." },
      { en: "Your private-label partner in Egypt.", ar: "شريكك للعلامة الخاصة في مصر." },
      { en: "Built for daily wear and heavy washing.", ar: "مصمم للاستخدام اليومي والغسيل الشاق." },
    ],
  ],
  posts: {
    linkedin: [
      { en: "Fifteen years of knitting Egyptian cotton in Giza. This season our 24 circular machines are producing piqué and interlock for three new private-label partners — every roll checked on the 4-point system before it ships.", ar: "خمسة عشر عامًا من نسج القطن المصري في الجيزة. هذا الموسم تنتج ماكيناتنا الدائرية الأربع والعشرون أقمشة بيكيه وإنترلوك لثلاثة شركاء جدد بعلامات خاصة — ويُفحص كل رول بنظام النقاط الأربع قبل الشحن." },
      { en: "Hospital linen has one job: survive hundreds of washes at 75 °C. Our team engineers fabric weight, yarn and finishing so sheets and scrubs keep their shape — and patients stay comfortable.", ar: "لمفروشات المستشفيات مهمة واحدة: أن تتحمل مئات الغسلات عند 75 درجة مئوية. يضبط فريقنا وزن القماش والغزل والتجهيز لتحافظ الملاءات والملابس الطبية على شكلها — ويبقى المرضى في راحة." },
    ],
    facebook: [
      { en: "Meet the team behind your uniforms 👋 86 skilled people in Abu Rawash knit, cut and sew every piece. Need polos or workwear for your company? Send us a message.", ar: "تعرّف على الفريق وراء زيّك الموحد 👋 86 عاملًا ماهرًا في أبو رواش ينسجون ويقصّون ويخيطون كل قطعة. تحتاج قمصان بولو أو ملابس عمل لشركتك؟ راسلنا." },
      { en: "New colours just came off the dyeing line 🎨 Lab-dip approved, ready for bulk. Which shade should we feature next?", ar: "ألوان جديدة خرجت للتو من خط الصباغة 🎨 معتمدة بعينة المعمل وجاهزة للإنتاج. أي لون نعرضه في المرة القادمة؟" },
    ],
    instagram: [
      { en: "Yarn → fabric → finished polo. All in one building in Giza. #MadeInEgypt #EgyptianCotton", ar: "خيط ← قماش ← قميص بولو جاهز. كل ذلك في مبنى واحد بالجيزة. #صنع_في_مصر #قطن_مصري" },
      { en: "Texture check: 220 g/m² piqué, combed cotton, soft hand-feel. Made for everyday. #Knitwear #MadeInEgypt", ar: "اختبار الملمس: بيكيه 220 جم/م²، قطن ممشط وملمس ناعم. مصنوع لكل يوم. #تريكو #صنع_في_مصر" },
    ],
  },
  products: [
    { id: "fabric", name: { en: "Cotton knit fabric", ar: "أقمشة تريكو قطنية" }, copy: [
      { en: "Single jersey, piqué, interlock and rib from 140–240 g/m², knitted from long-staple Egyptian cotton and supplied greige or dyed to your shade.", ar: "سنجل جيرسي وبيكيه وإنترلوك وريب بأوزان 140–240 جم/م²، منسوجة من القطن المصري طويل التيلة، خام أو مصبوغة حسب لونك." },
      { en: "Knitted to order on 24 circular machines. Consistent GSM, 4-point inspected rolls and lab-dip shade approval before bulk.", ar: "تُنسج حسب الطلب على 24 ماكينة دائرية. وزن ثابت ورولات مفحوصة بنظام النقاط الأربع واعتماد اللون بعينة معمل قبل الإنتاج." },
    ] },
    { id: "polo", name: { en: "Polos & T-shirts", ar: "قمصان بولو وتيشيرتات" }, copy: [
      { en: "Combed-cotton polos and crew-neck tees with private-label neck tapes, embroidery and printing — runs from 300 pieces.", ar: "قمصان بولو وتيشيرتات من القطن الممشط مع شرائط رقبة بعلامتك الخاصة وتطريز وطباعة — بدءًا من 300 قطعة." },
      { en: "Your brand, our craft: soft-hand polos and tees that keep their colour and collar shape after repeated washing.", ar: "علامتك وحرفتنا: قمصان بولو وتيشيرتات بملمس ناعم تحتفظ بلونها وشكل الياقة بعد الغسيل المتكرر." },
    ] },
    { id: "workwear", name: { en: "Workwear uniforms", ar: "ملابس العمل الموحدة" }, copy: [
      { en: "Hard-wearing shirts, trousers and coveralls for factory, logistics and hospitality teams, with reflective trims and company branding.", ar: "قمصان وبناطيل وأفرولات متينة لفرق المصانع والخدمات اللوجستية والضيافة، مع أشرطة عاكسة وشعار الشركة." },
      { en: "Uniforms your teams will actually wear: breathable cotton blends, reinforced seams and sizing that fits every shift.", ar: "أزياء سيرتديها فريقك فعلًا: خلطات قطنية تسمح بالتهوية وخياطات مدعّمة ومقاسات تناسب كل وردية." },
    ] },
    { id: "linen", name: { en: "Hospital linen", ar: "مفروشات المستشفيات" }, copy: [
      { en: "Bed sheets, patient gowns and scrubs engineered to withstand repeated industrial laundering at 75 °C without losing shape.", ar: "ملاءات وأردية مرضى وملابس طبية مصممة لتحمّل الغسيل الصناعي المتكرر عند 75 درجة مئوية دون أن تفقد شكلها." },
      { en: "Healthcare textiles that last: dimensionally stable, colour-fast and supplied in hospital-ready packs.", ar: "منسوجات طبية تدوم: ثابتة الأبعاد وألوانها لا تبهت، وتُورَّد في عبوات جاهزة للمستشفيات." },
    ] },
  ],
  voice: { formal: 40, technical: 35, bold: 45, modern: 40 },
};

const DELTA: BrandPack = {
  wordmark: { en: "Delta Precision", ar: "دلتا للتصنيع الدقيق" },
  initials: "DP",
  pattern: "disc",
  palettes: [
    { id: "steel", name: "Precision Steel", primary: "#1F3A5F", dark: "#0B1626", accent: "#F28C28", soft: "#EEF2F7" },
    { id: "forge", name: "Forge Red", primary: "#A3261E", dark: "#2A0F0D", accent: "#C9A24B", soft: "#FBEFEE" },
    { id: "delta", name: "Delta Teal", primary: "#0E7C7B", dark: "#0A2A2E", accent: "#C9A24B", soft: "#E8F5F4" },
  ],
  statements: [
    {
      en: "For vehicle assemblers and tier-one partners who cannot afford a defective safety part, Delta Precision Manufacturing delivers brake, steering and machined components produced on connected CNC lines under IATF 16949 discipline — with traceability from bar stock to shipment.",
      ar: "لمُجمّعي السيارات وشركاء المستوى الأول الذين لا يحتملون قطعة سلامة معيبة، تقدّم دلتا للتصنيع الدقيق مكونات الفرامل والتوجيه والقطع المشغولة المنتجة على خطوط CNC متصلة وفق انضباط IATF 16949 — مع تتبّع كامل من الخامة حتى الشحن.",
    },
    {
      en: "Delta Precision is Egypt's precision partner for safety-critical automotive parts: 25+ years of machining know-how, connected production data and a quality system built for global OEM audits.",
      ar: "دلتا للتصنيع الدقيق هي شريك الدقة في مصر لقطع السيارات الحرجة للسلامة: أكثر من 25 عامًا من خبرة التشغيل وبيانات إنتاج متصلة ونظام جودة مصمم لتدقيقات المصنعين العالميين.",
    },
  ],
  pillars: [
    { title: "Safety-critical precision", body: "Brake and steering parts machined to micron-level tolerances and 100% critical-feature inspection." },
    { title: "Connected production", body: "32 machines streaming data — every part traceable to machine, shift and batch." },
    { title: "Proven tier-one partner", body: "Supplying regional assemblers since 1998 with audit-ready quality systems." },
  ],
  audiences: [
    { name: "Regional vehicle assemblers", need: "Zero-defect safety parts with PPAP and traceability" },
    { name: "Global tier-one suppliers", need: "A cost-competitive machining partner near EU and Gulf markets" },
    { name: "Aftermarket distributors", need: "OE-quality brake discs and drums with reliable lead times" },
  ],
  taglines: [
    [
      { en: "Precision you can drive on.", ar: "دقة تعتمد عليها على الطريق." },
      { en: "Engineered in Egypt. Trusted on every road.", ar: "هندسة مصرية، موثوقة على كل طريق." },
      { en: "Tier-one quality, every single part.", ar: "جودة المورد الأول، في كل قطعة." },
      { en: "Machined to the micron.", ar: "مشغولة بدقة الميكرون." },
    ],
    [
      { en: "Safety-critical parts, zero compromise.", ar: "قطع حرجة للسلامة، بلا تنازلات." },
      { en: "Where steel meets precision.", ar: "حيث يلتقي الصلب بالدقة." },
      { en: "Built for the brands that move the region.", ar: "نصنع للعلامات التي تحرك المنطقة." },
      { en: "Since 1998, every tolerance kept.", ar: "منذ 1998، نلتزم بكل تفاوت." },
    ],
  ],
  posts: {
    linkedin: [
      { en: "Every brake disc leaving 10th of Ramadan City carries a digital record: machine, shift, operator group and dimensional results. Connected manufacturing is how we deliver zero-defect safety parts to our OEM partners.", ar: "كل قرص فرامل يغادر مدينة العاشر من رمضان يحمل سجلًا رقميًا: الماكينة والوردية ومجموعة التشغيل ونتائج القياس. التصنيع المتصل هو طريقنا لتسليم قطع سلامة خالية من العيوب لشركائنا المصنعين." },
      { en: "We're expanding CNC capacity for steering knuckles and precision shafts. If you're sourcing machined components for EU or Gulf programmes, our engineering team would welcome a technical discussion.", ar: "نوسّع طاقة CNC لمفاصل التوجيه والأعمدة الدقيقة. إذا كنت تبحث عن مكونات مشغولة لبرامج في أوروبا أو الخليج، يسعد فريقنا الهندسي بنقاش فني معك." },
    ],
    facebook: [
      { en: "Proud of our maintenance and quality teams this month 👏 Another customer audit closed with zero major findings. Thank you to 412 colleagues who make precision a habit.", ar: "فخورون بفريقي الصيانة والجودة هذا الشهر 👏 تدقيق عميل آخر انتهى دون أي ملاحظات جوهرية. شكرًا لـ 412 زميلًا جعلوا الدقة عادة." },
      { en: "We're hiring CNC machinists and maintenance technicians in 10th of Ramadan City. Training on modern connected machines included. Apply via our careers page.", ar: "نوظّف فنيي تشغيل CNC وفنيي صيانة في مدينة العاشر من رمضان. يشمل العمل تدريبًا على ماكينات حديثة متصلة. قدّم عبر صفحة الوظائف." },
    ],
    instagram: [
      { en: "Micron-level. Every time. #PrecisionEngineering #MadeInEgypt", ar: "دقة الميكرون. في كل مرة. #هندسة_دقيقة #صنع_في_مصر" },
      { en: "From bar stock to steering knuckle — 14 operations, one connected line. #CNC #Automotive", ar: "من الخامة إلى مفصل التوجيه — 14 عملية على خط واحد متصل. #CNC #صناعة_السيارات" },
    ],
  },
  products: [
    { id: "brake", name: { en: "Brake discs & drums", ar: "أقراص وطنابير الفرامل" }, copy: [
      { en: "Grey-iron brake discs and drums machined on connected CNC lines, balanced and 100% inspected for run-out and thickness variation.", ar: "أقراص وطنابير فرامل من الحديد الرمادي، مشغولة على خطوط CNC متصلة، ومتزنة ومفحوصة بنسبة 100% للانحراف وتفاوت السُمك." },
      { en: "OE-quality braking components with full traceability, PPAP documentation and flexible batch sizes for OEM and aftermarket programmes.", ar: "مكونات فرامل بجودة المصنع الأصلي مع تتبّع كامل ومستندات PPAP وأحجام دفعات مرنة لبرامج المصنعين وقطع الغيار." },
    ] },
    { id: "knuckle", name: { en: "Steering knuckles", ar: "مفاصل التوجيه" }, copy: [
      { en: "Safety-critical steering knuckles machined from forged blanks, with critical bores held to tight tolerances and CMM verification.", ar: "مفاصل توجيه حرجة للسلامة مشغولة من مسبوكات مطروقة، مع ثقوب حرجة بتفاوتات دقيقة وتحقق بجهاز CMM." },
      { en: "Multi-operation machining on 5-axis centres delivers repeatable geometry for every steering knuckle we ship.", ar: "تشغيل متعدد العمليات على مراكز خماسية المحاور يضمن هندسة متكررة لكل مفصل توجيه نشحنه." },
    ] },
    { id: "housing", name: { en: "CNC-machined housings", ar: "أغطية مشغولة بـ CNC" }, copy: [
      { en: "Aluminium and cast-iron housings for pumps, gearboxes and EV components, machined to drawing with sealed-surface finish control.", ar: "أغطية من الألومنيوم والحديد الزهر للمضخات وصناديق التروس ومكونات السيارات الكهربائية، مشغولة حسب الرسم مع تحكم في تشطيب أسطح الإحكام." },
      { en: "From prototype to series: CNC housings with programmed inspection and digital records for every batch.", ar: "من النموذج الأولي إلى الإنتاج الكمي: أغطية CNC مع فحص مبرمج وسجلات رقمية لكل دفعة." },
    ] },
    { id: "shaft", name: { en: "Precision shafts", ar: "أعمدة دقيقة" }, copy: [
      { en: "Turned and ground shafts with tight concentricity, induction hardening and surface finish verified on every lot.", ar: "أعمدة مخروطة ومجلوخة بتمركز دقيق وتقسية بالحث وتشطيب سطحي يُتحقق منه في كل دفعة." },
      { en: "Precision shafts for drivetrain and industrial applications, produced with SPC-controlled grinding and full material certificates.", ar: "أعمدة دقيقة لنقل الحركة والتطبيقات الصناعية، تُنتج بجلخ خاضع للتحكم الإحصائي مع شهادات مواد كاملة." },
    ] },
  ],
  voice: { formal: 72, technical: 78, bold: 55, modern: 68 },
};

function genericPack(f: Factory): BrandPack {
  const name = f.name;
  const ar = f.nameAr || f.name;
  const ind = f.industry.toLowerCase();
  const indAr = f.industryAr || "منتجات صناعية";
  const p0 = f.products[0] ?? "our products";
  const initials = f.name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase() || "F";
  const products = (f.products.length ? f.products : ["Core product line"]).slice(0, 4);
  return {
    wordmark: { en: name, ar },
    initials,
    pattern: "grid",
    palettes: [
      { id: "navy", name: "Industrial Navy", primary: "#1E3A63", dark: "#0B1F3A", accent: "#0FA396", soft: "#EEF2F7" },
      { id: "teal", name: "Nile Teal", primary: "#0F7A72", dark: "#0B2B33", accent: "#D1AE5C", soft: "#EAF6F4" },
      { id: "clay", name: "Clay & Gold", primary: "#9A5B35", dark: "#2E1B12", accent: "#C9A24B", soft: "#F7EFE8" },
    ],
    statements: [
      { en: `For buyers who need reliable ${ind} made in Egypt, ${name} combines consistent quality, responsive service and flexible order sizes from ${f.location || f.governorate}.`, ar: `للمشترين الذين يحتاجون إلى ${indAr} موثوقة مصنوعة في مصر، تجمع ${ar} بين الجودة الثابتة والخدمة السريعة وأحجام الطلب المرنة.` },
      { en: `${name} is a growing Egyptian manufacturer in ${ind}, focused on documented quality, on-time delivery and long-term partnerships with local and export customers.`, ar: `${ar} مصنع مصري متنامٍ في مجال ${indAr}، يركز على الجودة الموثقة والتسليم في الموعد والشراكات طويلة الأمد مع العملاء المحليين والدوليين.` },
    ],
    pillars: [
      { title: "Consistent quality", body: "Documented checks at every stage so each batch matches the approved sample." },
      { title: "Responsive service", body: "One point of contact, fast quotes and clear lead times." },
      { title: "Made in Egypt", body: "Local production with competitive costs and access to regional markets." },
    ],
    audiences: [
      { name: "Local distributors", need: "Reliable supply and consistent specifications" },
      { name: "Industrial buyers", need: "Documented quality and on-time delivery" },
      { name: "Export importers", need: "A credible Egyptian partner with clear documentation" },
    ],
    taglines: [
      [
        { en: `${name}: quality made in Egypt.`, ar: `${ar}: جودة صُنعت في مصر.` },
        { en: "Built with care. Ready for the world.", ar: "صُنع بعناية. جاهز للعالم." },
        { en: "Reliable by design.", ar: "موثوقية في التصميم." },
        { en: "Your partner from sample to shipment.", ar: "شريكك من العينة إلى الشحن." },
      ],
      [
        { en: "Made in Egypt, made to last.", ar: "صُنع في مصر، ليدوم." },
        { en: "Consistent quality, delivered on time.", ar: "جودة ثابتة، في موعدها." },
        { en: "Manufacturing you can count on.", ar: "تصنيع يمكنك الاعتماد عليه." },
        { en: `Better ${ind}, made locally.`, ar: `${indAr} أفضل، بصناعة محلية.` },
      ],
    ],
    posts: {
      linkedin: [
        { en: `At ${name} we are investing in digital quality records and faster quoting for ${ind} customers. Looking for a reliable Egyptian supplier? Let's connect.`, ar: `في ${ar} نستثمر في سجلات جودة رقمية وعروض أسعار أسرع لعملائنا. تبحث عن مورد مصري موثوق؟ لنتواصل.` },
        { en: `Every batch of ${p0} is checked against the approved sample before it leaves our floor. Consistency is our promise.`, ar: `تُفحص كل دفعة من ${p0} مقابل العينة المعتمدة قبل خروجها من المصنع. الاتساق هو وعدنا.` },
      ],
      facebook: [
        { en: `Meet the team at ${name} 👋 ${f.employees} people making ${ind} in ${f.governorate}. Message us for quotes.`, ar: `تعرّف على فريق ${ar} 👋 ${f.employees} شخصًا يصنعون ${indAr} في ${f.governorate}. راسلنا لعروض الأسعار.` },
        { en: "New production capacity available this quarter. Ask us about lead times and minimum order sizes.", ar: "طاقة إنتاجية جديدة متاحة هذا الربع. اسألنا عن مواعيد التسليم والحد الأدنى للطلب." },
      ],
      instagram: [
        { en: `Made in Egypt. Made with care. #MadeInEgypt`, ar: "صُنع في مصر. صُنع بعناية. #صنع_في_مصر" },
        { en: `Behind the scenes on our ${p0} line. #Manufacturing`, ar: `من داخل خط إنتاج ${p0}. #تصنيع` },
      ],
    },
    products: products.map((p, i) => ({
      id: `g${i}`,
      name: { en: p, ar: p },
      copy: [
        { en: `${p} from ${name}: manufactured in ${f.governorate || "Egypt"} to consistent specifications, with flexible order sizes and documented quality checks.`, ar: `${p} من ${ar}: يُصنع في ${f.governorate || "مصر"} وفق مواصفات ثابتة، مع كميات طلب مرنة وفحوصات جودة موثقة.` },
        { en: `Reliable ${p.toLowerCase()} for distributors and industrial buyers — quoted fast, produced to sample and delivered on schedule.`, ar: `${p} موثوقة للموزعين والمشترين الصناعيين — عروض أسعار سريعة وإنتاج مطابق للعينة وتسليم في الموعد.` },
      ],
    })),
    voice: { formal: 55, technical: 50, bold: 45, modern: 55 },
  };
}

export function brandPackFor(f: Factory): BrandPack {
  const k = seedKeyFor(f);
  return k === "al-noor" ? AL_NOOR : k === "delta" ? DELTA : genericPack(f);
}

/** Voice-aware call to action appended to regenerated social posts. */
export function ctaFor(voice: Record<VoiceAxis, number>, lang: Lang) {
  const formal = voice.formal >= 55;
  const bold = voice.bold >= 60;
  if (lang === "ar") return formal ? (bold ? "تواصلوا معنا اليوم لمناقشة احتياجاتكم." : "يسعدنا تلقي استفساراتكم.") : bold ? "راسلنا الآن! 👇" : "اكتب لنا في رسالة 💬";
  return formal ? (bold ? "Contact our team today to discuss your requirements." : "We welcome your enquiries.") : bold ? "Message us now! 👇" : "Drop us a message 💬";
}

/** Describe the brand voice from slider positions. */
export function describeVoice(v: Record<VoiceAxis, number>) {
  const words = [
    v.formal >= 60 ? "professional" : v.formal <= 40 ? "friendly" : "approachable",
    v.technical >= 60 ? "technically precise" : v.technical <= 40 ? "plain-spoken" : "clear",
    v.bold >= 60 ? "confident" : v.bold <= 40 ? "modest" : "assured",
    v.modern >= 60 ? "forward-looking" : v.modern <= 40 ? "proud of its heritage" : "grounded",
  ];
  const doList = [
    v.technical >= 60 ? "Quote real specifications (tolerances, GSM, certifications)" : "Explain benefits in everyday words",
    v.formal >= 60 ? "Use complete sentences and the buyer's job title" : "Speak directly to the reader as “you”",
    v.bold >= 60 ? "Lead with a clear claim backed by proof" : "Let customer outcomes speak first",
  ];
  const dontList = [
    "Promise certifications or results that are not verified",
    v.formal >= 60 ? "Use slang or more than one emoji" : "Hide behind jargon or acronyms",
    v.bold >= 60 ? "Over-hedge with “maybe” or “we try to”" : "Use superlatives like “the best in Egypt”",
  ];
  return { words, doList, dontList };
}
