#!/usr/bin/env node
// Resets the Jahez demo to its starting state before a presentation.
//
// All demo state (deployments, installed services, workspace edits, registered factories,
// notifications) lives in the browser's localStorage, so this script opens the app's
// /reset page in your default browser, which clears it and returns to the start page.
//
// Usage:
//   npm run demo:reset                      # http://localhost:3210
//   npm run demo:reset -- --port 3000
//   npm run demo:reset -- --url https://staging.example.com
//   npm run demo:reset -- --no-open         # only print the reset link
import { spawn } from "node:child_process";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const port = flag("--port") ?? process.env.PORT ?? "3210";
const base = (flag("--url") ?? `http://localhost:${port}`).replace(/\/+$/, "");
const resetUrl = `${base}/reset`;
const noOpen = args.includes("--no-open");

function openInBrowser(url) {
  const platform = process.platform;
  const [cmd, cmdArgs] =
    platform === "win32" ? ["cmd", ["/c", "start", "", url]] : platform === "darwin" ? ["open", [url]] : ["xdg-open", [url]];
  const child = spawn(cmd, cmdArgs, { detached: true, stdio: "ignore" });
  child.on("error", () => console.log(`  Could not open a browser automatically. Open this link manually:\n  ${url}`));
  child.unref();
}

console.log("\nJahez demo reset");
console.log("----------------");

try {
  const res = await fetch(resetUrl, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
} catch (err) {
  console.error(`✖ The app is not reachable at ${base} (${err instanceof Error ? err.message : err}).`);
  console.error("  Start it first, e.g.:  npm run build && npx next start -p 3210");
  process.exit(1);
}

console.log(`✔ App is running at ${base}`);
if (noOpen) {
  console.log(`  Open this link in the browser you will present from:\n  ${resetUrl}\n`);
} else {
  openInBrowser(resetUrl);
  console.log(`✔ Opened ${resetUrl} in your default browser.`);
  console.log("  The page clears all demo data and returns to the start page.");
  console.log("  Presenting from a different browser or profile? Open the same link there too.\n");
}
