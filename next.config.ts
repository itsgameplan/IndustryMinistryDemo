import type { NextConfig } from "next";

// JAHEZ is a fully client-side demo (persisted Zustand state, live simulated telemetry),
// so Cache Components / partial prefetching are intentionally left off.
const nextConfig: NextConfig = {
  // Stock photography for the demo factory website (Unsplash, free licence).
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "flagcdn.com" },
    ],
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
