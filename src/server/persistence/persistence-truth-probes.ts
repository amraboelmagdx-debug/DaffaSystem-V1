import { probeIncentiveMigration013 } from "@/server/incentives/persistence-backend";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import { requireTenantContext } from "@/server/tenant/context";
import type { ServerProbeResults } from "@/lib/persistence/persistence-truth-registry";

export type TableProbeDetail = {
  ok: boolean;
  error: string | null;
};

const CATALOG_TABLES: Record<string, string> = {
  hr_workforce_catalog: "organization_id",
  service_architecture_catalog: "organization_id",
  organizations: "id",
  organization_members: "organization_id",
  companies: "id",
  scenarios: "id",
  incentive_plans: "id",
  incentive_runs: "id",
  incentive_snapshots: "id",
  incentive_payout_freezes: "id",
  incentive_override_audit: "id",
  incentive_simulator_presets: "id",
};

async function tableProbe(
  table: string,
  column: string = "id"
): Promise<TableProbeDetail> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, error: "Supabase client not available" };
  }
  const { error } = await supabase.from(table).select(column).limit(1);
  if (error) {
    return { ok: false, error: `${error.code ?? "error"}: ${error.message}` };
  }
  return { ok: true, error: null };
}

async function probeAllTables(): Promise<Record<string, TableProbeDetail>> {
  const entries = await Promise.all(
    Object.entries(CATALOG_TABLES).map(async ([table, column]) => {
      const result = await tableProbe(table, column);
      return [table, result] as const;
    })
  );
  return Object.fromEntries(entries) as Record<string, TableProbeDetail>;
}

export async function runPersistenceTruthProbes(): Promise<ServerProbeResults> {
  let authSessionOk = false;
  let authError: string | null = null;
  try {
    await requireTenantContext();
    authSessionOk = true;
  } catch (err) {
    authSessionOk = false;
    authError = err instanceof Error ? err.message : "Tenant context failed";
  }

  const client = await resolveHrCatalogSupabaseClient();
  const supabaseClientAvailable = Boolean(client);

  const tableProbes: Record<string, TableProbeDetail> = await probeAllTables();

  const hrCatalogProbeOk = tableProbes.hr_workforce_catalog?.ok ?? false;
  const serviceCatalogProbeOk = tableProbes.service_architecture_catalog?.ok ?? false;
  const scenariosProbeOk = tableProbes.scenarios?.ok ?? false;
  const companiesProbeOk = tableProbes.companies?.ok ?? false;
  const migration013Ok = await probeIncentiveMigration013();

  const probeErrors: string[] = [];
  if (authError) probeErrors.push(`auth: ${authError}`);
  for (const [table, detail] of Object.entries(tableProbes)) {
    if (!detail.ok && detail.error) {
      probeErrors.push(`${table}: ${detail.error}`);
    }
  }

  return {
    authSessionOk,
    authError,
    migration013Ok,
    hrCatalogProbeOk,
    serviceCatalogProbeOk,
    scenariosProbeOk,
    companiesProbeOk,
    supabaseClientAvailable,
    tableProbes,
    probeErrors,
  };
}
