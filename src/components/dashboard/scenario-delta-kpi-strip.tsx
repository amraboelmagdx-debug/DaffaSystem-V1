"use client";

import { useLocale, useTranslations } from "next-intl";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import type { NumericDelta, ScenarioComparisonResult } from "@/types/scenario-comparison";

function deltaLabel(
  d: NumericDelta,
  fmt: (n: number) => string,
  fmtPctDelta: (n: number | null) => string
): string {
  if (d.percent !== null && Number.isFinite(d.percent)) {
    const sign = d.absolute >= 0 ? "+" : "";
    return `${sign}${d.percent.toFixed(1)}% (${sign}${fmt(d.absolute)})`;
  }
  const sign = d.absolute >= 0 ? "+" : "";
  return `${sign}${fmt(d.absolute)}`;
}

type Props = {
  comparison: ScenarioComparisonResult;
};

export function ScenarioDeltaKpiStrip({ comparison }: Props) {
  const t = useTranslations("planning.comparison");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);
  const fmtPctDelta = (n: number | null) =>
    n !== null && Number.isFinite(n) ? `${n >= 0 ? "+" : ""}${n.toFixed(1)}%` : "—";

  const f = comparison.financial;
  const cards: {
    title: string;
    value: string;
    delta: string;
    positive: boolean;
    explanation: string;
  }[] = [
    {
      title: t("kpi.revenue"),
      value: fmt(f.revenue.compare),
      delta: deltaLabel(f.revenue, fmt, fmtPctDelta),
      positive: f.revenue.direction !== "down",
      explanation: t("kpi.revenueExplain"),
    },
    {
      title: t("kpi.netProfit"),
      value: fmt(f.netProfit.compare),
      delta: deltaLabel(f.netProfit, fmt, fmtPctDelta),
      positive: f.netProfit.direction !== "down",
      explanation: t("kpi.netProfitExplain"),
    },
    {
      title: t("kpi.margin"),
      value: formatPct(f.npPct.compare),
      delta: deltaLabel(
        { ...f.npPct, absolute: f.npPct.absolute * 100, percent: f.npPct.percent },
        (n) => `${n.toFixed(1)} pts`,
        fmtPctDelta
      ),
      positive: f.npPct.direction !== "down",
      explanation: t("kpi.marginExplain"),
    },
    {
      title: t("kpi.roi"),
      value: formatPct(f.roi.compare),
      delta: deltaLabel(f.roi, (n) => formatPct(n), fmtPctDelta),
      positive: f.roi.direction !== "down",
      explanation: t("kpi.roiExplain"),
    },
    {
      title: t("kpi.salesGap"),
      value: fmt(f.salesNeededGap.compare),
      delta: deltaLabel(f.salesNeededGap, fmt, fmtPctDelta),
      positive: f.salesNeededGap.direction === "down",
      explanation: t("kpi.salesGapExplain"),
    },
    {
      title: t("kpi.workbookCm"),
      value: formatPct(f.workbookBlendedCm.compare),
      delta: deltaLabel(f.workbookBlendedCm, (n) => formatPct(n), fmtPctDelta),
      positive: f.workbookBlendedCm.direction !== "down",
      explanation: t("kpi.workbookCmExplain"),
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <KpiCard
          key={card.title}
          title={card.title}
          value={card.value}
          delta={card.delta}
          positive={card.positive}
          explanation={card.explanation}
        />
      ))}
    </div>
  );
}
