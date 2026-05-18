import type {
  HiringPressureLevel,
  OperationalFeasibilityNarrative,
  OperationalFeasibilityResult,
  OperationalFeasibilityStatus,
  OperationalRiskIndicator,
  UtilizationBand,
} from "@/types/operational-feasibility";
import type { FeasibilityEvalContext } from "./build-feasibility-context";
import { getBuBillableSupplyHours } from "./build-feasibility-context";
import {
  deriveRoleCapacityForBu,
  mergeOhManualForBu,
} from "./derive-role-capacity";
import {
  allocateDemandToStreams,
  deriveScenarioDemand,
} from "./derive-scenario-demand";
import { deriveServicePressures } from "./derive-service-demand";
import {
  EPS,
  FEASIBLE_RATIO_THRESHOLD,
  INFEASIBLE_RATIO_THRESHOLD,
  SAFE_UTILIZATION_PCT,
  STANDARD_FTE_HOURS_MONTH,
} from "./feasibility-constants";
import { buildOperationalFeasibilityNarrative } from "./operational-feasibility-narrative";
import type { OperationalFeasibilityNarrativeLabels } from "@/types/operational-feasibility";

function statusFromRatio(ratio: number): OperationalFeasibilityStatus {
  if (ratio < FEASIBLE_RATIO_THRESHOLD) return "feasible";
  if (ratio < INFEASIBLE_RATIO_THRESHOLD) return "constrained";
  return "infeasible";
}

function utilizationBand(pct: number): UtilizationBand {
  if (pct <= SAFE_UTILIZATION_PCT) return "safe";
  if (pct <= 100) return "elevated";
  return "critical";
}

function hiringLevel(fteGap: number): HiringPressureLevel {
  if (fteGap < 0.5) return "low";
  if (fteGap < 2) return "moderate";
  if (fteGap < 4) return "high";
  return "severe";
}

function roundFteGap(hours: number): number {
  if (hours <= 0) return 0;
  return Math.ceil(hours / STANDARD_FTE_HOURS_MONTH / 0.25) * 0.25;
}

function buildRisks(input: {
  status: OperationalFeasibilityStatus;
  overloadRoleCount: number;
  buUtilizationPct: number;
}): OperationalRiskIndicator[] {
  const risks: OperationalRiskIndicator[] = [];
  if (input.status === "infeasible") {
    risks.push({
      id: "delivery-infeasible",
      level: "elevated",
      labelKey: "deliveryInfeasible",
      reasonKey: "deliveryInfeasibleReason",
    });
  } else if (input.status === "constrained") {
    risks.push({
      id: "delivery-constrained",
      level: "moderate",
      labelKey: "deliveryConstrained",
      reasonKey: "deliveryConstrainedReason",
    });
  }
  if (input.overloadRoleCount >= 2) {
    risks.push({
      id: "role-overload",
      level: "elevated",
      labelKey: "roleOverload",
      reasonKey: "roleOverloadReason",
    });
  }
  if (input.buUtilizationPct > SAFE_UTILIZATION_PCT) {
    risks.push({
      id: "utilization-threshold",
      level: input.buUtilizationPct > 100 ? "elevated" : "moderate",
      labelKey: "utilizationThreshold",
      reasonKey: "utilizationThresholdReason",
    });
  }
  return risks;
}

const emptyNarrative: OperationalFeasibilityNarrative = {
  headline: "",
  bullets: [],
  riskBullets: [],
};

