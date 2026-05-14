import type { JobRole, OperationalRoleType } from "@/types/hr-workforce";

/** Accepts persisted values from older builds before Support/Management were merged into Indirect. */
function coerceStoredRoleType(role: JobRole): OperationalRoleType {
  const raw = role.operationalRoleType as string | undefined;
  if (raw === "delivery") return "delivery";
  if (raw === "indirect" || raw === "support" || raw === "management") return "indirect";
  return inferOperationalRoleTypeFromLegacy(role);
}

/** Legacy rows without operationalRoleType: billable → delivery, else indirect (admin / non-sold time). */
export function inferOperationalRoleTypeFromLegacy(
  r: Pick<JobRole, "isBillable" | "includeInOhAllocation">
): OperationalRoleType {
  if (r.isBillable) return "delivery";
  return "indirect";
}

export function legacyFlagsForOperationalRoleType(
  t: OperationalRoleType
): Pick<JobRole, "isBillable" | "includeInOhAllocation"> {
  if (t === "delivery") return { isBillable: true, includeInOhAllocation: true };
  return { isBillable: false, includeInOhAllocation: false };
}

export function effectiveOperationalRoleType(role: JobRole): OperationalRoleType {
  return coerceStoredRoleType(role);
}

export function patchOperationalRoleType(t: OperationalRoleType): Partial<JobRole> {
  return { operationalRoleType: t, ...legacyFlagsForOperationalRoleType(t) };
}

/** Normalize persisted row: merge old Support/Management → Indirect; sync legacy flags. */
export function migrateRoleOperationalType(r: JobRole): JobRole {
  const t = coerceStoredRoleType(r);
  const flags = legacyFlagsForOperationalRoleType(t);
  return { ...r, operationalRoleType: t, ...flags };
}
