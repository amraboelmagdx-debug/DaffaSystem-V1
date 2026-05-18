import type {
  IncentiveRunRecord,
  IncentiveRunLifecycle,
  IncentiveSnapshot,
  ReconciliationRunMeta,
} from "@/types/incentives";
import { INCENTIVE_CONTRACT_VERSION, INCENTIVE_ENGINE_VERSION } from "@/types/incentives";
import { buildDedupeKey } from "./persist-plan";

export type PersistIncentiveRunInput = {
  organizationId: string;
  hrBusinessUnitId: string;
  record: IncentiveRunRecord;
  periodKey?: string;
  rerunPolicy?: "block_if_frozen" | "supersede" | "delta_only";
  reconciliationMeta?: ReconciliationRunMeta;
};

export type IncentiveRunRow = {
  id: string;
  organization_id: string;
  hr_business_unit_id: string;
  plan_id: string;
  plan_version: number;
  mode: string;
  period_year: number;
  period_key: string;
  input_hash: string;
  dedupe_key: string;
  run_lifecycle: IncentiveRunLifecycle;
  supersedes_run_id: string | null;
  reconciliation_meta: ReconciliationRunMeta | null;
  created_at: string;
};

export function toIncentiveRunRecord(
  row: IncentiveRunRow,
  snapshot: IncentiveSnapshot
): IncentiveRunRecord {
  return {
    id: row.id,
    planId: row.plan_id,
    planVersion: row.plan_version,
    mode: row.mode as IncentiveRunRecord["mode"],
    periodYear: row.period_year,
    inputHash: row.input_hash,
    runLifecycle: row.run_lifecycle,
    lifecycle: "accrued",
    supersedesRunId: row.supersedes_run_id,
    dedupeKey: row.dedupe_key,
    createdAt: row.created_at,
    snapshot,
  };
}

export function prepareRunPersistPayload(input: PersistIncentiveRunInput): {
  runRow: Omit<IncentiveRunRow, "id" | "created_at"> & { id?: string };
  snapshot: IncentiveSnapshot;
  dedupeKey: string;
} {
  const periodKey = input.periodKey ?? String(input.record.periodYear);
  const dedupeKey =
    input.record.dedupeKey ??
    buildDedupeKey({
      planId: input.record.planId,
      planVersion: input.record.planVersion,
      periodYear: input.record.periodYear,
      mode: input.record.mode,
      inputHash: input.record.inputHash,
    });

  const runLifecycle: IncentiveRunLifecycle =
    input.record.runLifecycle ?? "draft_run";

  return {
    dedupeKey,
    snapshot: input.record.snapshot,
    runRow: {
      id: input.record.id,
      organization_id: input.organizationId,
      hr_business_unit_id: input.hrBusinessUnitId,
      plan_id: input.record.planId,
      plan_version: input.record.planVersion,
      mode: input.record.mode,
      period_year: input.record.periodYear,
      period_key: periodKey,
      input_hash: input.record.inputHash,
      dedupe_key: dedupeKey,
      run_lifecycle: runLifecycle,
      supersedes_run_id: input.record.supersedesRunId ?? null,
      reconciliation_meta: input.reconciliationMeta ?? null,
    },
  };
}

export function snapshotVersions(snapshot: IncentiveSnapshot): {
  engineVersion: number;
  contractVersion: number;
} {
  return {
    engineVersion: snapshot.engineVersion ?? INCENTIVE_ENGINE_VERSION,
    contractVersion: snapshot.contractVersion ?? INCENTIVE_CONTRACT_VERSION,
  };
}
