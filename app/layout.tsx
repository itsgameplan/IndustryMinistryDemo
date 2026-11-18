import type { Metadata } from "next";
import { Inter, IBM_Plex_Sans_Arabic } from "next/font/google";
import { Toaster } from "sonner";
import { DeploymentTicker } from "@/components/shell/deployment-ticker";
import "leaflet/dist/leaflet.css";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const plexArabic = IBM_Plex_Sans_Arabic({ variable: "--font-plex-arabic", subsets: ["arabic"], weight: ["400", "500", "600", "700"] });

export const metadata: Metadata = {
  title: "Jahez · جاهز — Factory Digital Transformation",
  description: "AI-powered factory digital maturity, transformation and intelligence platform (demonstration).",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${inter.variable} ${plexArabic.variable} h-full antialiased`}>
      <body className="min-h-full">
        {children}
        <DeploymentTicker />
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  );
}
