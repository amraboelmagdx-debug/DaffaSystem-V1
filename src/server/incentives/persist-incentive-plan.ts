import { planToRow, rowToPlan, type IncentivePlanRow } from "@/lib/incentives/persist-plan";
import { isValidUuid, newIncentiveUuid } from "@/lib/incentives/uuid";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import type { IncentivePlan } from "@/types/incentives";

export type PersistPlanResult =
  | { ok: true; plan: IncentivePlan }
  | { ok: false; status: number; message: string; code?: string };

export async function listPlansFromDb(
  organizationId: string,
  hrBusinessUnitId?: string
): Promise<IncentivePlan[]> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return [];

  let q = supabase
    .from("incentive_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .order("updated_at", { ascending: false });

  if (hrBusinessUnitId) {
    q = q.eq("hr_business_unit_id", hrBusinessUnitId);
  }

  const { data, error } = await q;
  if (error || !data) return [];
  return (data as IncentivePlanRow[]).map(rowToPlan);
}

export async function getPlanFromDb(
  organizationId: string,
  planId: string
): Promise<IncentivePlan | null> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("incentive_plans")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("id", planId)
    .maybeSingle();

  if (error || !data) return null;
  return rowToPlan(data as IncentivePlanRow);
}

export async function upsertPlanToDb(
  organizationId: string,
  plan: IncentivePlan
): Promise<PersistPlanResult> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: "Supabase client is not configured" };
  }

  const planId = isValidUuid(plan.id) ? plan.id : newIncentiveUuid();
  const normalizedPlan = plan.id === planId ? plan : { ...plan, id: planId };
  const row = planToRow(normalizedPlan, organizationId);
  const { data: existing } = await supabase
    .from("incentive_plans")
    .select("id")
    .eq("id", planId)
    .maybeSingle();

  const payload = {
    ...row,
    updated_at: new Date().toISOString(),
  };

  const { error } = existing
    ? await supabase.from("incentive_plans").update(payload).eq("id", planId)
    : await supabase.from("incentive_plans").insert({
        ...payload,
        created_at: new Date().toISOString(),
      });

  if (error) {
    return {
      ok: false,
      status: 500,
      message: error.message,
      code: error.code,
    };
  }

  return { ok: true, plan: { ...normalizedPlan, organizationId } };
}

export async function publishPlanVersion(
  organizationId: string,
  planId: string,
  approvedBy?: string | null
): Promise<PersistPlanResult> {
  const plan = await getPlanFromDb(organizationId, planId);
  if (!plan) return { ok: false, status: 404, message: "Plan not found" };

  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: "Supabase client is not configured" };
  }

  const nextVersion = plan.version + 1;
  const updated: IncentivePlan = {
    ...plan,
    version: nextVersion,
    revision: (plan.revision ?? 0) + 1,
    status: "approved",
    approvedAt: new Date().toISOString(),
    approvedBy: approvedBy ?? plan.approvedBy ?? null,
    governance: {
      ...(plan.governance ?? {
        status: "approved",
        revision: nextVersion,
        auditRevision: 1,
      }),
      status: "approved",
      revision: nextVersion,
      approvedAt: new Date().toISOString(),
      approvedBy: approvedBy ?? null,
      auditRevision: (plan.governance?.auditRevision ?? 0) + 1,
    },
  };

  const { error: verErr } = await supabase.from("incentive_plan_versions").insert({
    organization_id: organizationId,
    plan_id: planId,
    version: nextVersion,
    plan_json: updated,
    parent_version_id: plan.governance?.parentPlanVersionId ?? null,
    approved_by: approvedBy,
    approved_at: new Date().toISOString(),
  });

  if (verErr) {
    return { ok: false, status: 500, message: verErr.message };
  }

  return upsertPlanToDb(organizationId, updated);
}

export async function listPlanVersions(
  organizationId: string,
  planId: string
): Promise<{ version: number; approvedAt: string | null; approvedBy: string | null }[]> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return [];

  const { data } = await supabase
    .from("incentive_plan_versions")
    .select("version, approved_at, approved_by")
    .eq("organization_id", organizationId)
    .eq("plan_id", planId)
    .order("version", { ascending: false });

  return (data ?? []).map((r) => ({
    version: r.version as number,
    approvedAt: (r.approved_at as string) ?? null,
    approvedBy: (r.approved_by as string) ?? null,
  }));
}

export async function archivePlan(
  organizationId: string,
  planId: string
): Promise<PersistPlanResult> {
  const plan = await getPlanFromDb(organizationId, planId);
  if (!plan) return { ok: false, status: 404, message: "Plan not found" };
  return upsertPlanToDb(organizationId, {
    ...plan,
    status: "archived",
    governance: {
      ...(plan.governance ?? {
        status: "archived",
        revision: plan.revision,
        auditRevision: 1,
      }),
      status: "archived",
    },
  });
}
