import type {
  HrBusinessUnit,
  HrDepartment,
  HrGlobalSettings,
  HrTeam,
  JobRole,
  OhManualSettings,
  OhNonWorkforceLine,
} from "@/types/hr-workforce";
import type { HrSnapshotRecord } from "@/stores/use-hr-workforce-store";
import { parseHrSnapshotPayload } from "@/stores/use-hr-workforce-store";
import { deriveHrWorkforceModel, type HrWorkforceDerived } from "@/lib/hr-workforce/selectors";
import { buildWorkforceDashboardAggregates } from "@/lib/hr-workforce/aggregates";
import { effectiveOperationalRoleType } from "@/lib/hr-workforce/role-operational-type";
import { annualAmountNonWorkforceLine } from "@/lib/hr-workforce/oh-numerator";
import { monthlyOhLoadMarginForRoles } from "@/lib/hr-workforce/workforce-cost-engine";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import { classifyWorkforceSegment } from "./classify-workforce-segment";
import { buildWorkforceAlerts } from "./workforce-alerts";
import type {
  BuBenchmarkRow,
  ExecutiveTrend,
  OhCompositionMonthly,
  RoleSegmentCost,
  TrendDirection,
  WorkforceIntelligence,
} from "./types";

const EPS = 1e-9;

function mergeOhManualForBu(
  buId: string,
  ohManualByBusinessUnitId: Record<string, OhManualSettings>
): OhManualSettings {
  return { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[buId] ?? {}) };
}

function bucketNonWorkforceLine(line: OhNonWorkforceLine): keyof Omit<OhCompositionMonthly, "indirectWorkforce" | "additionalOverheadBucket"> {
  const t = `${line.category ?? ""} ${line.name}`.toLowerCase();
  if (/rent|lease|إيجار|تأجير/.test(t)) return "rent";
  if (/software|saas|license|subscription|cloud|microsoft|adobe|\bit\b|tech|برمج|اشتراك/.test(t)) return "software";
  if (/legal|counsel|attorney|محام|قانون/.test(t)) return "legal";
  if (/utilit|electric|water|gas|مرفق|كهرب|ماء/.test(t)) return "utilities";
  if (/infra|server|hosting|datacenter|network|hardware|سيرفر|استضافة/.test(t)) return "infrastructure";
  return "miscellaneous";
}

function emptyComposition(): OhCompositionMonthly {
  return {
    indirectWorkforce: 0,
    rent: 0,
    software: 0,
    legal: 0,
    utilities: 0,
    infrastructure: 0,
    miscellaneous: 0,
    additionalOverheadBucket: 0,
  };
}

function sumComposition(a: OhCompositionMonthly, b: OhCompositionMonthly): OhCompositionMonthly {
  return {
    indirectWorkforce: a.indirectWorkforce + b.indirectWorkforce,
    rent: a.rent + b.rent,
    software: a.software + b.software,
    legal: a.legal + b.legal,
    utilities: a.utilities + b.utilities,
    infrastructure: a.infrastructure + b.infrastructure,
    miscellaneous: a.miscellaneous + b.miscellaneous,
    additionalOverheadBucket: a.additionalOverheadBucket + b.additionalOverheadBucket,
  };
}

function computeExecutiveTrend(
  currentMonthly: number,
  snapshots: HrSnapshotRecord[],
  hrGlobalSettings: HrGlobalSettings
): ExecutiveTrend {
  const sorted = [...snapshots].sort(
    (a, b) => new Date(b.meta.createdAt).getTime() - new Date(a.meta.createdAt).getTime()
  );
  if (sorted.length < 2) {
    return { priorMonthlyWorkforceCost: null, deltaPct: null, direction: "unknown" };
  }
  let prior: number | null = null;
  try {
    const p = parseHrSnapshotPayload(sorted[1]!.payloadJson);
    const m = deriveHrWorkforceModel({
      roles: p.roles ?? [],
      businessUnits: p.businessUnits ?? [],
      departments: p.departments ?? [],
      teams: p.teams ?? [],
      hrGlobalSettings: p.hrGlobalSettings ?? hrGlobalSettings,
      ohManualByBusinessUnitId: p.ohManualByBusinessUnitId ?? {},
    });
    prior = m.dashboard.monthlyWorkforceCost;
  } catch {
    prior = null;
  }
  if (prior == null || prior <= EPS) {
    return { priorMonthlyWorkforceCost: prior, deltaPct: null, direction: "unknown" };
  }
  const deltaPct = ((currentMonthly - prior) / prior) * 100;
  let direction: TrendDirection = "flat";
  if (deltaPct > 1) direction = "up";
  else if (deltaPct < -1) direction = "down";
  return { priorMonthlyWorkforceCost: prior, deltaPct, direction };
}

