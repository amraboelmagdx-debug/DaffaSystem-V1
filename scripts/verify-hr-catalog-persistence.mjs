/**
 * End-to-end HR catalog persistence check (local Supabase + service role).
 * Usage: node scripts/verify-hr-catalog-persistence.mjs
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const MARKER_ROLE_ID = "__efp_persist_verify_role__";
const MARKER_NAME_PREFIX = "EFP_PERSIST_VERIFY_";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) {
    throw new Error("Missing .env.local — run supabase start and copy keys from `npx supabase status -o env`");
  }
  const text = fs.readFileSync(envPath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function roleNames(payload) {
  const roles = payload?.roles;
  if (!Array.isArray(roles)) return [];
  return roles.map((r) => r?.name).filter(Boolean);
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required in .env.local");
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: row, error: loadErr } = await supabase
    .from("hr_workforce_catalog")
    .select("payload, updated_at")
    .eq("organization_id", ORG_ID)
    .maybeSingle();

  if (loadErr) throw new Error(loadErr.message);

  const originalPayload =
    row?.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? structuredClone(row.payload)
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

  const markerName = `${MARKER_NAME_PREFIX}${Date.now()}`;
  const roles = Array.isArray(originalPayload.roles) ? [...originalPayload.roles] : [];
  const withoutOld = roles.filter((r) => r?.id !== MARKER_ROLE_ID);
  const buId =
    (Array.isArray(originalPayload.businessUnits) && originalPayload.businessUnits[0]?.id) ||
    "bu_verify";
  const deptId =
    (Array.isArray(originalPayload.departments) && originalPayload.departments[0]?.id) ||
    "dept_verify";

  const testPayload = {
    ...originalPayload,
    roles: [
      ...withoutOld,
      {
        id: MARKER_ROLE_ID,
        businessUnitId: buId,
        departmentId: deptId,
        teamId: null,
        name: markerName,
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

  const updatedAt = new Date().toISOString();
  const { error: upsertErr } = await supabase.from("hr_workforce_catalog").upsert(
    {
      organization_id: ORG_ID,
      payload: testPayload,
      engine_version: "1",
      updated_by: "00000000-0000-4000-8000-000000000099",
      updated_at: updatedAt,
    },
    { onConflict: "organization_id" }
  );
  if (upsertErr) throw new Error(upsertErr.message);

  const { data: afterWrite, error: readErr } = await supabase
    .from("hr_workforce_catalog")
    .select("payload, updated_at")
    .eq("organization_id", ORG_ID)
    .single();
  if (readErr) throw new Error(readErr.message);

  const namesAfterWrite = roleNames(afterWrite.payload);
  if (!namesAfterWrite.includes(markerName)) {
    throw new Error(`DB missing marker after write. Roles: ${namesAfterWrite.join(", ")}`);
  }

  const deletePayload = {
    ...testPayload,
    roles: withoutOld,
  };
  const { error: deleteErr } = await supabase.from("hr_workforce_catalog").upsert(
    {
      organization_id: ORG_ID,
      payload: deletePayload,
      engine_version: "1",
      updated_by: "00000000-0000-4000-8000-000000000099",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id" }
  );
  if (deleteErr) throw new Error(deleteErr.message);

  const { data: afterDelete } = await supabase
    .from("hr_workforce_catalog")
    .select("payload")
    .eq("organization_id", ORG_ID)
    .single();

  const namesAfterDelete = roleNames(afterDelete.payload);
  if (namesAfterDelete.some((n) => String(n).includes(MARKER_NAME_PREFIX))) {
    throw new Error(`Marker role still in DB after delete: ${namesAfterDelete.join(", ")}`);
  }

  if (row?.payload) {
    const { error: restoreErr } = await supabase.from("hr_workforce_catalog").upsert(
      {
        organization_id: ORG_ID,
        payload: originalPayload,
        engine_version: "1",
        updated_by: "00000000-0000-4000-8000-000000000099",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    );
    if (restoreErr) throw new Error(restoreErr.message);
  }

  console.log("OK: HR catalog DB write, read, delete, and restore verified for org", ORG_ID);
}

main().catch((err) => {
  console.error("FAIL:", err.message);
  process.exit(1);
});
