/**
 * One-time import: legacy or exported Zustand persist blob → server (tenant org only).
 * Usage: node scripts/import-hr-legacy-blob.mjs <path-to-json>
 *
 * Safety: refuses if server catalog has more roles than import unless --force
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ORG = process.env.DEV_TENANT_ID || process.env.NEXT_PUBLIC_DEV_TENANT_ID || "00000000-0000-4000-8000-0000000000aa";
const force = process.argv.includes("--force");
const filePath = process.argv.find((a) => !a.startsWith("-") && a.endsWith(".json"));

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

function catalogFromBlob(raw) {
  const parsed = JSON.parse(raw);
  const state = parsed.state ?? parsed;
  const keys = [
    "businessUnits",
    "departments",
    "teams",
    "roles",
    "hrGlobalSettings",
    "ohManualByBusinessUnitId",
    "importLogs",
    "snapshots",
  ];
  const catalog = {};
  for (const k of keys) {
    if (k in state) catalog[k] = state[k];
  }
  return catalog;
}

async function main() {
  if (!filePath || !fs.existsSync(filePath)) {
    console.error("Usage: node scripts/import-hr-legacy-blob.mjs <persist-blob.json> [--force]");
    process.exit(1);
  }
  loadEnvLocal();
  const catalog = catalogFromBlob(fs.readFileSync(filePath, "utf8"));
  const importRoles = (catalog.roles || []).filter((r) => !r.archived).length;

  const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  const { data: row } = await sb
    .from("hr_workforce_catalog")
    .select("payload, updated_at")
    .eq("organization_id", ORG)
    .maybeSingle();

  const serverRoles = (row?.payload?.roles || []).filter((r) => !r.archived).length;
  if (!force && row && serverRoles > importRoles) {
    console.error(
      `Refusing import: server has ${serverRoles} active roles, blob has ${importRoles}. Use --force to overwrite.`
    );
    process.exit(1);
  }

  const { error } = await sb.from("hr_workforce_catalog").upsert(
    {
      organization_id: ORG,
      payload: catalog,
      engine_version: "1",
      updated_by: "00000000-0000-4000-8000-000000000099",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );
  if (error) throw error;

  console.log(`OK: Imported catalog to org ${ORG} (${importRoles} active roles).`);
  console.log("Hard-refresh the app; hydration should show source=server.");
}

main().catch((e) => {
  console.error("Import failed:", e.message);
  process.exit(1);
});
