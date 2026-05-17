import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import type { SampleDataResult } from "../types";
import { SAMPLE_PACK_ID } from "../types";

function ok(action: SampleDataResult["action"], message?: string): SampleDataResult {
  return { ok: true, moduleId: "service-architecture", action, message };
}

function fail(action: SampleDataResult["action"], reason: string): SampleDataResult {
  return { ok: false, moduleId: "service-architecture", action, reason };
}

function primaryBuAndRoles(): { businessUnitId: string; roleIds: string[] } | null {
  const hr = useHrWorkforceStore.getState();
  const buId = hr.businessUnits[0]?.id;
  if (!buId) return null;
  const roleIds = hr.roles.filter((r) => !r.archived).map((r) => r.id);
  return { businessUnitId: buId, roleIds };
}

export function clearServiceArchitectureSample(): SampleDataResult {
  useServiceArchitectureStore.getState().resetServiceArchitecture();
  return ok("clear", "Service architecture catalog cleared");
}

export function loadServiceArchitectureSample(): SampleDataResult {
  const ctx = primaryBuAndRoles();
  if (!ctx) return fail("load", "no_business_unit");
  if (ctx.roleIds.length === 0) {
    return fail("load", "hr_roles_required");
  }
  const store = useServiceArchitectureStore.getState();
  store.resetServiceArchitecture();
  const seeded = store.seedDemoCatalog({
    businessUnitId: ctx.businessUnitId,
    roleIds: ctx.roleIds,
  });
  if (!seeded.ok) return fail("load", seeded.reason ?? "seed_failed");
  return ok("load", `${SAMPLE_PACK_ID}: service catalog loaded`);
}

export function resetServiceArchitectureSample(): SampleDataResult {
  return loadServiceArchitectureSample();
}
