"use client";

import { useTranslations } from "next-intl";
import type { AssumptionAttributionResult } from "@/types/scenario-attribution";

type Props = {
  attribution: AssumptionAttributionResult;
  driverLabels: Record<string, string>;
};

const MEASURE_KEYS: Record<string, string> = {
  revenue: "contribution.revenue",
  netProfit: "contribution.netProfit",
  grossProfit: "contribution.grossProfit",
  npPct: "contribution.npPct",
  salesGap: "contribution.salesGap",
  workbookCm: "contribution.workbookCm",
};

export function AssumptionImpactGraph({ attribution, driverLabels }: Props) {
  const t = useTranslations("planning.attribution");
  const top = attribution.impactGraph.slice(0, 12);

  if (!top.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("impactGraph")}
      </p>
      <ul className="divide-y divide-border/50 rounded-md border border-border/60 text-sm">
        {top.map((edge) => (
          <li
            key={`${edge.driverId}-${edge.measure}`}
            className="flex items-center justify-between gap-2 px-3 py-2"
          >
            <span className="text-muted-foreground">
              {driverLabels[edge.driverId] ?? edge.driverId}
            </span>
            <span className="font-medium">
              {t(MEASURE_KEYS[edge.measure] ?? edge.measure)}
            </span>
            <span className="tabular-nums text-xs text-muted-foreground">
              {edge.weight.toLocaleString(undefined, { maximumFractionDigits: 0 })}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
