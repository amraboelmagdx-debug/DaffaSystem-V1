import { prepareRunPersistPayload } from "@/lib/incentives/persist-run";
import type {
  IncentiveOverrideAuditEntry,
  IncentivePlan,
  IncentiveRunRecord,
  IncentiveSimulatorPreset,
  PayoutFreeze,
  ReconciliationRunMeta,
  RerunPolicy,
} from "@/types/incentives";
import {
  addFreezeDb,
  isPeriodFrozenDb,
  listFreezesDb,
  listRunsFromDb,
  persistRunToDb,
} from "./persist-incentive-run";
import {
  archivePlan,
  getPlanFromDb,
  listPlanVersions,
  listPlansFromDb,
  publishPlanVersion,
  upsertPlanToDb,
  type PersistPlanResult,
} from "./persist-incentive-plan";
import { resolveIncentivePersistenceBackend } from "./persistence-backend";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";

const plansByOrg = new Map<string, Map<string, IncentivePlan>>();
const runsByOrg = new Map<string, IncentiveRunRecord[]>();
const freezesByOrg = new Map<string, PayoutFreeze[]>();
const presetsByOrg = new Map<string, Map<string, IncentiveSimulatorPreset & { id: string }>>();
const auditByOrg = new Map<string, IncentiveOverrideAuditEntry[]>();

function memoryPlans(orgId: string): Map<string, IncentivePlan> {
  let m = plansByOrg.get(orgId);
  if (!m) {
    m = new Map();
    plansByOrg.set(orgId, m);
  }
  return m;
}

function memoryRuns(orgId: string): IncentiveRunRecord[] {
  let list = runsByOrg.get(orgId);
  if (!list) {
    list = [];
    runsByOrg.set(orgId, list);
  }
  return list;
}

const PERSISTENCE_UNAVAILABLE_MSG =
  "Incentive persistence unavailable. Configure Supabase or set INCENTIVE_ALLOW_MEMORY_FALLBACK=true for local dev.";

function persistenceUnavailable(): PersistPlanResult {
  return {
    ok: false,
    status: 503,
    message: PERSISTENCE_UNAVAILABLE_MSG,
  };
}

export async function listIncentivePlans(
  organizationId: string,
  hrBusinessUnitId?: string
): Promise<IncentivePlan[]> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") {
    return listPlansFromDb(organizationId, hrBusinessUnitId);
  }
  if (backend === "unavailable") return [];
  const all = [...memoryPlans(organizationId).values()];
  if (!hrBusinessUnitId) return all;
  return all.filter((p) => p.hrBusinessUnitId === hrBusinessUnitId);
}

export async function getIncentivePlan(
  organizationId: string,
  planId: string
): Promise<IncentivePlan | null> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") return getPlanFromDb(organizationId, planId);
  if (backend === "unavailable") return null;
  return memoryPlans(organizationId).get(planId) ?? null;
}

export async function upsertIncentivePlan(
  organizationId: string,
  plan: IncentivePlan
): Promise<PersistPlanResult> {
  const normalized = { ...plan, organizationId };
  const { backend } = await resolveIncentivePersistenceBackend();

  if (backend === "supabase") {
    const result = await upsertPlanToDb(organizationId, normalized);
    if (!result.ok) {
      return { ...result, message: result.message };
    }
    return result;
  }

  if (backend === "unavailable") return persistenceUnavailable();

  memoryPlans(organizationId).set(plan.id, normalized);
  return { ok: true, plan: normalized };
}

export async function approveIncentivePlan(
  organizationId: string,
  planId: string,
  approvedBy?: string | null
): Promise<IncentivePlan | null> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") {
    const result = await publishPlanVersion(organizationId, planId, approvedBy);
    return result.ok ? result.plan : null;
  }
  if (backend === "unavailable") return null;
  const plan = memoryPlans(organizationId).get(planId);
  if (!plan) return null;
  const updated = {
    ...plan,
    status: "approved" as const,
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy ?? null,
    version: plan.version + 1,
  };
  memoryPlans(organizationId).set(planId, updated);
  return updated;
}

export async function archiveIncentivePlan(
  organizationId: string,
  planId: string
): Promise<IncentivePlan | null> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") {
    const result = await archivePlan(organizationId, planId);
    return result.ok ? result.plan : null;
  }
  if (backend === "unavailable") return null;
  const plan = memoryPlans(organizationId).get(planId);
  if (!plan) return null;
  const updated = { ...plan, status: "archived" as const };
  memoryPlans(organizationId).set(planId, updated);
  return updated;
}

export { listPlanVersions };

