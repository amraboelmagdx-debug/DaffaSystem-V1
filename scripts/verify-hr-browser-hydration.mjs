/**
 * Browser verification: hydration debug + localStorage keys (requires dev server).
 * Usage: node scripts/verify-hr-browser-hydration.mjs [baseUrl]
 */
import { chromium } from "playwright";

const BASE = process.argv[2] ?? "http://localhost:3001";
const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const LEGACY_KEY = "efp-hr-workforce";
const NAMESPACED_KEY = `efp-${ORG_ID}-hr-workforce`;

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto(`${BASE}/en/hr-workforce/roles`, { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);

  const snapshot = await page.evaluate(() => {
    const d = window.__EFP_HR_HYDRATION_DEBUG?.getSnapshot?.();
    return d ?? null;
  });

  const storage = await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    return {
      keys: keys.filter((k) => k.includes("hr-workforce") || k === "efp-hr-workforce"),
      hasLegacy: localStorage.getItem("efp-hr-workforce") != null,
      namespaced: localStorage.getItem(`efp-${"00000000-0000-4000-8000-0000000000aa"}-hr-workforce`) != null,
    };
  });

  await browser.close();

  if (!snapshot) {
    throw new Error("__EFP_HR_HYDRATION_DEBUG snapshot missing (not in development?)");
  }
  if (snapshot.source !== "server") {
    throw new Error(`Expected source=server, got ${snapshot.source}`);
  }
  if (snapshot.pendingUplift !== false) {
    throw new Error(`Expected pendingUplift=false, got ${snapshot.pendingUplift}`);
  }
  if (snapshot.persist?.usingLegacyFallback === true) {
    throw new Error("usingLegacyFallback should be false");
  }
  if (storage.hasLegacy) {
    throw new Error(`Legacy key ${LEGACY_KEY} still present in localStorage`);
  }
  if (!storage.namespaced) {
    throw new Error(`Namespaced key ${NAMESPACED_KEY} missing after hydrate`);
  }

  console.log("OK: Browser hydration verification passed");
  console.log(JSON.stringify({ snapshot, storage }, null, 2));
}

main().catch((e) => {
  console.error("BROWSER VERIFY FAIL:", e.message);
  process.exit(1);
});
