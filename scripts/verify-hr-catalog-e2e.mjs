/**
 * Full HR catalog persistence verification: DB + API parity, CRUD, cleanup.
 * Usage: node scripts/verify-hr-catalog-e2e.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3001";
const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const ROLE_ID = "__efp_e2e_verify_role__";
const DISK_PATH = path.join(process.cwd(), "data", "hr-workforce-persist.json");
const LEGACY_LS_KEY = "efp-hr-workforce";
const NAMESPACED_LS_SUFFIX = `efp-${ORG_ID}-hr-workforce`;

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

function roleNames(payload) {
  return (payload?.roles ?? []).map((r) => r?.name).filter(Boolean);
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function apiGet() {
  const res = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  const text = await res.text();
  assert(res.ok, `GET ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function apiPut(catalog, expectedUpdatedAt) {
  const res = await fetch(`${BASE}/api/org/hr-catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      catalog,
      engineVersion: "1",
      ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
    }),
  });
  const text = await res.text();
  assert(res.ok, `PUT ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function main() {
  loadEnvLocal();

  console.log("=== 1. Clean legacy disk ===");
  if (fs.existsSync(DISK_PATH)) {
    fs.unlinkSync(DISK_PATH);
    console.log("Removed", DISK_PATH);
  }
  assert(!fs.existsSync(DISK_PATH), "Disk file should be absent");

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && key, "Supabase env required");

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  console.log("=== 2. Load baseline from DB ===");
  const { data: baselineRow, error: baseErr } = await supabase
    .from("hr_workforce_catalog")
    .select("payload, updated_at")
    .eq("organization_id", ORG_ID)
    .maybeSingle();
  if (baseErr) throw new Error(baseErr.message);

  const baseline =
    baselineRow?.payload && typeof baselineRow.payload === "object"
      ? structuredClone(baselineRow.payload)
      : {
          businessUnits: [],
          departments: [],
          teams: [],
          roles: [],
          hrGlobalSettings: {
            workingDaysPerWeek: 5,
            workingHoursPerDay: 8,
            weeksPerYear: 52,
            offDaysPerYear: 0,
            defaultCurrency: "USD",
          },
          ohManualByBusinessUnitId: {},
          importLogs: [],
          snapshots: [],
        };

  const buId =
    baseline.businessUnits?.[0]?.id ??
    (() => {
      throw new Error("Catalog has no business units — seed HR data first");
    })();
  const deptId =
    baseline.departments?.find((d) => d.businessUnitId === buId)?.id ??
    baseline.departments?.[0]?.id ??
    (() => {
      throw new Error("Catalog has no departments — seed HR data first");
    })();

  const roles = (baseline.roles ?? []).filter((r) => r?.id !== ROLE_ID);
  let catalog = { ...baseline, roles };
  let serverUpdatedAt = baselineRow?.updated_at ?? null;

  console.log("=== 3. CREATE test role via API (PUT 200) ===");
  const createName = `EFP_E2E_CREATE_${Date.now()}`;
  catalog = {
    ...catalog,
    roles: [
      ...roles,
      {
        id: ROLE_ID,
        businessUnitId: buId,
        departmentId: deptId,
        teamId: null,
        name: createName,
        employmentType: "full_time",
        employeeCount: 1,
        currency: "USD",
        avgMonthlySalary: 1000,
        avgMonthlySocialInsurance: 0,
        annualMedicalInsurance: 0,
        annualEndOfServiceCost: 0,
        riskFactorPct: 0,
        isBillable: true,
        includeInOhAllocation: true,
        additionalCosts: [],
      },
    ],
  };

  const put1 = await apiPut(catalog);
  assert(put1.meta?.updatedAt, "PUT create missing meta.updatedAt");
  serverUpdatedAt = put1.meta.updatedAt;
  console.log("PUT create 200, updatedAt:", serverUpdatedAt);

  await new Promise((r) => setTimeout(r, 600));

  console.log("=== 4. Simulated refresh: GET + DB read ===");
  const apiAfterCreate = await apiGet();
  const { data: dbAfterCreate } = await supabase
    .from("hr_workforce_catalog")
    .select("payload")
    .eq("organization_id", ORG_ID)
    .single();

  assert(roleNames(apiAfterCreate.catalog).includes(createName), "GET missing created role");
  assert(roleNames(dbAfterCreate.payload).includes(createName), "DB missing created role");
  assert(
    JSON.stringify(apiAfterCreate.catalog.roles) === JSON.stringify(dbAfterCreate.payload.roles),
    "GET roles !== DB roles after create"
  );

  console.log("=== 5. EDIT test role (PUT 200) ===");
  const editName = `${createName}_EDITED`;
  catalog = {
    ...catalog,
    roles: catalog.roles.map((r) => (r.id === ROLE_ID ? { ...r, name: editName } : r)),
  };
  const put2 = await apiPut(catalog, serverUpdatedAt);
  serverUpdatedAt = put2.meta.updatedAt;
  console.log("PUT edit 200, updatedAt:", serverUpdatedAt);

  await new Promise((r) => setTimeout(r, 600));

  const apiAfterEdit = await apiGet();
  const { data: dbAfterEdit } = await supabase
    .from("hr_workforce_catalog")
    .select("payload")
    .eq("organization_id", ORG_ID)
    .single();
  assert(roleNames(apiAfterEdit.catalog).includes(editName), "GET missing edited name");
  assert(!roleNames(apiAfterEdit.catalog).includes(createName), "GET still has old name");
  assert(
    JSON.stringify(apiAfterEdit.catalog.roles) === JSON.stringify(dbAfterEdit.payload.roles),
    "GET roles !== DB roles after edit"
  );

  console.log("=== 6. DELETE test role (PUT 200) ===");
  catalog = { ...catalog, roles: catalog.roles.filter((r) => r.id !== ROLE_ID) };
  const put3 = await apiPut(catalog, serverUpdatedAt);
  serverUpdatedAt = put3.meta.updatedAt;
  console.log("PUT delete 200");

  await new Promise((r) => setTimeout(r, 600));

  const apiAfterDelete = await apiGet();
  const { data: dbAfterDelete } = await supabase
    .from("hr_workforce_catalog")
    .select("payload")
    .eq("organization_id", ORG_ID)
    .single();
  const namesAfter = roleNames(apiAfterDelete.catalog);
  assert(!namesAfter.some((n) => String(n).includes("EFP_E2E")), "Test role still in GET");
  assert(
    JSON.stringify(apiAfterDelete.catalog.roles) === JSON.stringify(dbAfterDelete.payload.roles),
    "GET roles !== DB roles after delete"
  );

  console.log("=== 7. Restore baseline & cleanup ===");
  const restoreCatalog = {
    ...baseline,
    roles: (baseline.roles ?? []).filter(
      (r) => r?.id !== ROLE_ID && !String(r?.name ?? "").includes("EFP_E2E")
    ),
  };
  const putRestore = await apiPut(restoreCatalog, serverUpdatedAt);

  const { data: finalDb } = await supabase
    .from("hr_workforce_catalog")
    .select("payload")
    .eq("organization_id", ORG_ID)
    .single();
  const leftover = roleNames(finalDb.payload).filter((n) => String(n).includes("EFP_E2E"));
  if (leftover.length > 0) {
    const scrubbed = {
      ...finalDb.payload,
      roles: (finalDb.payload.roles ?? []).filter(
        (r) => !String(r?.name ?? "").includes("EFP_E2E") && r?.id !== ROLE_ID
      ),
    };
    await apiPut(scrubbed, putRestore.meta.updatedAt);
    const { data: final2 } = await supabase
      .from("hr_workforce_catalog")
      .select("payload")
      .eq("organization_id", ORG_ID)
      .single();
    assert(
      !roleNames(final2.payload).some((n) => String(n).includes("EFP_E2E")),
      `Cleanup failed in DB: ${leftover.join(", ")}`
    );
  }

  console.log("=== 8. Persistence key contract ===");
  console.log("  Legacy key (must NOT be used):", LEGACY_LS_KEY);
  console.log("  Namespaced key (required):", NAMESPACED_LS_SUFFIX);
  console.log("  Disk mirror path (must be absent):", DISK_PATH, "exists:", fs.existsSync(DISK_PATH));

  console.log("\nOK: Full E2E verification passed.");
  console.log("Browser: open HR page, confirm window.__EFP_HR_HYDRATION_DEBUG:");
  console.log("  source === 'server', pendingUplift === false, usingLegacyFallback === false");
}

main().catch((e) => {
  console.error("E2E FAIL:", e.message);
  process.exit(1);
});