export async function listIncentiveRuns(
  organizationId: string,
  filters?: {
    hrBusinessUnitId?: string;
    planId?: string;
    periodYear?: number;
    mode?: string;
  }
): Promise<IncentiveRunRecord[]> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") {
    return listRunsFromDb(organizationId, filters);
  }
  if (backend === "unavailable") return [];
  let list = memoryRuns(organizationId);
  if (filters?.planId) list = list.filter((r) => r.planId === filters.planId);
  if (filters?.periodYear != null) {
    list = list.filter((r) => r.periodYear === filters.periodYear);
  }
  if (filters?.mode) list = list.filter((r) => r.mode === filters.mode);
  if (filters?.hrBusinessUnitId) {
    const planIds = new Set(
      [...memoryPlans(organizationId).values()]
        .filter((p) => p.hrBusinessUnitId === filters.hrBusinessUnitId)
        .map((p) => p.id)
    );
    list = list.filter((r) => planIds.has(r.planId));
  }
  return list;
}

function saveIncentiveRunMemory(
  organizationId: string,
  record: IncentiveRunRecord,
  hrBusinessUnitId: string,
  options?: {
    periodKey?: string;
    rerunPolicy?: RerunPolicy;
    reconciliationMeta?: ReconciliationRunMeta;
  }
): { ok: true; run: IncentiveRunRecord } | { ok: false; status: number; message: string; code?: string } {
  const periodKey = options?.periodKey ?? String(record.periodYear);
  if (isPeriodFrozenSync(organizationId, hrBusinessUnitId, periodKey)) {
    return {
      ok: false,
      status: 409,
      message: "Period is frozen; rerun blocked",
      code: "PERIOD_FROZEN",
    };
  }

  const { dedupeKey } = prepareRunPersistPayload({
    organizationId,
    hrBusinessUnitId,
    record,
    periodKey: options?.periodKey,
    rerunPolicy: options?.rerunPolicy,
    reconciliationMeta: options?.reconciliationMeta,
  });

  const list = memoryRuns(organizationId);
  const existing = list.find((r) => r.dedupeKey === dedupeKey && r.runLifecycle !== "superseded");

  if (existing && options?.rerunPolicy !== "supersede") {
    return {
      ok: false,
      status: 409,
      message: "Run with same dedupe key already exists",
      code: "DUPLICATE_RUN",
    };
  }

  if (existing && options?.rerunPolicy === "supersede") {
    const idx = list.findIndex((r) => r.id === existing.id);
    if (idx >= 0) {
      list[idx] = { ...list[idx], runLifecycle: "superseded" };
    }
  }

  const runId = record.id || crypto.randomUUID();
  const saved: IncentiveRunRecord = {
    ...record,
    id: runId,
    dedupeKey,
    runLifecycle: record.runLifecycle ?? "draft_run",
    supersedesRunId: existing && options?.rerunPolicy === "supersede" ? existing.id : record.supersedesRunId ?? null,
  };

  const byIdIdx = list.findIndex((r) => r.id === runId);
  if (byIdIdx >= 0) list[byIdIdx] = saved;
  else list.push(saved);

  return { ok: true, run: saved };
}

export async function saveIncentiveRun(
  organizationId: string,
  record: IncentiveRunRecord,
  hrBusinessUnitId: string,
  options?: {
    periodKey?: string;
    rerunPolicy?: RerunPolicy;
    reconciliationMeta?: ReconciliationRunMeta;
  }
): Promise<
  | { ok: true; run: IncentiveRunRecord }
  | { ok: false; status: number; message: string; code?: string }
> {
  const { backend } = await resolveIncentivePersistenceBackend();

  if (backend === "supabase") {
    return persistRunToDb({
      organizationId,
      hrBusinessUnitId,
      record,
      periodKey: options?.periodKey,
      rerunPolicy: options?.rerunPolicy,
      reconciliationMeta: options?.reconciliationMeta,
    });
  }

  if (backend === "unavailable") {
    return {
      ok: false,
      status: 503,
      message: PERSISTENCE_UNAVAILABLE_MSG,
      code: "PERSISTENCE_UNAVAILABLE",
    };
  }

  return saveIncentiveRunMemory(organizationId, record, hrBusinessUnitId, options);
}

function isPeriodFrozenSync(
  organizationId: string,
  hrBusinessUnitId: string,
  periodKey: string
): boolean {
  return (freezesByOrg.get(organizationId) ?? []).some(
    (f) => f.hrBusinessUnitId === hrBusinessUnitId && f.periodKey === periodKey
  );
}

export async function isPeriodFrozen(
  organizationId: string,
  hrBusinessUnitId: string,
  periodKey: string
): Promise<boolean> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") {
    return isPeriodFrozenDb(organizationId, hrBusinessUnitId, periodKey);
  }
  if (backend === "unavailable") return false;
  return isPeriodFrozenSync(organizationId, hrBusinessUnitId, periodKey);
}

