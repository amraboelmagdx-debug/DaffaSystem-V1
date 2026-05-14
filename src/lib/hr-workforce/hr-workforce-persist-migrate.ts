import type {
  HrBusinessUnit,
  HrGlobalSettings,
  JobRole,
  OhManualSettings,
} from "@/types/hr-workforce";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";

export const DEFAULT_HR_SETTINGS: HrGlobalSettings = {
  workingDaysPerWeek: 5,
  workingHoursPerDay: 8,
  weeksPerYear: 52,
  offDaysPerYear: 10,
  defaultCurrency: "SAR",
  useTeamLevel: true,
};

/** Old saves stored a separate "default utilization" on HR globals; fold into OH manual on read. */
export type LegacyHrGlobal = Partial<HrGlobalSettings> & { defaultUtilizationPct?: number };

function clampUtilPct(n: number): number {
  return Math.min(100, Math.max(0, n));
}

/** Merge persisted OH manual; if `utilizationRatePct` absent/invalid, use legacy `defaultUtilizationPct` from HR, else default 80. */
export function migrateOhManualFromPersist(
  partial: Partial<OhManualSettings> | undefined,
  legacyHr?: LegacyHrGlobal
): OhManualSettings {
  const legacyU =
    legacyHr && typeof legacyHr.defaultUtilizationPct === "number" && !Number.isNaN(legacyHr.defaultUtilizationPct)
      ? legacyHr.defaultUtilizationPct
      : undefined;
  const merged: OhManualSettings = {
    ...DEFAULT_OH,
    ...(partial ?? {}),
    billableFteSource: partial?.billableFteSource ?? "manual",
    ohNonWorkforceLines: Array.isArray(partial?.ohNonWorkforceLines)
      ? partial!.ohNonWorkforceLines!
      : DEFAULT_OH.ohNonWorkforceLines,
  };
  const util =
    typeof partial?.utilizationRatePct === "number" && !Number.isNaN(partial.utilizationRatePct)
      ? clampUtilPct(partial.utilizationRatePct)
      : typeof legacyU === "number"
        ? clampUtilPct(legacyU)
        : DEFAULT_OH.utilizationRatePct;
  return { ...merged, utilizationRatePct: util };
}

/** Stored workspaces used USD as the product default; migrate to SAR on rehydrate. */
export function migrateStoredDefaultCurrency(code: string | undefined): string {
  const c = (code ?? "").trim().toUpperCase();
  if (!c || c.length !== 3 || c === "USD") return "SAR";
  return c;
}

export function migratedHrGlobalSettings(partial: Partial<HrGlobalSettings> | undefined): HrGlobalSettings {
  const { defaultUtilizationPct: _legacyDrop, ...rest } = (partial ?? {}) as LegacyHrGlobal;
  const merged: HrGlobalSettings = { ...DEFAULT_HR_SETTINGS, ...rest };
  return { ...merged, defaultCurrency: migrateStoredDefaultCurrency(merged.defaultCurrency) };
}

export function migratedRoleCurrency(roleCurrency: string | undefined, orgDefault: string): string {
  const r = (roleCurrency ?? "").trim().toUpperCase();
  if (r === "USD") return "SAR";
  if (!r || r.length !== 3) return migrateStoredDefaultCurrency(orgDefault);
  return r;
}

export function migratedRoles(roles: JobRole[], orgDefault: string): JobRole[] {
  const def = migrateStoredDefaultCurrency(orgDefault);
  return roles.map((r) => ({ ...r, currency: migratedRoleCurrency(r.currency, def) }));
}

/** Build per–business-unit OH settings from persisted v2 (legacy flat `ohManual` or keyed map). */
export function resolveOhManualMapForUnits(
  businessUnits: HrBusinessUnit[],
  sources: {
    ohManual?: Partial<OhManualSettings> | undefined;
    ohManualByBusinessUnitId?: Record<string, Partial<OhManualSettings>> | undefined;
  },
  legacyHr?: LegacyHrGlobal
): Record<string, OhManualSettings> {
  const out: Record<string, OhManualSettings> = {};
  const legacyFlat =
    sources.ohManual && typeof sources.ohManual === "object"
      ? migrateOhManualFromPersist(sources.ohManual, legacyHr)
      : undefined;
  const map = sources.ohManualByBusinessUnitId;

  for (const u of businessUnits) {
    const row = map && typeof map[u.id] === "object" ? map[u.id] : undefined;
    if (row !== undefined) {
      out[u.id] = migrateOhManualFromPersist(row, legacyHr);
    } else if (legacyFlat) {
      out[u.id] = { ...legacyFlat };
    } else {
      out[u.id] = migrateOhManualFromPersist(undefined, legacyHr);
    }
  }
  return out;
}
