/**
 * Verifies Next.js GET/PUT /api/org/service-catalog round-trip (dev tenant bypass).
 * Requires an existing HR catalog row with at least one business unit.
 * Usage: node scripts/verify-service-catalog-api.mjs [baseUrl]
 */
import fs from "fs";
import path from "path";

const BASE = process.argv[2] ?? "http://localhost:3001";
const MARKER_FAMILY_CODE = "EFP_SA_API_VERIFY";

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

  const hrRes = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  if (!hrRes.ok) {
    throw new Error(`HR GET failed (required): ${hrRes.status} ${await hrRes.text()}`);
  }
  const hrBody = await hrRes.json();
  const buId = hrBody.catalog?.businessUnits?.[0]?.id;
  if (!buId) {
    throw new Error("HR catalog has no business units; seed HR first");
  }

  const getRes = await fetch(`${BASE}/api/org/service-catalog`, { cache: "no-store" });
  let catalog = {};
  if (getRes.status === 404) {
    catalog = {
      serviceFamilies: [],
      serviceTiers: [],
      serviceTemplates: [],
      serviceTemplateTiers: [],
      deliveryPhases: [],
      serviceTemplateTierPhases: [],
      serviceDeliverables: [],
      serviceRoleAllocations: [],
    };
  } else if (!getRes.ok) {
    throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  } else {
    const getBody = await getRes.json();
    catalog = getBody.catalog ?? catalog;
  }

  const families = Array.isArray(catalog.serviceFamilies) ? [...catalog.serviceFamilies] : [];
  const filtered = families.filter((f) => f?.code !== MARKER_FAMILY_CODE);
  const marker = {
    id: `svc_family_verify_${Date.now()}`,
    name: `Verify ${Date.now()}`,
    code: MARKER_FAMILY_CODE,
    lifecycle: "draft",
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const withMarker = {
    ...catalog,
    serviceFamilies: [...filtered, marker],
    serviceTiers: catalog.serviceTiers ?? [],
    serviceTemplates: catalog.serviceTemplates ?? [],
    serviceTemplateTiers: catalog.serviceTemplateTiers ?? [],
    deliveryPhases: catalog.deliveryPhases ?? [],
    serviceTemplateTierPhases: catalog.serviceTemplateTierPhases ?? [],
    serviceDeliverables: catalog.serviceDeliverables ?? [],
    serviceRoleAllocations: catalog.serviceRoleAllocations ?? [],
  };

  const putRes = await fetch(`${BASE}/api/org/service-catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ catalog: withMarker, engineVersion: "1" }),
  });
  if (!putRes.ok) {
    throw new Error(`PUT (add) failed: ${putRes.status} ${await putRes.text()}`);
  }
  const putMeta = (await putRes.json()).meta;

  const get2 = await fetch(`${BASE}/api/org/service-catalog`, { cache: "no-store" });
  const body2 = await get2.json();
  const codes = (body2.catalog?.serviceFamilies ?? []).map((f) => f.code);
  if (!codes.includes(MARKER_FAMILY_CODE)) {
    throw new Error(`GET after PUT missing marker family. Got: ${codes.join(", ")}`);
  }

  const withoutMarker = {
    ...withMarker,
    serviceFamilies: withMarker.serviceFamilies.filter((f) => f.code !== MARKER_FAMILY_CODE),
  };
  const delRes = await fetch(`${BASE}/api/org/service-catalog`, {
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

  const get3 = await fetch(`${BASE}/api/org/service-catalog`, { cache: "no-store" });
  const codes3 = (await get3.json()).catalog?.serviceFamilies?.map((f) => f.code) ?? [];
  if (codes3.includes(MARKER_FAMILY_CODE)) {
    throw new Error(`Marker family still present after delete`);
  }

  console.log("OK: service-catalog API GET/PUT round-trip verified at", BASE);
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
