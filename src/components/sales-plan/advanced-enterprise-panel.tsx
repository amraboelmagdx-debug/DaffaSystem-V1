"use client";

import { useTranslations } from "next-intl";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BlockKey = "dimensionsMeasures" | "driversAssumptions" | "actualsGoalsConstraints" | "confidenceSeasonality" | "collaborationInsights";

const BLOCKS: BlockKey[] = [
  "dimensionsMeasures",
  "driversAssumptions",
  "actualsGoalsConstraints",
  "confidenceSeasonality",
  "collaborationInsights",
];

export function AdvancedEnterprisePanel() {
  const t = useTranslations("salesPlan.advanced");
  const tm = useTranslations("measures");

  return (
    <Card className="border-violet-500/25 bg-gradient-to-br from-violet-500/5 via-card to-fuchsia-500/5">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-lg">{t("panelTitle")}</CardTitle>
            <p className="mt-1 max-w-3xl text-xs text-muted-foreground">{t("panelIntro")}</p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <InsightBulb label={t("panelBulbTitle")} description={t("panelBulbBody")} />
            <InsightBulb label={tm("bulbUnifiedTitle")} description={tm("bulbSalesPlanBody")} />
          </div>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3 md:grid-cols-2">
        {BLOCKS.map((key) => (
          <div
            key={key}
            className="rounded-lg border border-border/70 bg-card/60 p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-2">
              <h3 className="text-sm font-semibold leading-snug">{t(`blocks.${key}.title`)}</h3>
              <InsightBulb
                label={t(`blocks.${key}.bulbTitle`)}
                description={t(`blocks.${key}.bulbBody`)}
              />
            </div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              {t(`blocks.${key}.summary`)}
            </p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
