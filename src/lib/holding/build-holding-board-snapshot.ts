import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type { HrBusinessUnit, JobRole } from "@/types/hr-workforce";
import { evaluateExecutiveWorkspaceMeasures } from "@/lib/planning/measures/executive-workspace-measures";
import {
  resolveActiveScenario,
  resolvePlanningEvaluation,
} from "@/lib/planning/measures/planning-evaluation-readiness";
import { partitionOperationalUnits } from "@/lib/platform-economics/operational-unit";
import { hrSnapshotFromStore } from "@/lib/planning/operational-feasibility/hr-snapshot-from-store";
import type { HrWorkforceSnapshot } from "@/types/operational-feasibility";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";

export type HoldingBuRow = {
  companyId: string;
  companyName: string;
  hrBusinessUnitId: string;
  hrBusinessUnitName: string;
  hrBusinessUnitCode?: string;
  scenarioName: string | null;
  revenueMonthly: number | null;
  netProfitMonthly: number | null;
  roiPct: number | null;
  headcount: number;
  status: "ready" | "blocked";
  blockReason?: string;
};

export type HoldingBoardSnapshot = {
  holdingName: string;
  rows: HoldingBuRow[];
  linkedCount: number;
  orphanCount: number;
};

function headcountForBu(roles: JobRole[], hrBusinessUnitId: string): number {
  return roles
    .filter((r) => !r.archived && r.businessUnitId === hrBusinessUnitId)
    .reduce((sum, r) => sum + (r.employeeCount ?? 1), 0);
}

function metricsForCompany(
  company: DemoCompany,
  streams: DemoRevenueStream[],
  opportunities: DemoOpportunity[],
  scenarios: DemoScenario[],
  scenarioBundles: PlanningContext["scenarioBundles"],
  tierLineOverrides: PlanningContext["tierLineOverrides"],
  hrSnapshot: HrWorkforceSnapshot | null
): Pick<HoldingBuRow, "scenarioName" | "revenueMonthly" | "netProfitMonthly" | "roiPct" | "status" | "blockReason"> {
  const companyScenarios = scenarios.filter((s) => s.companyId === company.id);
  const activeScenario = resolveActiveScenario(
    companyScenarios,
    companyScenarios.find((s) => s.baseline)?.id ?? companyScenarios[0]?.id ?? ""
  );

  const resolution = resolvePlanningEvaluation({
    company,
    streams,
    opportunities,
    scenarios: companyScenarios,
    activeScenarioId: activeScenario?.id ?? "",
    tierLineOverrides,
    scenarioBundles,
  });

  if (resolution.status === "blocked" || !activeScenario) {
    return {
      status: "blocked",
      blockReason: resolution.status === "blocked" ? resolution.reason : "no_scenarios",
      scenarioName: null,
      revenueMonthly: null,
      netProfitMonthly: null,
      roiPct: null,
    };
  }

  try {
    const measures = evaluateExecutiveWorkspaceMeasures(resolution.context, {
      hrSnapshot,
    });
    const engine = measures.activeEngine;
    return {
      status: "ready",
      scenarioName: measures.activeScenario.name,
      revenueMonthly: engine.revenue,
      netProfitMonthly: engine.netProfit,
      roiPct: engine.roi,
    };
  } catch {
    return {
      status: "blocked",
      blockReason: "evaluation_error",
      scenarioName: activeScenario.name,
      revenueMonthly: null,
      netProfitMonthly: null,
      roiPct: null,
    };
  }
}

export function buildHoldingBoardSnapshot(input: {
  organizationName: string | null;
  companies: DemoCompany[];
  streams: DemoRevenueStream[];
  opportunities: DemoOpportunity[];
  scenarios: DemoScenario[];
  scenarioBundles: PlanningContext["scenarioBundles"];
  tierLineOverrides: PlanningContext["tierLineOverrides"];
  businessUnits: HrBusinessUnit[];
  roles: JobRole[];
  hrSlice: Parameters<typeof hrSnapshotFromStore>[0];
}): HoldingBoardSnapshot {
  const { linked, orphans } = partitionOperationalUnits(input.companies);
  const hrSnapshot = hrSnapshotFromStore(input.hrSlice);
  const buById = new Map(input.businessUnits.map((b) => [b.id, b]));

  const rows: HoldingBuRow[] = linked.map((company) => {
    const hrBuId = company.hrBusinessUnitId ?? "";
    const hrBu = buById.get(hrBuId);
    const metrics = metricsForCompany(
      company,
      input.streams,
      input.opportunities,
      input.scenarios,
      input.scenarioBundles,
      input.tierLineOverrides,
      hrSnapshot
    );

    return {
      companyId: company.id,
      companyName: company.name,
      hrBusinessUnitId: hrBuId,
      hrBusinessUnitName: hrBu?.name ?? company.name,
      hrBusinessUnitCode: hrBu?.code,
      headcount: headcountForBu(input.roles, hrBuId),
      ...metrics,
    };
  });

  rows.sort((a, b) => a.hrBusinessUnitName.localeCompare(b.hrBusinessUnitName));

  return {
    holdingName: input.organizationName?.trim() || "Holding",
    rows,
    linkedCount: linked.length,
    orphanCount: orphans.length,
  };
}
