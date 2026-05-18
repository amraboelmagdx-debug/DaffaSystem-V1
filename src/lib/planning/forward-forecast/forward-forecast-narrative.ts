import { mergeGovernanceOnHydrate } from "@/lib/planning/scenario/scenario-governance";
import type { PlanningContext } from "@/lib/planning/measures/planning-context";
import type {
  FinancialTrajectory,
  ForwardForecastNarrative,
  OperationalTrajectory,
  SustainabilityIndicator,
  TargetAttainmentSummary,
} from "@/types/forward-forecast";

export type ForwardForecastNarrativeLabels = {
  headlineStable: string;
  headlineSaturation: string;
  headlineHiring: string;
  headlineMargin: string;
  bulletSaturation: string;
  bulletHiring: string;
  bulletMargin: string;
  bulletConservative: string;
  indicatorSaturation: string;
  indicatorHiring: string;
  indicatorMargin: string;
};

const defaultLabels: ForwardForecastNarrativeLabels = {
  headlineStable: "Forward path remains within operational guardrails.",
  headlineSaturation:
    "Growth trajectory exceeds safe delivery utilization before horizon end.",
  headlineHiring: "Revenue path requires sustained hiring to stay feasible.",
  headlineMargin: "Margin trajectory compresses under utilization pressure.",
  bulletSaturation:
    "{posture} becomes operationally strained after {month} due to delivery saturation.",
  bulletHiring:
    "Revenue growth remains achievable if hiring pace increases by {fte}/month.",
  bulletMargin:
    "Net margin trend declines by {pct} points across the horizon as load rises.",
  bulletConservative:
    "Conservative posture keeps utilization within safe thresholds across the horizon.",
  indicatorSaturation: "Delivery saturation",
  indicatorHiring: "Staffing pressure",
  indicatorMargin: "Margin compression",
};

function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? ""));
}

export function buildForwardForecastNarrative(input: {
  context: PlanningContext;
  financial: FinancialTrajectory;
  operational: OperationalTrajectory;
  targets: TargetAttainmentSummary;
  labels?: Partial<ForwardForecastNarrativeLabels>;
}): ForwardForecastNarrative {
  const labels = { ...defaultLabels, ...input.labels };
  const { context, financial, operational, targets } = input;
  const bundle = context.scenarioBundles?.[context.activeScenarioId];
  const governance = bundle ? mergeGovernanceOnHydrate(bundle).governance : null;
  const posture = governance?.aggressivenessLevel ?? "neutral";
  const scenarioName = bundle?.scenario.name ?? "Active scenario";

  const indicators: SustainabilityIndicator[] = [];
  const bullets: string[] = [];

  if (operational.firstSaturationMonth) {
    indicators.push({
      id: "delivery-saturation",
      level: "critical",
      labelKey: "deliverySaturation",
      reasonKey: "deliverySaturationReason",
      firstBreachMonth: operational.firstSaturationMonth,
    });
    bullets.push(
      fill(labels.bulletSaturation, {
        posture: scenarioName,
        month: operational.firstSaturationMonth,
      })
    );
  }

  if (operational.recommendedHireFtePerMonth != null && operational.recommendedHireFtePerMonth > 0) {
    indicators.push({
      id: "staffing-pressure",
      level: "elevated",
      labelKey: "staffingPressure",
      reasonKey: "staffingPressureReason",
      firstBreachMonth: operational.firstSaturationMonth,
    });
    bullets.push(
      fill(labels.bulletHiring, {
        fte: operational.recommendedHireFtePerMonth.toFixed(2),
      })
    );
  }

  if (financial.marginTrendPct < -2) {
    indicators.push({
      id: "margin-compression",
      level: "watch",
      labelKey: "marginCompression",
      reasonKey: "marginCompressionReason",
      firstBreachMonth: null,
    });
    bullets.push(
      fill(labels.bulletMargin, {
        pct: Math.abs(financial.marginTrendPct).toFixed(1),
      })
    );
  }

  if (posture === "low" && !operational.firstSaturationMonth && operational.mode === "hr_backed") {
    bullets.push(labels.bulletConservative);
  }

  let headline = labels.headlineStable;
  if (operational.firstSaturationMonth) {
    headline = labels.headlineSaturation;
  } else if (operational.recommendedHireFtePerMonth != null && operational.recommendedHireFtePerMonth > 0) {
    headline = labels.headlineHiring;
  } else if (financial.marginTrendPct < -2) {
    headline = labels.headlineMargin;
  }

  if (targets.monthsToTarget != null && targets.monthsToTarget <= financial.points.length) {
    bullets.push(
      `Workbook sales target is reached in month ${targets.monthsToTarget} of the horizon.`
    );
  }

  return { headline, bullets, sustainabilityIndicators: indicators };
}
