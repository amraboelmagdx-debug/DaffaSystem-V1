import type {
  OperationalFeasibilityNarrative,
  OperationalFeasibilityNarrativeLabels,
  OperationalFeasibilityStatus,
  RoleCapacityRow,
  ServiceDeliveryPressure,
  StaffingPressure,
  OperationalSaturation,
  OperationalRiskIndicator,
  OperationalFeasibilityMeta,
} from "@/types/operational-feasibility";

type NarrativeInput = {
  status: OperationalFeasibilityStatus;
  meta: OperationalFeasibilityMeta;
  roleRows: RoleCapacityRow[];
  servicePressures: ServiceDeliveryPressure[];
  staffing: StaffingPressure | null;
  saturation: OperationalSaturation | null;
  risks: OperationalRiskIndicator[];
  buUtilizationPct?: number;
  scenarioName?: string;
};

export function buildOperationalFeasibilityNarrative(
  input: NarrativeInput,
  labels: OperationalFeasibilityNarrativeLabels,
  mode: "evaluate" | "unavailable" | "compare"
): OperationalFeasibilityNarrative {
  if (mode === "unavailable") {
    return {
      headline: labels.unavailable(labels.statusLabel.unavailable),
      bullets: [],
      riskBullets: [],
    };
  }

  const scenario = input.scenarioName ?? input.meta.scenarioName;
  const pct = input.buUtilizationPct ?? input.saturation?.buUtilizationPct ?? 0;
  const pctStr = `${pct.toFixed(0)}%`;

  let headline: string;
  if (input.status === "feasible") {
    headline = labels.headlineFeasible(scenario);
  } else if (input.status === "constrained") {
    headline = labels.headlineConstrained(scenario, pctStr);
  } else {
    headline = labels.headlineInfeasible(scenario, pctStr);
  }

  const bullets: string[] = [];
  const riskBullets: string[] = [];

  const topBottleneck = input.roleRows.find((r) => r.isBottleneck);
  if (topBottleneck) {
    const excessPct =
      topBottleneck.utilizationPct > 0
        ? (topBottleneck.excessHoursMonth / Math.max(topBottleneck.safeAvailableHoursMonth, 1)) * 100
        : 0;
    bullets.push(
      labels.roleOverload(scenario, topBottleneck.roleName, excessPct.toFixed(0))
    );
  }

  const topService = input.servicePressures.find((s) => s.pressureLevel === "high");
  if (topService) {
    bullets.push(labels.serviceBottleneck(topService.streamName));
  }

  if (input.staffing && input.staffing.impliedFteGap > 0) {
    bullets.push(labels.hiringPressure(String(input.staffing.impliedFteGap)));
  }

  const overloadCount = input.roleRows.filter((r) => r.isBottleneck).length;
  if (overloadCount >= 2) {
    bullets.push(labels.thresholdBreach(String(overloadCount)));
  }

  for (const r of input.risks) {
    riskBullets.push(labels.riskLabels[r.labelKey] ?? r.labelKey);
  }

  if (mode === "compare" && bullets.length === 0) {
    headline = labels.headlineConstrained(scenario, pctStr);
  }

  return {
    headline: bullets[0] ?? headline,
    bullets: bullets.slice(headline === bullets[0] ? 1 : 0),
    riskBullets,
  };
}
