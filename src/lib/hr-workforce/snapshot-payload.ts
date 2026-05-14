import type {
  HrBusinessUnit,
  HrDepartment,
  HrSnapshotPayloadV1,
  HrSnapshotPayloadV2,
  HrTeam,
  JobRole,
} from "@/types/hr-workforce";
import { newHrId } from "@/lib/hr-workforce/id";
import { migrateRoleOperationalType } from "@/lib/hr-workforce/role-operational-type";
import { nowIso } from "@/lib/hr-workforce/structure-utils";
import {
  type LegacyHrGlobal,
  migratedHrGlobalSettings,
  resolveOhManualMapForUnits,
} from "@/lib/hr-workforce/hr-workforce-persist-migrate";

function snapshotVersionOrDefault(n: unknown, fallback: number): number {
  return typeof n === "number" && Number.isFinite(n) ? n : fallback;
}

function migrateV1Payload(
  p: HrSnapshotPayloadV1
): Omit<HrSnapshotPayloadV2, "v" | "hrGlobalSettings" | "ohManual" | "ohManualByBusinessUnitId"> {
  const t = nowIso();
  const bu: HrBusinessUnit = {
    id: newHrId("bu"),
    name: "Imported (legacy)",
    code: "",
    description: "Migrated from snapshot v1",
    isActive: true,
    createdAt: t,
    updatedAt: t,
  };
  const legacyDepts = p.departments as unknown as (HrDepartment & { archived?: boolean })[];
  const departments: HrDepartment[] = legacyDepts.map((d) => {
    const isActive = typeof d.isActive === "boolean" ? d.isActive : !d.archived;
    const businessUnitId = d.businessUnitId ?? bu.id;
    return {
      ...d,
      businessUnitId,
      isActive: isActive ?? true,
      createdAt: d.createdAt ?? t,
      updatedAt: d.updatedAt ?? t,
    };
  });
  const legacyTeams = p.teams as unknown as (HrTeam & { archived?: boolean })[];
  const teams: HrTeam[] = legacyTeams.map((tm) => {
    const isActive = typeof tm.isActive === "boolean" ? tm.isActive : !tm.archived;
    return {
      ...tm,
      isActive: isActive ?? true,
      createdAt: tm.createdAt ?? t,
      updatedAt: tm.updatedAt ?? t,
    };
  });
  const roles: JobRole[] = p.roles
    .map((r) => ({
      ...r,
      businessUnitId:
        r.businessUnitId ||
        departments.find((d) => d.id === r.departmentId)?.businessUnitId ||
        bu.id,
    }))
    .map(migrateRoleOperationalType);
  return { businessUnits: [bu], departments, teams, roles };
}

/** Parse persisted snapshot JSON into normalized v2 payload (pure). */
export function parseHrSnapshotPayload(json: string): HrSnapshotPayloadV2 {
  const raw = JSON.parse(json) as HrSnapshotPayloadV2 & { v?: number };
  const engineDefault = 1;
  const formulaDefault = 1;
  if (raw && typeof raw === "object" && raw.v === 2) {
    const hrRaw = raw.hrGlobalSettings as LegacyHrGlobal;
    const hrGlobalSettings = migratedHrGlobalSettings(hrRaw);
    const ohManualByBusinessUnitId = resolveOhManualMapForUnits(
      raw.businessUnits,
      {
        ohManual: raw.ohManual,
        ohManualByBusinessUnitId: raw.ohManualByBusinessUnitId,
      },
      hrRaw
    );
    return {
      v: 2,
      engineVersion: snapshotVersionOrDefault(raw.engineVersion, engineDefault),
      formulaVersion: snapshotVersionOrDefault(raw.formulaVersion, formulaDefault),
      businessUnits: raw.businessUnits,
      departments: raw.departments,
      teams: raw.teams,
      roles: raw.roles,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
    };
  }
  const legacy = raw as unknown as HrSnapshotPayloadV1;
  const m = migrateV1Payload(legacy);
  const hrRaw = legacy.hrGlobalSettings as LegacyHrGlobal;
  const hrGlobalSettings = migratedHrGlobalSettings(hrRaw);
  const ohManualByBusinessUnitId = resolveOhManualMapForUnits(m.businessUnits, {
    ohManual: legacy.ohManual,
    ohManualByBusinessUnitId: undefined,
  }, hrRaw);
  return {
    v: 2,
    engineVersion: engineDefault,
    formulaVersion: formulaDefault,
    ...m,
    hrGlobalSettings,
    ohManualByBusinessUnitId,
  };
}
