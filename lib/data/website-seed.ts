import type { WebsiteContent } from "@/lib/types";

/** AI-generated first draft of the Al Noor Textiles website. Contact details are fictional (demo). */
export const WEBSITE_SEED: WebsiteContent = {
  theme: "teal",
  heroTitle: {
    en: "Cotton knit fabrics and garments, made in Giza since 2009",
    ar: "أقمشة تريكو قطنية وملابس جاهزة، تُصنع في الجيزة منذ عام 2009",
  },
  heroSubtitle: {
    en: "Al Noor Textiles knits, dyes to order and sews premium cotton fabric, polos, workwear and hospital linen for Egyptian brands, institutions and export partners.",
    ar: "تُنتج النور للمنسوجات أقمشة قطنية فاخرة وقمصان بولو وملابس عمل ومفروشات للمستشفيات، مع صباغة حسب الطلب، للعلامات التجارية والمؤسسات المصرية وشركاء التصدير.",
  },
  about: {
    en: "Founded in 2009 in the Abu Rawash Industrial Zone, Al Noor Textiles is a family-run mill with 24 circular knitting machines and a team of 86 skilled people. We turn long-staple Egyptian cotton yarn into single jersey, piqué and interlock fabric, then cut and sew it into garments built to last. Every roll is inspected on the 4-point system before it leaves our floor, and every order — from 300 polos to 40,000 metres of fabric — is handled by one dedicated account lead.",
    ar: "تأسست النور للمنسوجات عام 2009 في المنطقة الصناعية بأبو رواش، وهي مصنع عائلي يضم 24 ماكينة تريكو دائرية وفريقًا من 86 عاملًا ماهرًا. نحوّل غزل القطن المصري طويل التيلة إلى أقمشة سنجل جيرسي وبيكيه وإنترلوك، ثم نقصّها ونخيطها لتصبح ملابس تدوم طويلًا. يُفحص كل رول وفق نظام النقاط الأربع قبل خروجه من المصنع، ويتولى كل طلب — من 300 قميص بولو إلى 40,000 متر من القماش — مسؤول حساب واحد مخصص.",
  },
  products: [
    {
      id: "p-fabric",
      name: { en: "Cotton knit fabric", ar: "أقمشة تريكو قطنية" },
      description: {
        en: "Single jersey, piqué, interlock and rib from 140 to 240 g/m², open-width or tubular, greige or dyed to your Pantone reference.",
        ar: "سنجل جيرسي وبيكيه وإنترلوك وريب بأوزان من 140 إلى 240 جم/م²، مفتوحة أو أنبوبية، خام أو مصبوغة حسب مرجع بانتون الخاص بك.",
      },
    },
    {
      id: "p-polo",
      name: { en: "Polos & T-shirts", ar: "قمصان بولو وتيشيرتات" },
      description: {
        en: "Combed-cotton polos and crew-neck tees with private-label neck tapes, embroidery and screen printing in runs from 300 pieces.",
        ar: "قمصان بولو وتيشيرتات من القطن الممشط مع شرائط رقبة بعلامتك الخاصة وتطريز وطباعة سلك سكرين بدءًا من 300 قطعة.",
      },
    },
    {
      id: "p-workwear",
      name: { en: "Workwear uniforms", ar: "ملابس العمل الموحدة" },
      description: {
        en: "Hard-wearing shirts, trousers and coveralls for factory, logistics and hospitality teams, with reflective trims and company branding.",
        ar: "قمصان وبناطيل وأفرولات متينة لفرق المصانع والخدمات اللوجستية والضيافة، مع أشرطة عاكسة وشعار الشركة.",
      },
    },
    {
      id: "p-linen",
      name: { en: "Hospital linen", ar: "مفروشات المستشفيات" },
      description: {
        en: "Bed sheets, patient gowns and scrubs engineered to withstand repeated industrial laundering at 75 °C without losing shape.",
        ar: "ملاءات أسرّة وأردية مرضى وملابس طبية مصممة لتحمّل الغسيل الصناعي المتكرر عند 75 درجة مئوية دون أن تفقد شكلها.",
      },
    },
  ],
  capabilities: [
    { label: { en: "Circular knitting machines", ar: "ماكينة تريكو دائرية" }, value: "24" },
    { label: { en: "Skilled team members", ar: "عاملًا ماهرًا" }, value: "86" },
    { label: { en: "Tonnes of fabric per year", ar: "طن قماش سنويًا" }, value: "180" },
    { label: { en: "Days, sample to bulk", ar: "يومًا من العينة إلى الإنتاج" }, value: "14" },
  ],
  certifications: [
    "4-point fabric inspection on every roll",
    "ISO 9001:2015 — preparation underway",
    "OEKO-TEX® Standard 100 — application planned",
    "JAHEZ Tier 1 digital readiness — provisional (demo)",
  ],
  contact: {
    phone: "+20 100 000 0417",
    whatsapp: "+20 100 000 0418",
    email: "sales@alnoor-textiles.demo",
    address: {
      en: "Plot 17, Block 4, Abu Rawash Industrial Zone, Giza, Egypt",
      ar: "قطعة 17، بلوك 4، المنطقة الصناعية بأبو رواش، الجيزة، مصر",
    },
  },
  published: false,
};

export type RegenSection = "hero" | "about" | "products" | "capabilities";

