import {
  prepareRunPersistPayload,
  snapshotVersions,
  toIncentiveRunRecord,
  type IncentiveRunRow,
} from "@/lib/incentives/persist-run";
import { isValidUuid, newIncentiveUuid } from "@/lib/incentives/uuid";
import { getPlanFromDb } from "@/server/incentives/persist-incentive-plan";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import type {
  IncentiveRunRecord,
  IncentiveSnapshot,
  PayoutFreeze,
  ReconciliationRunMeta,
  RerunPolicy,
} from "@/types/incentives";

export type PersistRunResult =
  | { ok: true; run: IncentiveRunRecord }
  | { ok: false; status: number; message: string; code?: string };

export async function listRunsFromDb(
  organizationId: string,
  filters?: {
    hrBusinessUnitId?: string;
    planId?: string;
    periodYear?: number;
    mode?: string;
  }
): Promise<IncentiveRunRecord[]> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return [];

  let q = supabase
    .from("incentive_runs")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false });

  if (filters?.hrBusinessUnitId) {
    q = q.eq("hr_business_unit_id", filters.hrBusinessUnitId);
  }
  if (filters?.planId) q = q.eq("plan_id", filters.planId);
  if (filters?.periodYear != null) q = q.eq("period_year", filters.periodYear);
  if (filters?.mode) q = q.eq("mode", filters.mode);

  const { data, error } = await q;
  if (error || !data) return [];

  const runIds = data.map((r) => r.id as string);
  const { data: snaps } = await supabase
    .from("incentive_snapshots")
    .select("run_id, snapshot_json")
    .in("run_id", runIds);

  const snapByRun = new Map(
    (snaps ?? []).map((s) => [s.run_id as string, s.snapshot_json as IncentiveSnapshot])
  );

  return data.map((row) => {
    const snapshot = snapByRun.get(row.id as string) ?? ({} as IncentiveSnapshot);
    return toIncentiveRunRecord(row as IncentiveRunRow, snapshot);
  });
}

export async function isPeriodFrozenDb(
  organizationId: string,
  hrBusinessUnitId: string,
  periodKey: string
): Promise<boolean> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return false;

  const { data } = await supabase
    .from("incentive_payout_freezes")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("hr_business_unit_id", hrBusinessUnitId)
    .eq("period_key", periodKey)
    .maybeSingle();

  return Boolean(data);
}

export async function addFreezeDb(
  organizationId: string,
  freeze: PayoutFreeze
): Promise<PayoutFreeze> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (supabase) {
    await supabase.from("incentive_payout_freezes").insert({
      organization_id: organizationId,
      hr_business_unit_id: freeze.hrBusinessUnitId,
      period_key: freeze.periodKey,
      reason: freeze.reason,
      frozen_at: freeze.frozenAt,
    });
  }
  return freeze;
}

export async function listFreezesDb(organizationId: string): Promise<PayoutFreeze[]> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("incentive_payout_freezes")
    .select("*")
    .eq("organization_id", organizationId);

  return (data ?? []).map((r) => ({
    hrBusinessUnitId: r.hr_business_unit_id as string,
    periodKey: r.period_key as string,
    reason: r.reason as string,
    frozenAt: r.frozen_at as string,
  }));
}

export async function persistRunToDb(input: {
  organizationId: string;
  hrBusinessUnitId: string;
  record: IncentiveRunRecord;
  periodKey?: string;
  rerunPolicy?: RerunPolicy;
  reconciliationMeta?: ReconciliationRunMeta;
}): Promise<PersistRunResult> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: "Supabase client is not configured" };
  }

  if (!isValidUuid(input.record.planId)) {
    return {
      ok: false,
      status: 400,
      message: `plan_id must be a UUID (got "${input.record.planId}")`,
      code: "INVALID_PLAN_ID",
    };
  }

  const persistedPlan = await getPlanFromDb(input.organizationId, input.record.planId);
  if (!persistedPlan) {
    return {
      ok: false,
      status: 409,
      message: "Incentive plan is not persisted on the server; save the plan before persisting a run.",
      code: "PLAN_NOT_PERSISTED",
    };
  }

  const { dedupeKey, runRow, snapshot } = prepareRunPersistPayload(input);
  const periodKey = input.periodKey ?? String(input.record.periodYear);

  if (await isPeriodFrozenDb(input.organizationId, input.hrBusinessUnitId, periodKey)) {
    return {
      ok: false,
      status: 409,
      message: "Period is frozen; rerun blocked",
      code: "PERIOD_FROZEN",
    };
  }

  const { data: existing } = await supabase
    .from("incentive_runs")
    .select("id")
    .eq("organization_id", input.organizationId)
    .eq("dedupe_key", dedupeKey)
    .maybeSingle();

  if (existing && input.rerunPolicy !== "supersede") {
    return {
      ok: false,
      status: 409,
      message: "Run with same dedupe key already exists",
      code: "DUPLICATE_RUN",
    };
  }

  if (existing && input.rerunPolicy === "supersede") {
    await supabase
      .from("incentive_runs")
      .update({ run_lifecycle: "superseded" })
      .eq("id", existing.id);
    runRow.supersedes_run_id = existing.id as string;
    runRow.run_lifecycle = "draft_run";
  }

  const runId =
    input.record.id && isValidUuid(input.record.id)
      ? input.record.id
      : newIncentiveUuid();
  const { error: runErr } = await supabase.from("incentive_runs").insert({
    id: runId,
    organization_id: runRow.organization_id,
    hr_business_unit_id: runRow.hr_business_unit_id,
    plan_id: runRow.plan_id,
    plan_version: runRow.plan_version,
    mode: runRow.mode,
    period_year: runRow.period_year,
    period_key: runRow.period_key,
    input_hash: runRow.input_hash,
    dedupe_key: runRow.dedupe_key,
    run_lifecycle: runRow.run_lifecycle,
    supersedes_run_id: runRow.supersedes_run_id,
    reconciliation_meta: runRow.reconciliation_meta,
  });

  if (runErr) {
    return { ok: false, status: 500, message: runErr.message };
  }

  const versions = snapshotVersions(snapshot);
  const { error: snapErr } = await supabase.from("incentive_snapshots").insert({
    run_id: runId,
    snapshot_json: snapshot,
    engine_version: versions.engineVersion,
    contract_version: versions.contractVersion,
  });

  if (snapErr) {
    return { ok: false, status: 500, message: snapErr.message };
  }

  const fullRow: IncentiveRunRow = {
    ...(runRow as IncentiveRunRow),
    id: runId,
    created_at: new Date().toISOString(),
  };

  return {
    ok: true,
    run: toIncentiveRunRecord(fullRow, snapshot),
  };
}