export function evaluateOperationalFeasibility(
  ctx: FeasibilityEvalContext,
  labels?: OperationalFeasibilityNarrativeLabels
): OperationalFeasibilityResult {
  const { company, hrBusinessUnitId, hrSnapshot, bundleEvaluation, baselineEvaluation } = ctx;
  const meta = {
    companyId: company.id,
    hrBusinessUnitId,
    scenarioId: bundleEvaluation.scenarioId,
    scenarioName: bundleEvaluation.scenario.name,
  };

  if (!hrBusinessUnitId) {
    const result: OperationalFeasibilityResult = {
      meta,
      feasibilityMode: "unavailable",
      unavailableReasonKey: "no_hr_link",
      status: "unavailable",
      supply: null,
      demand: null,
      roleRows: [],
      servicePressures: [],
      staffing: null,
      saturation: null,
      risks: [],
      narrative: labels
        ? buildOperationalFeasibilityNarrative(
            { status: "unavailable", meta, roleRows: [], servicePressures: [], staffing: null, saturation: null, risks: [] },
            labels,
            "unavailable"
          )
        : emptyNarrative,
      serviceMixDisclaimer: true,
    };
    return result;
  }

  const supplyRaw = getBuBillableSupplyHours(hrSnapshot, hrBusinessUnitId);
  if (!supplyRaw || supplyRaw.totalBillableHoursMonth <= EPS) {
    return {
      meta,
      feasibilityMode: "unavailable",
      unavailableReasonKey: "no_billable_capacity",
      status: "unavailable",
      supply: null,
      demand: null,
      roleRows: [],
      servicePressures: [],
      staffing: null,
      saturation: null,
      risks: [],
      narrative: labels
        ? buildOperationalFeasibilityNarrative(
            { status: "unavailable", meta, roleRows: [], servicePressures: [], staffing: null, saturation: null, risks: [] },
            labels,
            "unavailable"
          )
        : emptyNarrative,
      serviceMixDisclaimer: true,
    };
  }

  const ohManual = mergeOhManualForBu(hrBusinessUnitId, hrSnapshot.ohManualByBusinessUnitId);
  const roleSupplies = deriveRoleCapacityForBu({
    hrBusinessUnitId,
    roles: hrSnapshot.roles,
    hrGlobalSettings: hrSnapshot.hrGlobalSettings,
    ohManual,
  });

  const supplyAnchor = supplyRaw.totalBillableHoursMonth;
  const demand = deriveScenarioDemand({
    evaluation: bundleEvaluation,
    baselineEvaluation,
    supplyAnchorHoursMonth: supplyAnchor,
    salesPlanLoadIndex: ctx.salesPlanLoadIndex,
  });

  const ratio = demand.totalDemandHoursMonth / supplyRaw.totalBillableHoursMonth;
  const status = statusFromRatio(ratio);
  const buUtilizationPct = ratio * 100;

  const safeCapacityHoursMonth =
    supplyRaw.totalBillableHoursMonth * (SAFE_UTILIZATION_PCT / 100) / Math.max(supplyRaw.utilizationRatePct / 100, EPS);

  const supply = {
    totalBillableHoursMonth: supplyRaw.totalBillableHoursMonth,
    safeCapacityHoursMonth,
    utilizationRatePct: supplyRaw.utilizationRatePct,
    deliveryHeadcount: supplyRaw.deliveryHeadcount,
  };

  const totalRoleAvailable = roleSupplies.reduce((s, r) => s + r.availableHoursMonth, 0) || EPS;
  const roleRows = roleSupplies
    .map((r) => {
      const share = r.availableHoursMonth / totalRoleAvailable;
      const demandedHoursMonth = demand.totalDemandHoursMonth * share;
      const utilizationPct =
        r.availableHoursMonth > EPS ? (demandedHoursMonth / r.availableHoursMonth) * 100 : 0;
      const excessHoursMonth = Math.max(0, demandedHoursMonth - r.safeAvailableHoursMonth);
      const isBottleneck = utilizationPct > SAFE_UTILIZATION_PCT;
      return {
        roleId: r.roleId,
        roleName: r.roleName,
        availableHoursMonth: r.availableHoursMonth,
        safeAvailableHoursMonth: r.safeAvailableHoursMonth,
        demandedHoursMonth,
        utilizationPct,
        utilizationBand: utilizationBand(utilizationPct),
        isBottleneck,
        excessHoursMonth,
      };
    })
    .sort((a, b) => b.utilizationPct - a.utilizationPct);

  const streamDemand = allocateDemandToStreams(demand.totalDemandHoursMonth, ctx.streams);
  const servicePressures = deriveServicePressures({
    streamDemandHours: streamDemand,
    streams: ctx.streams,
    serviceHoursByTemplateId: ctx.serviceHoursByTemplateId,
    totalSupplyHours: supplyRaw.totalBillableHoursMonth,
  });

  const deficitHours = Math.max(0, demand.totalDemandHoursMonth - supplyRaw.totalBillableHoursMonth);
  const impliedFteGap = roundFteGap(deficitHours);
  const staffing = {
    impliedFteGap,
    hiringPressureLevel: hiringLevel(impliedFteGap),
    deficitHoursMonth: deficitHours,
  };

  const overloadRoleCount = roleRows.filter((r) => r.isBottleneck).length;
  const servicesOverCapacityCount = servicePressures.filter((s) => s.pressureLevel === "high").length;

  const saturation = {
    buUtilizationPct,
    safeUtilizationCeilingPct: SAFE_UTILIZATION_PCT,
    overloadRoleCount,
    servicesOverCapacityCount,
  };

  const risks = buildRisks({ status, overloadRoleCount, buUtilizationPct });

  const partial = {
    status,
    meta,
    roleRows,
    servicePressures,
    staffing,
    saturation,
    risks,
    buUtilizationPct,
    scenarioName: bundleEvaluation.scenario.name,
  };

  const narrative = labels
    ? buildOperationalFeasibilityNarrative(partial, labels, "evaluate")
    : emptyNarrative;

  return {
    meta,
    feasibilityMode: "hr_backed",
    status,
    supply,
    demand,
    roleRows,
    servicePressures,
    staffing,
    saturation,
    risks,
    narrative,
    serviceMixDisclaimer: true,
  };
}