/** Pre-written alternates that "Regenerate with AI" cycles through. Index 0 mirrors the seed. */
export const WEBSITE_VARIANTS: {
  hero: Pick<WebsiteContent, "heroTitle" | "heroSubtitle">[];
  about: Pick<WebsiteContent, "about">[];
  products: Pick<WebsiteContent, "products">[];
  capabilities: Pick<WebsiteContent, "capabilities">[];
} = {
  hero: [
    { heroTitle: WEBSITE_SEED.heroTitle, heroSubtitle: WEBSITE_SEED.heroSubtitle },
    {
      heroTitle: { en: "Egyptian cotton, knitted with precision", ar: "قطن مصري، يُحاك بدقة" },
      heroSubtitle: {
        en: "From yarn to finished garment under one roof — 24 circular knitting machines, in-house cutting and sewing, and fast, reliable delivery across Egypt and the region.",
        ar: "من الغزل إلى الملبس النهائي تحت سقف واحد — 24 ماكينة تريكو دائرية، وقص وخياطة داخل المصنع، وتسليم سريع وموثوق في مصر والمنطقة.",
      },
    },
    {
      heroTitle: { en: "Your reliable knitwear partner in Greater Cairo", ar: "شريكك الموثوق في التريكو بالقاهرة الكبرى" },
      heroSubtitle: {
        en: "Private-label polos, uniforms and hospital linen produced to your specification, inspected roll by roll, and delivered on schedule.",
        ar: "قمصان بولو وملابس موحدة ومفروشات مستشفيات بعلامتك الخاصة، تُنتج وفق مواصفاتك، وتُفحص رولًا رولًا، وتُسلَّم في موعدها.",
      },
    },
  ],
  about: [
    { about: WEBSITE_SEED.about },
    {
      about: {
        en: "Al Noor began in 2009 with six knitting machines and a promise to Giza's garment workshops: consistent fabric, delivered when we say it will be. Fifteen years later we run 24 circular machines, a cutting and sewing hall and a quality lab, and we serve hotel groups, hospitals, school-uniform suppliers and export buyers. We are still family-owned, and our customers still speak to the people who make their fabric.",
        ar: "بدأت النور عام 2009 بست ماكينات تريكو ووعدٍ لورش الملابس في الجيزة: قماش ثابت الجودة يُسلَّم في الموعد الذي نحدده. وبعد خمسة عشر عامًا نُشغّل 24 ماكينة دائرية وصالة للقص والخياطة ومعملًا للجودة، ونخدم مجموعات فندقية ومستشفيات وموردي الزي المدرسي ومشترين للتصدير. ما زلنا شركة عائلية، وما زال عملاؤنا يتحدثون مباشرة مع من يصنعون أقمشتهم.",
      },
    },
  ],
  products: [
    { products: WEBSITE_SEED.products },
    {
      products: [
        {
          id: "p-fabric",
          name: { en: "Knit fabric by the roll", ar: "أقمشة تريكو بالرول" },
          description: {
            en: "Jersey, piqué, interlock and 1×1 / 2×2 rib knitted on 24 circular machines, available greige, bleached or reactive-dyed.",
            ar: "جيرسي وبيكيه وإنترلوك وريب 1×1 و2×2 على 24 ماكينة دائرية، متاحة خام أو مبيضة أو مصبوغة بالصبغات النشطة.",
          },
        },
        {
          id: "p-polo",
          name: { en: "Private-label polos & tees", ar: "بولو وتيشيرتات بعلامتك" },
          description: {
            en: "Your brand, our craft: custom collars, woven labels and embroidered logos with full size-set approval before bulk.",
            ar: "علامتك وصنعتنا: ياقات مخصصة وملصقات منسوجة وشعارات مطرزة مع اعتماد طقم المقاسات كاملًا قبل الإنتاج.",
          },
        },
        {
          id: "p-workwear",
          name: { en: "Corporate & industrial uniforms", ar: "الزي الموحد للشركات والمصانع" },
          description: {
            en: "Uniform programmes for teams of 50 to 5,000, with reorder stock held for you and consistent shade from batch to batch.",
            ar: "برامج زي موحد لفرق من 50 إلى 5,000 فرد، مع مخزون إعادة طلب محجوز لك وثبات اللون من دفعة إلى أخرى.",
          },
        },
        {
          id: "p-linen",
          name: { en: "Healthcare textiles", ar: "منسوجات الرعاية الصحية" },
          description: {
            en: "Durable sheets, gowns and scrubs for hospitals and clinics, colour-coded by department and tested for shrinkage after 50 washes.",
            ar: "ملاءات وأردية وملابس طبية متينة للمستشفيات والعيادات، بألوان مميزة لكل قسم ومختبرة للانكماش بعد 50 غسلة.",
          },
        },
      ],
    },
  ],
  capabilities: [
    { capabilities: WEBSITE_SEED.capabilities },
    {
      capabilities: [
        { label: { en: "Years of knitting", ar: "عامًا في صناعة التريكو" }, value: "15+" },
        { label: { en: "Garments sewn per month", ar: "قطعة تُخاط شهريًا" }, value: "45k" },
        { label: { en: "Rolls inspected 4-point", ar: "من الرولات تُفحص بنظام النقاط الأربع" }, value: "100%" },
        { label: { en: "On-time delivery (2024)", ar: "تسليم في الموعد (2024)" }, value: "96%" },
      ],
    },
  ],
};
