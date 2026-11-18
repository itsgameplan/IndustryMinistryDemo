import type { NextConfig } from "next";

// JAHEZ is a fully client-side demo (persisted Zustand state, live simulated telemetry),
// so Cache Components / partial prefetching are intentionally left off.
const nextConfig: NextConfig = {
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
