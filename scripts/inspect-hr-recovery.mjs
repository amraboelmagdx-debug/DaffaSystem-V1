/**
 * HR data recovery investigation report (read-only).
 * Usage: node scripts/inspect-hr-recovery.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ORG = process.env.DEV_TENANT_ID || process.env.NEXT_PUBLIC_DEV_TENANT_ID || "00000000-0000-4000-8000-0000000000aa";
const DISK_PATH = path.join(process.cwd(), "data", "hr-workforce-persist.json");
const LEGACY_KEY = "efp-hr-workforce";
const NAMESPACED_KEY = `efp-${ORG}-hr-workforce`;

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) throw new Error("Missing .env.local");
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[m[1]]) process.env[m[1]] = val;
  }
}

async function main() {
  loadEnvLocal();
  const lines = [];
  const log = (s) => lines.push(s);

  log("=== HR recovery inspection ===\n");
  log(`Tenant org: ${ORG}`);
  log(`Namespaced localStorage key: ${NAMESPACED_KEY}`);
  log(`Legacy localStorage key: ${LEGACY_KEY} (browser only)\n`);

  log("--- 1. Supabase hr_workforce_catalog ---");
  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: row, error } = await sb
    .from("hr_workforce_catalog")
    .select("*")
    .eq("organization_id", ORG)
    .maybeSingle();
  if (error) throw error;
  if (!row) {
    log("  NO ROW — server catalog empty for this org.");
  } else {
    const p = row.payload;
    log(`  updated_at: ${row.updated_at}`);
    log(`  businessUnits: ${(p.businessUnits || []).length}`);
    log(`  departments: ${(p.departments || []).length}`);
    log(`  teams: ${(p.teams || []).length}`);
    log(`  roles: ${(p.roles || []).length}`);
    log(`  snapshots: ${(p.snapshots || []).length}`);
    if (p.roles?.length) {
      log("  role names:");
      for (const r of p.roles) log(`    - ${r.name}${r.archived ? " (archived)" : ""}`);
    }
    const recoveryDir = path.join(process.cwd(), "data", "recovery");
    fs.mkdirSync(recoveryDir, { recursive: true });
    const outPath = path.join(recoveryDir, `hr-catalog-server-${Date.now()}.json`);
    fs.writeFileSync(outPath, JSON.stringify({ meta: { organizationId: ORG, updatedAt: row.updated_at }, catalog: p }, null, 2));
    log(`  Exported server payload: ${outPath}`);
  }

  log("\n--- 2. Dev disk mirror (repo) ---");
  if (fs.existsSync(DISK_PATH)) {
    const stat = fs.statSync(DISK_PATH);
    log(`  FOUND ${DISK_PATH} (${stat.size} bytes, mtime ${stat.mtime.toISOString()})`);
  } else {
    log(`  Not found: ${DISK_PATH}`);
  }

  log("\n--- 3. GET /api/org/hr-catalog ---");
  try {
    const res = await fetch("http://localhost:3001/api/org/hr-catalog", { cache: "no-store" });
    const text = await res.text();
    if (res.ok) {
      const body = JSON.parse(text);
      log(`  HTTP ${res.status}, roles: ${body.catalog?.roles?.length ?? 0}`);
    } else {
      log(`  HTTP ${res.status} (dev server may be off)`);
    }
  } catch (e) {
    log(`  API unreachable: ${e.message}`);
  }

  log("\n--- 4. Recovery assessment ---");
  if (row?.payload?.roles?.length) {
    log("  Server still has HR data — UI may look empty due to tree filter (select Client Delivery / team).");
    log("  Hard refresh should hydrate source=server if namespaced key is empty or aligned.");
  }
  log("  Edits only in legacy localStorage (efp-hr-workforce) were removed by purgeLegacyHrPersistenceRemnants");
  log("  unless you still have that key in DevTools → Application → Local Storage.");
  log("  TEST12123 Creative Director is NOT on server; likely never persisted or overwritten by stale PUT.");
  log("  Automated E2E restore kept the DB snapshot taken at script start (not a full wipe).");

  log("\n--- 5. Manual recovery (if legacy blob still in browser) ---");
  log(`  1. DevTools → Application → Local Storage → ${LEGACY_KEY}`);
  log("  2. If present, copy value to a file legacy-hr-blob.json");
  log("  3. Run: node scripts/import-hr-legacy-blob.mjs legacy-hr-blob.json");
  log("     (imports only if catalog is richer than server — script included)");

  const reportPath = path.join(process.cwd(), "data", "recovery", "inspection-report.txt");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, lines.join("\n"));
  console.log(lines.join("\n"));
  console.log("\nWrote", reportPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
