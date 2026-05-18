import type {
  ComparisonNarrativeLabels,
  ScenarioComparisonNarrative,
  ScenarioComparisonResult,
} from "@/types/scenario-comparison";

function fmtPct(n: number | null): string {
  if (n === null || !Number.isFinite(n)) return "—";
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

export function buildComparisonNarrative(
  result: ScenarioComparisonResult,
  labels: ComparisonNarrativeLabels
): ScenarioComparisonNarrative {
  const { meta, financial, posture, governance, capacityPressure } = result;
  const bullets: string[] = [];
  const riskFlags: string[] = [];

  const rev = financial.revenue;
  if (rev.significance !== "low" && rev.percent !== null) {
    bullets.push(
      rev.direction === "up"
        ? labels.revenueUp(fmtPct(rev.percent), meta.compareName, meta.baseName)
        : labels.revenueDown(fmtPct(rev.percent), meta.compareName, meta.baseName)
    );
  }

  const np = financial.netProfit;
  if (np.significance !== "low" && np.percent !== null) {
    bullets.push(
      np.direction === "up"
        ? labels.netProfitUp(fmtPct(np.percent))
        : labels.netProfitDown(fmtPct(np.percent))
    );
  }

  const gap = financial.salesNeededGap;
  if (gap.significance !== "low") {
    if (gap.direction === "up") {
      riskFlags.push(labels.salesGapWiden(String(Math.round(gap.absolute))));
    } else if (gap.direction === "down") {
      bullets.push(labels.salesGapNarrow(String(Math.round(Math.abs(gap.absolute)))));
    }
  }

  for (const p of posture) {
    if (!p.shifted) continue;
    bullets.push(
      labels.postureShift(
        labels.postureLabels[p.field],
        labels.postureLevel[p.base],
        labels.postureLevel[p.compare]
      )
    );
  }

  if (governance.scenarioType.changed) {
    bullets.push(
      labels.governanceTypeChange(
        governance.scenarioType.base,
        governance.scenarioType.compare
      )
    );
  }

  if (capacityPressure.delta.significance !== "low") {
    bullets.push(
      labels.capacityProxy(capacityPressure.baseLabel, capacityPressure.compareLabel)
    );
  }

  const headline =
    bullets[0] ??
    labels.defaultHeadline(meta.compareName, meta.baseName);

  return {
    headline,
    bullets: bullets.slice(1),
    riskFlags,
    sharedStreamMixDisclaimer: true,
  };
}
