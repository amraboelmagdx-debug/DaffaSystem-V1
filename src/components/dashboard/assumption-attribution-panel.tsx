"use client";

import { useLocale, useTranslations } from "next-intl";
import { AssumptionDriverCard } from "@/components/dashboard/assumption-driver-card";
import { AssumptionImpactGraph } from "@/components/dashboard/assumption-impact-graph";
import { AssumptionTradeoffSummary } from "@/components/dashboard/assumption-tradeoff-summary";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyLocale } from "@/lib/calculations/engine";
import { useAttributionNarrativeLabels } from "@/lib/planning/scenario/use-attribution-narrative-labels";
import type { AssumptionAttributionResult } from "@/types/scenario-attribution";

type Props = {
  attribution: AssumptionAttributionResult;
};

export function AssumptionAttributionPanel({ attribution }: Props) {
  const t = useTranslations("planning.attribution");
  const labels = useAttributionNarrativeLabels();
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const { narrative, drivers, meta, residual } = attribution;
  const driverLabelMap = labels.driverLabel as Record<string, string>;
  const showResidual =
    Math.abs(residual.netProfit) > 1000 || Math.abs(residual.revenue) > 1000;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("panelTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {meta.compareName} vs {meta.baseName} — {t("panelHint")}
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{t("whyChanged")}</p>
          <p className="text-sm font-medium leading-relaxed">{narrative.headline}</p>
          {narrative.bullets.length > 0 ? (
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {narrative.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("whatChanged")}
          </p>
          <p className="text-sm text-muted-foreground">{narrative.whatChanged}</p>
        </section>

        <section className="space-y-3">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("keyDrivers")}
          </p>
          <div className="grid gap-3 md:grid-cols-2">
            {drivers.map((d) => (
              <AssumptionDriverCard
                key={d.id}
                driver={d}
                driverLabel={labels.driverLabel[d.id]}
                categoryLabel={labels.categoryLabel[d.category]}
              />
            ))}
          </div>
        </section>

        <AssumptionTradeoffSummary attribution={attribution} driverLabels={driverLabelMap} />
        <AssumptionImpactGraph attribution={attribution} driverLabels={driverLabelMap} />

        {showResidual ? (
          <section className="rounded-md border border-dashed border-border/60 bg-muted/10 p-3 text-sm">
            <p className="font-medium">{t("residualTitle")}</p>
            <p className="mt-1 text-muted-foreground">
              {t("residualBody", {
                revenue: fmt(residual.revenue),
                np: fmt(residual.netProfit),
              })}
            </p>
          </section>
        ) : null}

        {attribution.serviceMixDisclaimer ? (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {t("serviceMixDisclaimer")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