export async function addPayoutFreeze(
  organizationId: string,
  freeze: PayoutFreeze
): Promise<PayoutFreeze> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") return addFreezeDb(organizationId, freeze);
  if (backend === "unavailable") return freeze;
  const list = freezesByOrg.get(organizationId) ?? [];
  if (
    !list.some(
      (f) =>
        f.hrBusinessUnitId === freeze.hrBusinessUnitId && f.periodKey === freeze.periodKey
    )
  ) {
    list.push(freeze);
    freezesByOrg.set(organizationId, list);
  }
  return freeze;
}

export async function listPayoutFreezes(organizationId: string): Promise<PayoutFreeze[]> {
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "supabase") return listFreezesDb(organizationId);
  if (backend === "unavailable") return [];
  return [...(freezesByOrg.get(organizationId) ?? [])];
}

async function incentiveSupabaseAvailableForAux(): Promise<boolean> {
  const { backend } = await resolveIncentivePersistenceBackend();
  return backend === "supabase";
}

export async function listSimulatorPresets(
  organizationId: string,
  hrBusinessUnitId: string
): Promise<(IncentiveSimulatorPreset & { id: string })[]> {
  if (await incentiveSupabaseAvailableForAux()) {
    const supabase = await resolveHrCatalogSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("incentive_simulator_presets")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("hr_business_unit_id", hrBusinessUnitId);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      ...(r.preset_json as IncentiveSimulatorPreset),
      name: (r.name as string) ?? (r.preset_json as IncentiveSimulatorPreset).name,
    }));
  }
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "unavailable") return [];
  const key = `${organizationId}:${hrBusinessUnitId}`;
  return [...(presetsByOrg.get(key)?.values() ?? [])];
}

export async function upsertSimulatorPreset(
  organizationId: string,
  hrBusinessUnitId: string,
  preset: IncentiveSimulatorPreset & { id?: string }
): Promise<IncentiveSimulatorPreset & { id: string }> {
  const id = preset.id ?? crypto.randomUUID();
  const full = { ...preset, id };

  if (await incentiveSupabaseAvailableForAux()) {
    const supabase = await resolveHrCatalogSupabaseClient();
    if (!supabase) return full;
    const row = {
      id,
      organization_id: organizationId,
      hr_business_unit_id: hrBusinessUnitId,
      name: preset.name,
      preset_json: preset,
      updated_at: new Date().toISOString(),
    };
    const { data: existing } = await supabase
      .from("incentive_simulator_presets")
      .select("id")
      .eq("id", id)
      .maybeSingle();
    if (existing) {
      await supabase.from("incentive_simulator_presets").update(row).eq("id", id);
    } else {
      await supabase.from("incentive_simulator_presets").insert({
        ...row,
        created_at: new Date().toISOString(),
      });
    }
    return full;
  }

  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "unavailable") return full;

  const key = `${organizationId}:${hrBusinessUnitId}`;
  let m = presetsByOrg.get(key);
  if (!m) {
    m = new Map();
    presetsByOrg.set(key, m);
  }
  m.set(id, full);
  return full;
}

export async function listOverrideAudit(
  organizationId: string,
  planId: string
): Promise<IncentiveOverrideAuditEntry[]> {
  if (await incentiveSupabaseAvailableForAux()) {
    const supabase = await resolveHrCatalogSupabaseClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from("incentive_override_audit")
      .select("*")
      .eq("organization_id", organizationId)
      .eq("plan_id", planId)
      .order("created_at", { ascending: false });
    return (data ?? []).map((r) => ({
      id: r.id as string,
      planId: r.plan_id as string,
      layerId: r.layer_id as string,
      jobRoleId: r.job_role_id as string,
      oldValue: r.old_value,
      newValue: r.new_value,
      reason: (r.reason as string) ?? null,
      changedBy: (r.changed_by as string) ?? null,
      createdAt: r.created_at as string,
    }));
  }
  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend === "unavailable") return [];
  return (auditByOrg.get(organizationId) ?? []).filter((e) => e.planId === planId);
}

export async function appendOverrideAudit(
  organizationId: string,
  entry: Omit<IncentiveOverrideAuditEntry, "id" | "createdAt">
): Promise<IncentiveOverrideAuditEntry> {
  const full: IncentiveOverrideAuditEntry = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };

  if (await incentiveSupabaseAvailableForAux()) {
    const supabase = await resolveHrCatalogSupabaseClient();
    if (supabase) {
      await supabase.from("incentive_override_audit").insert({
        organization_id: organizationId,
        plan_id: entry.planId,
        layer_id: entry.layerId,
        job_role_id: entry.jobRoleId,
        old_value: entry.oldValue,
        new_value: entry.newValue,
        reason: entry.reason,
        changed_by: entry.changedBy,
      });
    }
    return full;
  }

  const { backend } = await resolveIncentivePersistenceBackend();
  if (backend !== "memory") return full;

  const list = auditByOrg.get(organizationId) ?? [];
  list.push(full);
  auditByOrg.set(organizationId, list);
  return full;
}
