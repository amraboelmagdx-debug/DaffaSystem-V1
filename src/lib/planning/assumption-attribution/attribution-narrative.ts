import type {
  AssumptionAttributionResult,
  AttributionNarrativeLabels,
  AttributionNarrative,
} from "@/types/scenario-attribution";
import type { ScenarioComparisonResult } from "@/types/scenario-comparison";

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(0)}%`;
}

function driverNames(
  drivers: AssumptionAttributionResult["drivers"],
  labels: AttributionNarrativeLabels,
  n: number
): string {
  return drivers
    .slice(0, n)
    .map((d) => labels.driverLabel[d.id])
    .join(", ");
}

export function buildAttributionNarrative(
  attribution: AssumptionAttributionResult,
  comparison: ScenarioComparisonResult,
  labels: AttributionNarrativeLabels
): AttributionNarrative {
  const primary = attribution.drivers.filter((d) => d.role === "primary");
  const revDrivers = [...attribution.drivers]
    .filter((d) => d.contributions.revenue.absolute > 0)
    .sort((a, b) => b.contributions.revenue.absolute - a.contributions.revenue.absolute);
  const npNegDrivers = [...attribution.drivers]
    .filter((d) => d.contributions.netProfit.absolute < 0)
    .sort(
      (a, b) =>
        a.contributions.netProfit.absolute - b.contributions.netProfit.absolute
    );

  const revPct = comparison.financial.revenue.percent;
  const bullets: string[] = [];

  let headline = labels.whyChanged(
    primary[0] ? labels.driverLabel[primary[0].id] : comparison.meta.compareName
  );

  if (revDrivers.length >= 1 && revPct !== null) {
    const names =
      revDrivers.length >= 2
        ? driverNames(revDrivers, labels, 2)
        : labels.driverLabel[revDrivers[0]!.id];
    bullets.push(labels.revenueHeadline(names, fmtPct(revPct)));
    headline = bullets[0] ?? headline;
  }

  if (npNegDrivers.length && comparison.financial.netProfit.direction === "down") {
    const names = driverNames(npNegDrivers, labels, 2);
    bullets.push(labels.marginHeadline(names));
    if (!revDrivers.length) headline = bullets[bullets.length - 1] ?? headline;
  }

  for (const p of comparison.posture.filter((x) => x.shifted)) {
    const field = labels.postureLabels[p.field];
    const from = labels.postureLevel[p.base] ?? p.base;
    const to = labels.postureLevel[p.compare] ?? p.compare;
    bullets.push(labels.postureShift(field, from, to));
  }

  const tradeoffBullets = attribution.tradeoffs.map((t) => {
    const gain = revDrivers[0] ? labels.driverLabel[revDrivers[0].id] : "revenue";
    const cost = npNegDrivers[0] ? labels.driverLabel[npNegDrivers[0].id] : "margin";
    return labels.tradeoff(gain, cost);
  });

  if (attribution.riskIndicators.length) {
    const key = attribution.riskIndicators[0]!.labelKey;
    bullets.push(
      labels.riskHeadline(labels.pressureLabels[key] ?? key)
    );
  }

  const residualMag =
    Math.abs(attribution.residual.netProfit) > 1000 ||
    Math.abs(attribution.residual.revenue) > 1000;
  if (residualMag) {
    bullets.push(
      labels.residualNote(
        String(Math.round(attribution.residual.revenue)),
        String(Math.round(attribution.residual.netProfit))
      )
    );
  }

  return {
    headline,
    whatChanged: labels.whatChanged(attribution.drivers.length),
    whyChanged: labels.whyChanged(
      primary[0] ? labels.driverLabel[primary[0].id] : comparison.meta.compareName
    ),
    bullets: bullets.slice(headline === bullets[0] ? 1 : 0),
    tradeoffBullets,
  };
}
