import type { IncentiveParticipant, IncentivePlan } from "@/types/incentives";
import type { JobRole } from "@/types/hr-workforce";
import { participantsFromHrRoles } from "./opportunity-bridge";

/** Build participants using plan assignments + hierarchy when present. */
export function participantsFromPlan(
  plan: IncentivePlan,
  roles: JobRole[],
  hrBusinessUnitId: string
): IncentiveParticipant[] {
  const inBu = roles.filter(
    (r) => !r.archived && r.businessUnitId === hrBusinessUnitId
  );
  const assignments = (plan.participantAssignments ?? []).filter(
    (a) => a.jobRoleId.trim().length > 0
  );
  const hierarchy = plan.hrHierarchy ?? [];

  if (!assignments.length && !hierarchy.length) {
    return participantsFromHrRoles(roles, hrBusinessUnitId);
  }

  const layerByRole = new Map<string, string>();
  for (const h of hierarchy) {
    if (h.layerId) layerByRole.set(h.jobRoleId, h.layerId);
  }
  for (const a of assignments) {
    layerByRole.set(a.jobRoleId, a.layerId);
  }

  const assignedIds = new Set([
    ...assignments.map((a) => a.jobRoleId),
    ...hierarchy.map((h) => h.jobRoleId),
  ]);

  const targets =
    assignedIds.size > 0
      ? inBu.filter((r) => assignedIds.has(r.id))
      : inBu.filter((r) => r.operationalRoleType === "indirect");

  if (!targets.length) {
    return participantsFromHrRoles(roles, hrBusinessUnitId);
  }

  return targets.map((r) => ({
    jobRoleId: r.id,
    layerId: layerByRole.get(r.id) ?? "layer-close",
    displayName: r.name,
    employeeCount: Math.max(1, r.employeeCount),
  }));
}
