// Royalty-free photos from Unsplash (free licence, not Unsplash+) used by the generated factory website.
// Served from images.unsplash.com; sizes are requested via the imgix URL parameters.

export interface SitePhoto {
  id: string;
  alt: string;
}

export const unsplashUrl = (p: SitePhoto, w: number) => `https://images.unsplash.com/photo-${p.id}?auto=format&fit=crop&w=${w}&q=75`;

export const SITE_PHOTOS = {
  heroBackdrop: { id: "1748944084924-bef8de7650f5", alt: "Workers on a busy textile factory floor" },
  heroFeature: { id: "1757852636019-711d501cc50c", alt: "Workers operating looms in a textile factory" },
  about: { id: "1741176508062-a79aa6b48bdc", alt: "Inside an industrial textile manufacturing facility" },
  products: {
    fabric: { id: "1534639077088-d702bcf685e7", alt: "Rolls of white cotton fabric" },
    polo: { id: "1742485247299-a361dd53b1b7", alt: "Factory worker folding finished garments" },
    workwear: { id: "1612787114413-a5e60ede7db8", alt: "Worker wearing a green work jacket and safety helmet" },
    linen: { id: "1741183393418-d2dc85b903e6", alt: "Workers folding and organising towels and linen" },
    generic: { id: "1771098206944-ac1633b8276d", alt: "Rolls of colourful fabric stacked horizontally" },
  },
  process: [
    { id: "1742281694007-19df8063176e", alt: "Factory worker operating textile machinery" },
    { id: "1771098403216-ca0c3c2858c0", alt: "Rolls of dyed, patterned fabric" },
    { id: "1741176507465-14cf659db0b8", alt: "Workers operating sewing machines" },
    { id: "1742967420800-b2d27be6eedc", alt: "Workers inspecting fabric at a textile factory" },
  ],
} satisfies {
  heroBackdrop: SitePhoto;
  heroFeature: SitePhoto;
  about: SitePhoto;
  products: Record<string, SitePhoto>;
  process: SitePhoto[];
};
