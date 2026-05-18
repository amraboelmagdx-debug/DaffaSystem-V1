import type { RoundtripCheck } from "@/lib/persistence/persistence-verify-types";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import { requireTenantContext } from "@/server/tenant/context";
import { probeIncentiveMigration013 } from "@/server/incentives/persistence-backend";

export type { RoundtripCheck };

export async function runPersistenceVerifyRoundtrips(): Promise<RoundtripCheck[]> {
  const checks: RoundtripCheck[] = [];

  let tenant: Awaited<ReturnType<typeof requireTenantContext>> | null = null;
  try {
    tenant = await requireTenantContext();
    checks.push({
      id: "auth",
      label: "Tenant context",
      passed: true,
      message: `organization_id=${tenant.organizationId}`,
    });
  } catch (err) {
    checks.push({
      id: "auth",
      label: "Tenant context",
      passed: false,
      message: err instanceof Error ? err.message : "Tenant context failed",
    });
    return checks;
  }

  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    checks.push({
      id: "client",
      label: "Supabase client",
      passed: false,
      message: "No Supabase client available",
    });
    return checks;
  }

  const m013 = await probeIncentiveMigration013();
  checks.push({
    id: "migration_013",
    label: "Migration 013 (incentive_plans readable)",
    passed: m013,
    message: m013 ? "incentive_plans probe OK" : "incentive_plans not readable",
  });

  const { error: hrErr } = await supabase
    .from("hr_workforce_catalog")
    .select("organization_id")
    .eq("organization_id", tenant.organizationId)
    .maybeSingle();

  checks.push({
    id: "hr_read",
    label: "HR catalog read (tenant-scoped)",
    passed: !hrErr,
    message: hrErr ? `${hrErr.code}: ${hrErr.message}` : "SELECT ok (row may be absent)",
  });

  const { error: saErr } = await supabase
    .from("service_architecture_catalog")
    .select("organization_id")
    .eq("organization_id", tenant.organizationId)
    .maybeSingle();

  checks.push({
    id: "sa_read",
    label: "Service catalog read (tenant-scoped)",
    passed: !saErr,
    message: saErr ? `${saErr.code}: ${saErr.message}` : "SELECT ok (row may be absent)",
  });

  const { error: coErr } = await supabase
    .from("companies")
    .select("id")
    .eq("organization_id", tenant.organizationId)
    .limit(1);

  checks.push({
    id: "planning_read",
    label: "Planning companies read (tenant-scoped)",
    passed: !coErr,
    message: coErr ? `${coErr.code}: ${coErr.message}` : "SELECT ok",
  });

  const { error: planListErr } = await supabase
    .from("incentive_plans")
    .select("id")
    .eq("organization_id", tenant.organizationId)
    .limit(1);

  checks.push({
    id: "incentive_read",
    label: "Incentive plans read (tenant-scoped)",
    passed: !planListErr,
    message: planListErr
      ? `${planListErr.code}: ${planListErr.message}`
      : "SELECT ok",
  });

  return checks;
}
