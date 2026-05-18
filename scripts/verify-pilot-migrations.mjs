#!/usr/bin/env node
/**
 * Verify pilot Supabase tables exist (migrations 001–013).
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in env or .env.local.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

loadEnvLocal();

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TABLES = [
  { migration: "001", table: "organizations", column: "id" },
  { migration: "001", table: "organization_members", column: "organization_id" },
  { migration: "002", table: "companies", column: "id" },
  { migration: "002", table: "scenarios", column: "id" },
  { migration: "005", table: "hr_workforce_catalog", column: "organization_id" },
  { migration: "008", table: "service_architecture_catalog", column: "organization_id" },
  { migration: "013", table: "incentive_plans", column: "id" },
  { migration: "013", table: "incentive_runs", column: "id" },
  { migration: "013", table: "incentive_snapshots", column: "id" },
  { migration: "013", table: "incentive_payout_freezes", column: "id" },
  { migration: "013", table: "incentive_override_audit", column: "id" },
  { migration: "013", table: "incentive_simulator_presets", column: "id" },
];

const supabase = createClient(url, key, { auth: { persistSession: false } });

let failed = 0;
for (const { migration, table, column } of TABLES) {
  const { error } = await supabase.from(table).select(column).limit(1);
  if (error) {
    console.error(`FAIL [${migration}] ${table}: ${error.message}`);
    failed++;
  } else {
    console.log(`OK   [${migration}] ${table}`);
  }
}

if (failed > 0) {
  console.error(`\n${failed} table probe(s) failed. Run: npm run supabase:reset or apply migrations.`);
  process.exit(1);
}

console.log("\nAll pilot migration tables reachable.");
