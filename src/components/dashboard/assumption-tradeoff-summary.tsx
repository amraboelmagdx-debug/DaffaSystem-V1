"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { useAttributionNarrativeLabels } from "@/lib/planning/scenario/use-attribution-narrative-labels";
import type { AssumptionAttributionResult } from "@/types/scenario-attribution";

type Props = {
  attribution: AssumptionAttributionResult;
  driverLabels: Record<string, string>;
};

export function AssumptionTradeoffSummary({ attribution, driverLabels }: Props) {
  const t = useTranslations("planning.attribution");
  const { pressureLabels } = useAttributionNarrativeLabels();

  const { tradeoffs, riskIndicators, narrative } = attribution;
  if (!tradeoffs.length && !riskIndicators.length && !narrative.tradeoffBullets.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("tradeoffs")}
      </p>
      {narrative.tradeoffBullets.length > 0 ? (
        <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
          {narrative.tradeoffBullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}
      {tradeoffs.map((tr) => (
        <p key={tr.id} className="text-sm text-muted-foreground">
          {tr.driverIds.map((id) => driverLabels[id] ?? id).join(" · ")}
        </p>
      ))}
      {riskIndicators.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {riskIndicators.map((r) => (
            <Badge
              key={r.id}
              variant={r.level === "elevated" ? "destructive" : "secondary"}
              className="text-[10px]"
            >
              {pressureLabels[r.labelKey] ?? r.labelKey}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
