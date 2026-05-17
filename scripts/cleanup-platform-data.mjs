/**
 * Removes dev/test pollution from HR catalog on the server and optional disk mirror.
 * Usage: node scripts/cleanup-platform-data.mjs [baseUrl] [--dry-run]
 */
import fs from "fs";
import path from "path";

const BASE = process.argv.find((a) => a.startsWith("http")) ?? "http://localhost:3001";
const DRY_RUN = process.argv.includes("--dry-run");

const TEST_NAME = (n) => {
  if (!n || typeof n !== "string") return false;
  const s = n.trim();
  if (/^EFP_/i.test(s)) return true;
  if (/^TEST\s*\d/i.test(s)) return true;
  if (/^TEST\s+\d/i.test(s)) return true;
  if (/EFP_(E2E|PERSIST|VITEST|API)_/i.test(s)) return true;
  return false;
};

const TEST_ID = (id) => {
  if (!id || typeof id !== "string") return false;
  return /^__efp_/i.test(id) || /^role_efp_/i.test(id);
};

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

function scrubCatalog(catalog) {
  const rolesBefore = Array.isArray(catalog.roles) ? catalog.roles.length : 0;
  catalog.roles = (catalog.roles ?? []).filter((r) => !TEST_NAME(r.name) && !TEST_ID(r.id));
  const removedRoles = rolesBefore - catalog.roles.length;

  const teamsBefore = Array.isArray(catalog.teams) ? catalog.teams.length : 0;
  catalog.teams = (catalog.teams ?? []).filter((t) => !TEST_NAME(t.name) && !TEST_ID(t.id));
  const removedTeams = teamsBefore - catalog.teams.length;

  const deptsBefore = Array.isArray(catalog.departments) ? catalog.departments.length : 0;
  catalog.departments = (catalog.departments ?? []).filter(
    (d) => !TEST_NAME(d.name) && !TEST_ID(d.id)
  );
  const removedDepts = deptsBefore - catalog.departments.length;

  return { removedRoles, removedTeams, removedDepts };
}

async function main() {
  loadEnvLocal();

  const diskPath = path.join(process.cwd(), "data", "hr-workforce-persist.json");
  if (fs.existsSync(diskPath)) {
    if (DRY_RUN) {
      console.log("[dry-run] would delete", diskPath);
    } else {
      fs.unlinkSync(diskPath);
      console.log("Deleted legacy disk mirror:", diskPath);
    }
  }

  const getRes = await fetch(`${BASE}/api/org/hr-catalog`, { cache: "no-store" });
  if (!getRes.ok) {
    throw new Error(`GET failed: ${getRes.status} ${await getRes.text()}`);
  }
  const getBody = await getRes.json();
  const catalog = getBody.catalog ?? {};
  const stats = scrubCatalog(catalog);

  console.log("HR catalog scrub:", stats);
  if (stats.removedRoles + stats.removedTeams + stats.removedDepts === 0) {
    console.log("No test entities to remove.");
    return;
  }

  if (DRY_RUN) {
    console.log("[dry-run] would PUT cleaned catalog");
    return;
  }

  const putRes = await fetch(`${BASE}/api/org/hr-catalog`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      catalog,
      expectedUpdatedAt: getBody.updatedAt ?? null,
    }),
  });
  if (!putRes.ok) {
    const retryRes = await fetch(`${BASE}/api/org/hr-catalog`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ catalog }),
    });
    if (!retryRes.ok) {
      throw new Error(`PUT failed: ${putRes.status} / retry ${retryRes.status}`);
    }
  }
  console.log("Server HR catalog updated.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
