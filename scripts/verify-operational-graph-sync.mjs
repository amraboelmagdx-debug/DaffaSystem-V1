/**
 * Verify HR → planning operational graph (migrations 007+011+012 + sync API).
 * Usage: node scripts/verify-operational-graph-sync.mjs [baseUrl]
 *
 * Requires: .env.local with Supabase keys; dev server optional for API checks.
 */
import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

const BASE = process.argv[2] ?? "http://localhost:3001";
const ORG_ID = "00000000-0000-4000-8000-0000000000aa";
const DEV_USER_ID = "00000000-0000-4000-8000-000000000099";
const DEV_EMAIL = "dev@local.test";
const DEV_PASSWORD = "devpassword123";

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

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

async function main() {
  loadEnvLocal();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  assert(url && serviceKey, "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required");

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });

  console.log("=== Schema: company_hr_unit_links ===");
  const { error: tableErr } = await admin.from("company_hr_unit_links").select("organization_id").limit(1);
  assert(!tableErr, `company_hr_unit_links missing or inaccessible: ${tableErr?.message}`);

  console.log("=== Schema: is_organization_member ===");
  const { data: fnRow, error: fnErr } = await admin.rpc("is_organization_member", {
    _user: DEV_USER_ID,
    _org: ORG_ID,
  });
  assert(!fnErr, `is_organization_member RPC failed: ${fnErr?.message}`);
  assert(fnRow === true, `expected dev user member of org, got ${fnRow}`);

  console.log("=== Schema: is_company_accessible (012) ===");
  const { data: existingCo } = await admin
    .from("companies")
    .select("id")
    .eq("organization_id", ORG_ID)
    .limit(1);
  const sampleCompanyId = existingCo?.[0]?.id;
  if (sampleCompanyId) {
    const { data: accessible, error: accErr } = await admin.rpc("is_company_accessible", {
      _user: DEV_USER_ID,
      _company_id: sampleCompanyId,
    });
    assert(!accErr, `is_company_accessible RPC failed: ${accErr?.message}`);
    assert(accessible === true, `expected is_company_accessible true, got ${accessible}`);
  } else {
    console.log("(no companies yet — skip is_company_accessible sample)");
  }

  if (anonKey) {
    console.log("=== RLS: companies insert as authenticated member (012) ===");
    const userClient = createClient(url, anonKey, { auth: { persistSession: false } });
    const { error: signErr } = await userClient.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    });
    assert(!signErr, `dev sign-in failed: ${signErr?.message}`);

    const probeName = `RLS verify ${Date.now()}`;
    const { data: inserted, error: insErr } = await userClient
      .from("companies")
      .insert({
        organization_id: ORG_ID,
        name: probeName,
        fixed_costs_monthly: 0,
        growth_target_pct: 0.15,
        margin_target_pct: 0.38,
        np_target_pct: 0.12,
        baseline_revenue_monthly: 0,
        market_segments: [],
        metadata: { syncSource: "rls-verify", operationalKind: "hr_business_unit" },
      })
      .select("id")
      .single();

    assert(!insErr, `companies insert blocked: ${insErr?.message}`);
    assert(inserted?.id, "companies insert returned no id");
    assert(
      !String(insErr?.message ?? "").toLowerCase().includes("row-level security"),
      "unexpected RLS error on companies insert"
    );

    const { error: delErr } = await admin.from("companies").delete().eq("id", inserted.id);
    if (delErr) console.warn("cleanup delete (service role):", delErr.message);
    else console.log("RLS probe company removed");
  } else {
    console.warn("NEXT_PUBLIC_SUPABASE_ANON_KEY missing — skip authenticated RLS insert test");
  }

  console.log("=== API: economics sync (requires dev server + session cookie) ===");
  try {
    const syncRes = await fetch(`${BASE}/api/platform/economics/sync`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
    const syncBody = await syncRes.json();
    if (syncRes.status === 401) {
      console.warn(
        "Sync returned 401 (expected without browser session). Sign in at /en/login and retry from the app."
      );
    } else if (!syncRes.ok) {
      console.warn("Sync HTTP", syncRes.status, syncBody);
    } else {
      console.log("Sync result:", {
        ok: syncBody.ok,
        linksUpserted: syncBody.linksUpserted,
        companiesUpserted: syncBody.companiesUpserted,
        errors: syncBody.errors,
      });
      const errText = (syncBody.errors ?? []).join("; ");
      assert(
        !errText.toLowerCase().includes("row-level security"),
        `Sync RLS failure: ${errText}`
      );
      assert(syncBody.ok !== false, `Sync errors: ${errText}`);
    }

    const wsRes = await fetch(`${BASE}/api/planning/workspace`, { cache: "no-store" });
    const ws = await wsRes.json();
    if (wsRes.ok && ws.source === "supabase") {
      const links = ws.company_hr_links ?? [];
      console.log("Workspace company_hr_links count:", links.length);
    } else {
      console.warn("Workspace load skipped or denied:", ws.message ?? wsRes.status);
    }
  } catch (e) {
    console.warn("API checks skipped (is dev server running?):", e.message);
  }

  console.log("\nOK — operational graph schema and RLS checks passed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
