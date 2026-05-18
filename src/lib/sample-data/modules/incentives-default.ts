import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { SampleDataResult } from "../types";
import { SAMPLE_PACK_ID } from "../types";

function ok(action: SampleDataResult["action"], message?: string): SampleDataResult {
  return { ok: true, moduleId: "incentives-default-v1", action, message };
}

function fail(action: SampleDataResult["action"], reason: string): SampleDataResult {
  return { ok: false, moduleId: "incentives-default-v1", action, reason };
}

export async function loadIncentivesDefaultSample(): Promise<SampleDataResult> {
  const company = useWorkspaceStore.getState().companies[0];
  if (!company) {
    return fail("load", "error_no_business_unit");
  }
  const orgId = getActiveOrganizationId() ?? "demo-org";
  const hrBuId = company.hrBusinessUnitId ?? company.id;
  try {
    await useIncentivePlanStore.getState().ensureDefaultPlan({
      organizationId: orgId,
      hrBusinessUnitId: hrBuId,
      companyId: company.id,
    });
    return ok("load", `${SAMPLE_PACK_ID}: default incentive plan ready`);
  } catch {
    return fail("load", "error_seed_failed");
  }
}

export function clearIncentivesDefaultSample(): SampleDataResult {
  useIncentivePlanStore.getState().resetForBuChange();
  return ok("clear", "Incentive plans cleared from client store");
}

export async function resetIncentivesDefaultSample(): Promise<SampleDataResult> {
  clearIncentivesDefaultSample();
  return loadIncentivesDefaultSample();
}
