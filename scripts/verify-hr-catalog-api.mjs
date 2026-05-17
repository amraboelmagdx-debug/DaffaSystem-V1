/**
 * Verifies Next.js GET/PUT /api/org/hr-catalog round-trip (dev tenant bypass).
 * Usage: node scripts/verify-hr-catalog-api.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";

const BASE = process.argv[2] ?? "http://localhost:3001";
const MARKER_ROLE_ID = "__efp_api_verify_role__";
const MARKER_PREFIX = "EFP_API_VERIFY_";

function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
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

  const getRes = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  if (!getRes.ok) {
    throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  }
  const getBody = await getRes.json();
  const catalog = getBody.catalog ?? {};
  const roles = Array.isArray(catalog.roles) ? [...catalog.roles] : [];
  const markerName = `${MARKER_PREFIX}${Date.now()}`;
  const buId = catalog.businessUnits?.[0]?.id ?? "bu_verify";
  const deptId = catalog.departments?.[0]?.id ?? "dept_verify";

  const withMarker = {
    ...catalog,
    roles: [
      ...roles.filter((r) => r?.id !== MARKER_ROLE_ID),
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

  const putRes = await fetch(`${BASE}/api/org/hr-catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalog: withMarker, engineVersion: "1" }),
  });
  if (!putRes.ok) {
    throw new Error(`PUT (add) failed: ${putRes.status} ${await putRes.text()}`);
  }
  const putMeta = (await putRes.json()).meta;

  const get2 = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  const body2 = await get2.json();
  const names2 = (body2.catalog?.roles ?? []).map((r) => r.name);
  if (!names2.includes(markerName)) {
    throw new Error(`GET after PUT missing marker. Got: ${names2.join(", ")}`);
  }

  const withoutMarker = {
    ...withMarker,
    roles: withMarker.roles.filter((r) => r.id !== MARKER_ROLE_ID),
  };
  const delRes = await fetch(`${BASE}/api/org/hr-catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      catalog: withoutMarker,
      engineVersion: "1",
      expectedUpdatedAt: putMeta.updatedAt,
    }),
  });
  if (!delRes.ok) {
    throw new Error(`PUT (delete) failed: ${delRes.status} ${await delRes.text()}`);
  }

  const get3 = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  const names3 = (await get3.json()).catalog?.roles?.map((r) => r.name) ?? [];
  if (names3.some((n) => String(n).includes(MARKER_PREFIX))) {
    throw new Error(`Marker still present after delete: ${names3.join(", ")}`);
  }

  console.log("OK: API GET/PUT round-trip verified at", BASE);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