function departmentCostHhi(departmentAgg: { monthlyCost: number }[], totalMonthly: number): number {
  if (totalMonthly <= EPS) return 0;
  let h = 0;
  for (const d of departmentAgg) {
    const s = d.monthlyCost / totalMonthly;
    h += s * s;
  }
  return Math.min(1, h);
}

function top3CostSharePct(departmentAgg: { monthlyCost: number }[], totalMonthly: number): number {
  if (totalMonthly <= EPS) return 0;
  const sorted = [...departmentAgg].sort((a, b) => b.monthlyCost - a.monthlyCost);
  let top = 0;
  for (let i = 0; i < Math.min(3, sorted.length); i++) top += sorted[i]!.monthlyCost;
  return Math.min(100, (top / totalMonthly) * 100);
}

export function deriveWorkforceIntelligence(input: {
  model: HrWorkforceDerived;
  allRoles: JobRole[];
  businessUnits: HrBusinessUnit[];
  departments: HrDepartment[];
  teams: HrTeam[];
  hrGlobalSettings: HrGlobalSettings;
  ohManualByBusinessUnitId: Record<string, OhManualSettings>;
  currency: string;
  snapshots: HrSnapshotRecord[];
  /**
   * When set, inactive department/team counts use this list (org-wide) while other
   * analytics still follow `departments` / `teams` passed above (e.g. BU-scoped view).
   */
  orgStructureForHygiene?: { departments: HrDepartment[]; teams: HrTeam[] };
  /**
   * When true, snapshot cost trend is suppressed (snapshots are replayed org-wide in the engine).
   */
  disableSnapshotTrend?: boolean;
}): WorkforceIntelligence {
  const {
    model,
    allRoles,
    businessUnits,
    departments,
    teams,
    hrGlobalSettings,
    ohManualByBusinessUnitId,
    currency,
    snapshots,
    orgStructureForHygiene,
    disableSnapshotTrend,
  } = input;

  const hygieneDepartments = orgStructureForHygiene?.departments ?? departments;
  const hygieneTeams = orgStructureForHygiene?.teams ?? teams;

  const { operationalRoles, breakdownByRoleId, dashboard, departmentAgg, ohByBusinessUnitId } = model;

  const primaryBusinessUnitId =
    businessUnits.find((b) => b.isActive !== false)?.id ?? businessUnits[0]?.id ?? "";

  let deliveryPayrollMonthly = 0;
  for (const r of operationalRoles) {
    if (effectiveOperationalRoleType(r) !== "delivery") continue;
    deliveryPayrollMonthly += breakdownByRoleId.get(r.id)?.monthlyTotalCost ?? 0;
  }
  const indirectPayrollMonthly = Math.max(0, dashboard.monthlyWorkforceCost - deliveryPayrollMonthly);
  const totalMonthly = Math.max(EPS, dashboard.monthlyWorkforceCost);
  const deliveryPayrollShare = deliveryPayrollMonthly / totalMonthly;
  const indirectBurdenShare = indirectPayrollMonthly / totalMonthly;
  const monthlyOhLoad = monthlyOhLoadMarginForRoles(operationalRoles, breakdownByRoleId, hrGlobalSettings);
  const monthlyOhLoadRatio = monthlyOhLoad / totalMonthly;

  let orgWideOhNum = 0;
  let orgWideOhDen = 0;
  let totalDeliveryBillableHoursPerMonth = 0;
  let theoreticalBillableHoursPerMonthAtFullUtil = 0;
  for (const buId of Object.keys(ohByBusinessUnitId)) {
    const bundle = ohByBusinessUnitId[buId]!;
    const h = bundle.oh.totalBillableHoursPerMonth;
    orgWideOhNum += bundle.oh.ohRatePerHour * h;
    orgWideOhDen += h;
    totalDeliveryBillableHoursPerMonth += h;
    const om = mergeOhManualForBu(buId, ohManualByBusinessUnitId);
    const u = Math.max(EPS, om.utilizationRatePct / 100);
    theoreticalBillableHoursPerMonthAtFullUtil += h / u;
  }
  const orgWideOhRatePerHour = orgWideOhDen > EPS ? orgWideOhNum / orgWideOhDen : 0;

  let utilNum = 0;
  let utilDen = 0;
  for (const buId of Object.keys(ohByBusinessUnitId)) {
    const om = mergeOhManualForBu(buId, ohManualByBusinessUnitId);
    const h = ohByBusinessUnitId[buId]!.oh.totalBillableHoursPerMonth;
    utilNum += om.utilizationRatePct * h;
    utilDen += h;
  }
  const capacityUtilizationPct = utilDen > EPS ? utilNum / utilDen : 0;

  const lostHoursPerMonthVsFullUtil = Math.max(0, theoreticalBillableHoursPerMonthAtFullUtil - totalDeliveryBillableHoursPerMonth);

  const buNameById = new Map(businessUnits.map((b) => [b.id, b.name]));
  const deptNameById = new Map(departments.map((d) => [d.id, d.name]));
  const teamNameById = new Map(teams.map((t) => [t.id, t.name]));

  const headcountGrouped = (getKey: (r: JobRole) => string, label: (id: string) => string) => {
    const m = new Map<string, { id: string; name: string; count: number }>();
    for (const r of operationalRoles) {
      const id = getKey(r);
      const name = label(id);
      const prev = m.get(id) ?? { id, name, count: 0 };
      prev.count += Math.max(0, Math.floor(r.employeeCount));
      m.set(id, prev);
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  };

  let deliverySegHc = 0;
  let supportSegHc = 0;
  let managementSegHc = 0;
  for (const r of operationalRoles) {
    const n = Math.max(0, Math.floor(r.employeeCount));
    const seg = classifyWorkforceSegment(r);
    if (seg === "delivery") deliverySegHc += n;
    else if (seg === "management") managementSegHc += n;
    else supportSegHc += n;
  }

  const indirectLegacyHc = operationalRoles.reduce((s, r) => {
    if (effectiveOperationalRoleType(r) === "indirect") return s + Math.max(0, Math.floor(r.employeeCount));
    return s;
  }, 0);

  const uniqueDeptIds = new Set(operationalRoles.map((r) => r.departmentId));
  const avgRolesPerDepartment =
    uniqueDeptIds.size > 0 ? operationalRoles.length / uniqueDeptIds.size : 0;
  const totalHc = Math.max(1, dashboard.totalEmployees);
  const managementRatio = managementSegHc / totalHc;

  const hygiene: WorkforceIntelligence["org"]["hygiene"] = {
    inactiveDepartments: hygieneDepartments.filter((d) => d.isActive === false).length,
    inactiveTeams: hygieneTeams.filter((t) => t.isActive === false).length,
    archivedRoles: allRoles.filter((r) => r.archived).length,
  };

  const topRoles = [...operationalRoles]
    .map((r) => ({
      id: r.id,
      name: r.name,
      monthly: breakdownByRoleId.get(r.id)?.monthlyTotalCost ?? 0,
    }))
    .sort((a, b) => b.monthly - a.monthly)
    .slice(0, 12)
    .map(({ id, name, monthly }) => ({ id, name, monthly }));

  const topDepartments = departmentAgg.slice(0, 12).map((d) => ({
    id: d.departmentId,
    name: d.departmentName,
    monthly: d.monthlyCost,
  }));

  let composition = emptyComposition();
  for (const buId of Object.keys(ohByBusinessUnitId)) {
    const num = ohByBusinessUnitId[buId]!.ohNumerator;
    const om = mergeOhManualForBu(buId, ohManualByBusinessUnitId);
    const slice = emptyComposition();
    if (num.composed) {
      slice.indirectWorkforce = num.indirectWorkforceAnnualStd / 12;
      for (const line of om.ohNonWorkforceLines ?? []) {
        const annual = annualAmountNonWorkforceLine(line);
        const mon = annual / 12;
        const b = bucketNonWorkforceLine(line);
        switch (b) {
          case "rent":
            slice.rent += mon;
            break;
          case "software":
            slice.software += mon;
            break;
          case "legal":
            slice.legal += mon;
            break;
          case "utilities":
            slice.utilities += mon;
            break;
          case "infrastructure":
            slice.infrastructure += mon;
            break;
          default:
            slice.miscellaneous += mon;
            break;
        }
      }
      slice.additionalOverheadBucket = num.additionalAnnualOverhead / 12;
    } else {
      slice.additionalOverheadBucket = num.totalNumerator / 12;
    }
    composition = sumComposition(composition, slice);
  }

  const burden = {
    ohToDeliveryPayroll: monthlyOhLoad / Math.max(EPS, deliveryPayrollMonthly),
    ohToTotalPayroll: monthlyOhLoad / totalMonthly,
  };

  const benchmarking: BuBenchmarkRow[] = [];
  for (const bu of businessUnits) {
    if (bu.isActive === false) continue;
    const inBu = operationalRoles.filter((r) => r.businessUnitId === bu.id);
    if (inBu.length === 0) continue;
    const bds = inBu.map((r) => breakdownByRoleId.get(r.id)).filter(Boolean) as Parameters<
      typeof buildWorkforceDashboardAggregates
    >[1];
    const dashBu = buildWorkforceDashboardAggregates(inBu, bds);
    let delPay = 0;
    for (const r of inBu) {
      if (effectiveOperationalRoleType(r) !== "delivery") continue;
      delPay += breakdownByRoleId.get(r.id)?.monthlyTotalCost ?? 0;
    }
    const tot = Math.max(EPS, dashBu.monthlyWorkforceCost);
    const slot = ohByBusinessUnitId[bu.id];
    benchmarking.push({
      businessUnitId: bu.id,
      name: bu.name,
      ohRatePerHour: slot?.oh.ohRatePerHour ?? 0,
      monthlyWorkforceCost: dashBu.monthlyWorkforceCost,
      deliveryRatio: dashBu.billableEmployees / Math.max(1, dashBu.totalEmployees),
      indirectBurdenPct: Math.max(0, ((tot - delPay) / tot) * 100),
      avgLoadedHourly: dashBu.averageOhAdjustedHourly,
      monthlyBillableHours: slot?.oh.totalBillableHoursPerMonth ?? 0,
    });
  }
  benchmarking.sort((a, b) => b.monthlyWorkforceCost - a.monthlyWorkforceCost);

  const roleSegmentMap = new Map<RoleSegmentCost["segment"], { headcount: number; monthlyPayroll: number }>();
  for (const seg of ["delivery", "support", "management"] as const) {
    roleSegmentMap.set(seg, { headcount: 0, monthlyPayroll: 0 });
  }
  for (const r of operationalRoles) {
    const seg = classifyWorkforceSegment(r);
    const n = Math.max(0, Math.floor(r.employeeCount));
    const pay = breakdownByRoleId.get(r.id)?.monthlyTotalCost ?? 0;
    const cur = roleSegmentMap.get(seg)!;
    cur.headcount += n;
    cur.monthlyPayroll += pay;
    roleSegmentMap.set(seg, cur);
  }
  const roleSegments: RoleSegmentCost[] = (["delivery", "support", "management"] as const).map((segment) => {
    const v = roleSegmentMap.get(segment)!;
    return { segment, headcount: v.headcount, monthlyPayroll: v.monthlyPayroll };
  });

  const trend: ExecutiveTrend = disableSnapshotTrend
    ? {
        priorMonthlyWorkforceCost: null,
        deltaPct: null,
        direction: "unknown",
        suppressedReason: "snapshot_org_only",
      }
    : computeExecutiveTrend(dashboard.monthlyWorkforceCost, snapshots, hrGlobalSettings);

  const intel: WorkforceIntelligence = {
    generatedAt: new Date().toISOString(),
    currency,
    primaryBusinessUnitId,
    executive: {
      totalMonthlyWorkforceCost: dashboard.monthlyWorkforceCost,
      totalHeadcount: dashboard.totalEmployees,
      deliveryHeadcount: dashboard.billableEmployees,
      indirectHeadcount: dashboard.nonBillableEmployees,
      orgWideOhRatePerHour,
      workforceEfficiencyRatio: deliveryPayrollShare,
      deliveryVsIndirectRatio:
        dashboard.nonBillableEmployees > 0
          ? dashboard.billableEmployees / dashboard.nonBillableEmployees
          : dashboard.billableEmployees,
      avgLoadedHourly: dashboard.averageOhAdjustedHourly,
      capacityUtilizationPct,
      workforceCostConcentrationTop3Pct: top3CostSharePct(departmentAgg, dashboard.monthlyWorkforceCost),
    },
    org: {
      distribution: {
        byBusinessUnit: headcountGrouped(
          (r) => r.businessUnitId,
          (id) => buNameById.get(id) ?? id
        ),
        byDepartment: headcountGrouped(
          (r) => r.departmentId,
          (id) => deptNameById.get(id) ?? id
        ),
        byTeam: headcountGrouped(
          (r) => (r.teamId && r.teamId.length > 0 ? r.teamId : "__unassigned__"),
          (id) => (id === "__unassigned__" ? "Unassigned" : teamNameById.get(id) ?? id)
        ),
        deliveryHeadcount: deliverySegHc,
        supportHeadcount: supportSegHc,
        managementHeadcount: managementSegHc,
        indirectLegacyHeadcount: indirectLegacyHc,
      },
      span: {
        avgRolesPerDepartment,
        managementRatio,
        departmentCostConcentration: departmentCostHhi(departmentAgg, dashboard.monthlyWorkforceCost),
      },
      hygiene,
    },
    economics: {
      concentration: { topRoles, topDepartments },
      ratios: {
        deliveryPayrollShare,
        indirectBurdenShare,
        monthlyOhLoadRatio,
      },
    },
    oh: {
      compositionMonthly: composition,
      burden,
    },
    capacity: {
      totalDeliveryBillableHoursPerMonth,
      theoreticalBillableHoursPerMonthAtFullUtil,
      lostHoursPerMonthVsFullUtil,
      utilizationRatePct: capacityUtilizationPct,
    },
    benchmarking,
    roleSegments,
    alerts: [],
    trend,
  };

  intel.alerts = buildWorkforceAlerts(intel);
  return intel;
}
