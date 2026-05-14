import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhEngineResult,
  OhManualSettings,
  OhNumeratorDetail,
  RoleCostBreakdown,
} from "@/types/hr-workforce";
import { aggregateByDepartment, buildWorkforceDashboardAggregates } from "./aggregates";
import { computeOhEngine } from "./oh-engine";
import { resolveOhAnnualNumerator } from "./oh-numerator";
import { computeAllRoleBreakdowns } from "./workforce-cost-engine";
import { effectiveOhBillableHeadcount, isRoleInActiveOperationalStructure } from "./structure-utils";
import { DEFAULT_OH } from "./default-oh";

export type OhBundleByBusinessUnit = { oh: OhEngineResult; ohNumerator: OhNumeratorDetail };

export interface HrWorkforceDerived {
  /** Resolved OH engine + numerator for each business unit id (and any role-only orphan ids). */
  ohByBusinessUnitId: Record<string, OhBundleByBusinessUnit>;
  /** Sum of per-unit effective billable FTE used in OH denominators. */
  totalEffectiveOhBillableFte: number;
  /** All non-archived roles (for grids / detail). */
  breakdowns: RoleCostBreakdown[];
  breakdownByRoleId: Map<string, RoleCostBreakdown>;
  /** Filtered for executive KPIs (active BU → dept → team chain). */
  dashboard: ReturnType<typeof buildWorkforceDashboardAggregates>;
  departmentAgg: ReturnType<typeof aggregateByDepartment>;
  operationalRoles: JobRole[];
}

function mergeOhManualForBu(
  buId: string,
  ohManualByBusinessUnitId: Record<string, OhManualSettings>
): OhManualSettings {
  return { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[buId] ?? {}) };
}

export function deriveHrWorkforceModel(input: {
  roles: JobRole[];
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
}): HrWorkforceDerived {
  const { roles, businessUnits, departments, teams, hrGlobalSettings, ohManualByBusinessUnitId } = input;

  const buIdsFromStructure = businessUnits.map((b) => b.id);
  const extraBuIds = new Set<string>();
  for (const r of roles) {
    if (!r.archived && r.businessUnitId && !buIdsFromStructure.includes(r.businessUnitId)) {
      extraBuIds.add(r.businessUnitId);
    }
  }
  const allBuIds = [...buIdsFromStructure, ...extraBuIds];

  const ohByBusinessUnitId: Record<string, OhBundleByBusinessUnit> = {};
  let totalEffectiveOhBillableFte = 0;

  for (const buId of allBuIds) {
    const om = mergeOhManualForBu(buId, ohManualByBusinessUnitId);
    const effectiveBillable = effectiveOhBillableHeadcount(roles, om, buId);
    const ohNumerator = resolveOhAnnualNumerator(om, roles, hrGlobalSettings, buId);
    const oh = computeOhEngine({
      ...hrGlobalSettings,
      ...om,
      billableEmployeeCount: effectiveBillable,
      totalAnnualOverhead: ohNumerator.totalNumerator,
    });
    ohByBusinessUnitId[buId] = { oh, ohNumerator };
    totalEffectiveOhBillableFte += oh.effectiveBillableEmployeeCount;
  }

  const getOhRateForRole = (r: JobRole): number =>
    ohByBusinessUnitId[r.businessUnitId]?.oh.ohRatePerHour ?? 0;

  const skipOhSurchargeOnNonBillable = (r: JobRole): boolean =>
    (ohByBusinessUnitId[r.businessUnitId]?.ohNumerator.composed ?? false) === true;

  const breakdowns = computeAllRoleBreakdowns(roles, hrGlobalSettings, getOhRateForRole, {
    skipOhSurchargeOnNonBillable,
  });
  const breakdownByRoleId = new Map(breakdowns.map((b) => [b.roleId, b]));

  const useTeamLevel = hrGlobalSettings.useTeamLevel !== false;
  const operationalRoles = roles.filter(
    (r) =>
      !r.archived &&
      isRoleInActiveOperationalStructure(r, businessUnits, departments, teams, { useTeamLevel })
  );
  const opBreakdowns = computeAllRoleBreakdowns(operationalRoles, hrGlobalSettings, getOhRateForRole, {
    skipOhSurchargeOnNonBillable,
  });

  const deptNames = new Map(departments.map((d) => [d.id, d.name]));
  const dashboard = buildWorkforceDashboardAggregates(operationalRoles, opBreakdowns);
  const departmentAgg = aggregateByDepartment(operationalRoles, opBreakdowns, deptNames);

  return {
    ohByBusinessUnitId,
    totalEffectiveOhBillableFte,
    breakdowns,
    breakdownByRoleId,
    dashboard,
    departmentAgg,
    operationalRoles,
  };
}
