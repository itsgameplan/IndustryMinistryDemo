# Jahez · جاهز — Factory Digital Transformation (Demo)

A premium, fully client-side demonstration of an AI-powered factory digital-transformation SaaS prepared for the Egyptian Ministry of Industry.

> **Demonstration only.** All factories, licences, inspections, assessments and national statistics are fictional simulations. Nothing here is an official Ministry of Industry record or authorisation.

## Run

```bash
npm install
npm run dev        # http://localhost:3000
# or a production build
npm run build && npm start
```

Optional: copy `.env.example` to `.env.local` and set `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` to use Google Maps satellite imagery. Without it the satellite module uses Esri World Imagery tiles (and a stylised fallback if offline).

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · shadcn-style primitives (Radix) · Motion · Zustand (localStorage persistence) · Recharts · React Three Fiber + Drei · Leaflet / Google Maps · Lucide.

## Architecture

| Area | Location |
| --- | --- |
| Data contracts | `lib/types.ts` |
| Mock data (tiers, factories, solutions, machines) | `lib/data/` |
| Global state, tier logic, deployment progress | `lib/store.ts` |
| Shared simulated telemetry (twin + maintenance) | `lib/telemetry.ts` |
| Simulated deployment engine (45 s, survives navigation/refresh) | `components/shell/deployment-ticker.tsx` |
| App shell, factory switcher, notifications, Reset Demo | `components/shell/` |
| UI primitives | `components/ui/index.tsx` |
| Pages | `app/page.tsx` (landing), `app/(app)/*` (factory app), `app/verify`, `app/ministry` |

Tier rule: a factory's tier is the highest tier whose requirements — and every lower tier's — are all satisfied (`computeTier`). Deployed solutions satisfy specific requirements; results are always labelled *provisional until evidence review and inspection*.

## Demo script

1. Open `/` and choose **Al Noor Textiles** (Tier 0).
2. **Overview** → digital maturity; **Maturity assessment** → run the AI classification.
3. **Transformation roadmap** → see Tier 1 requirements.
4. **AI solutions** → *Build with AI* on the Website Builder; watch the 45 s agent deployment (navigate away freely — a notification appears when done). Open and edit the bilingual site.
5. Repeat for **Compliance & SOP Agent**; review, edit and approve policies. Al Noor becomes *Ready for Tier 1 verification*.
6. **Satellite intelligence** → draw/adjust the site boundary, read area in m²/ft², generate the site analysis.
7. Switch to **Delta Precision Manufacturing** (Tier 3) from the sidebar.
8. **3D digital twin** → orbit, click IoT sensor hotspots (CNC-07 is the at-risk machine).
9. Deploy **Predictive Maintenance** and explore health, RUL, alerts and scheduling.
10. **Licence verification** → check `DEMO-LIC-AN-0417` / `DEMO-LIC-DP-0982`.
11. **Ministry dashboard** → nationwide (simulated) transformation view; the two demo factories update live.

Use **Reset demo** in the top bar to restore the initial state.
