import type { HrSnapshotPayloadV2 } from "@/types/hr-workforce";
import {
  HR_WORKFORCE_ENGINE_VERSION,
  HR_WORKFORCE_FORMULA_VERSION,
} from "@/lib/hr-workforce/workspace-versions";

export interface HrSnapshotRestoreCheck {
  ok: boolean;
  errors: string[];
  warnings: string[];
}

function isNonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

/**
 * Structural + compatibility validation before applying a snapshot to live store state.
 * Pure — no I/O.
 */
export function validateHrSnapshotPayloadForRestore(
  payload: HrSnapshotPayloadV2
): HrSnapshotRestoreCheck {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (payload.v !== 2) {
    errors.push("Unsupported snapshot payload version (expected v: 2 after parse).");
  }

  if (!Array.isArray(payload.businessUnits) || payload.businessUnits.length === 0) {
    errors.push("Snapshot must include at least one business unit.");
  }

  if (!Array.isArray(payload.departments)) {
    errors.push("Snapshot departments must be an array.");
  }

  if (!Array.isArray(payload.teams)) {
    errors.push("Snapshot teams must be an array.");
  }

  if (!Array.isArray(payload.roles)) {
    errors.push("Snapshot roles must be an array.");
  }

  if (!payload.hrGlobalSettings || typeof payload.hrGlobalSettings !== "object") {
    errors.push("Snapshot hrGlobalSettings is missing or invalid.");
  } else if (!isNonEmptyString(payload.hrGlobalSettings.defaultCurrency)) {
    errors.push("Snapshot hrGlobalSettings.defaultCurrency is missing or invalid.");
  }

  if (Array.isArray(payload.roles)) {
    for (let i = 0; i < payload.roles.length; i++) {
      const r = payload.roles[i] as unknown;
      if (!r || typeof r !== "object") {
        errors.push(`Role at index ${i} is not an object.`);
        continue;
      }
      const row = r as Record<string, unknown>;
      if (!isNonEmptyString(row.id)) errors.push(`Role at index ${i} is missing id.`);
      if (!isNonEmptyString(row.departmentId))
        errors.push(`Role at index ${i} is missing departmentId.`);
      if (!isNonEmptyString(row.businessUnitId))
        errors.push(`Role at index ${i} is missing businessUnitId.`);
    }
  }

  const ev =
    typeof payload.engineVersion === "number" && !Number.isNaN(payload.engineVersion)
      ? payload.engineVersion
      : 1;
  const fv =
    typeof payload.formulaVersion === "number" && !Number.isNaN(payload.formulaVersion)
      ? payload.formulaVersion
      : 1;

  if (ev > HR_WORKFORCE_ENGINE_VERSION) {
    warnings.push(
      `Snapshot engineVersion (${ev}) is newer than this app (${HR_WORKFORCE_ENGINE_VERSION}); numbers may differ after restore.`
    );
  }

  if (fv > HR_WORKFORCE_FORMULA_VERSION) {
    warnings.push(
      `Snapshot formulaVersion (${fv}) is newer than this app (${HR_WORKFORCE_FORMULA_VERSION}); OH/workforce totals may differ after restore.`
    );
  }

  return { ok: errors.length === 0, errors, warnings };
}
