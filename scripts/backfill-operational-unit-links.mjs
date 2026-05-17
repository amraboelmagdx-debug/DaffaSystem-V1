#!/usr/bin/env node
/**
 * Inventory planning companies without HR links (dry-run by default).
 * Usage: node scripts/backfill-operational-unit-links.mjs [--org=<uuid>]
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY).");
  process.exit(1);
}

const orgArg = process.argv.find((a) => a.startsWith("--org="));
const orgFilter = orgArg?.split("=")[1];

const supabase = createClient(url, key);

let query = supabase.from("companies").select("id, organization_id, name, metadata");
if (orgFilter) query = query.eq("organization_id", orgFilter);
const { data: rows, error } = await query;

if (error) {
  console.error(error.message);
  process.exit(1);
}

const { data: links } = await supabase
  .from("company_hr_unit_links")
  .select("company_id, hr_business_unit_id, organization_id");

const linked = new Set((links ?? []).map((l) => l.company_id));
const orphans = (rows ?? []).filter((c) => !linked.has(c.id));

console.log(`Companies: ${rows?.length ?? 0}, linked: ${linked.size}, orphans: ${orphans.length}`);
for (const c of orphans) {
  console.log(`  orphan ${c.id} org=${c.organization_id} name=${c.name}`);
}

console.log("\nDry-run only — merge or mark metadata.orphan in a gated migration.");
