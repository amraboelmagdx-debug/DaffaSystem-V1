"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScenarioComparisonResult } from "@/types/scenario-comparison";

type Props = {
  comparison: ScenarioComparisonResult;
  suppressCapacityProxy?: boolean;
};

export function ScenarioComparisonNarrative({
  comparison,
  suppressCapacityProxy = false,
}: Props) {
  const t = useTranslations("planning.comparison");
  const { narrative, meta, capacityPressure } = comparison;

  const isCapacityProxyBullet = (b: string) =>
    b.toLowerCase().includes("capacity pressure") ||
    b.includes("ضغط سعة") ||
    b.includes(`${capacityPressure.baseLabel} →`);

  const bullets = suppressCapacityProxy
    ? narrative.bullets.filter((b) => !isCapacityProxyBullet(b))
    : narrative.bullets;

  const headline =
    suppressCapacityProxy && isCapacityProxyBullet(narrative.headline) && bullets[0]
      ? bullets[0]
      : narrative.headline;
  const bodyBullets =
    suppressCapacityProxy && headline === bullets[0] ? bullets.slice(1) : bullets;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("narrativeTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">
          {meta.compareName} vs {meta.baseName}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm font-medium leading-relaxed">{headline}</p>
        {bodyBullets.length > 0 ? (
          <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
            {bodyBullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        ) : null}
        {narrative.riskFlags.length > 0 ? (
          <ul className="space-y-1 text-sm font-medium text-amber-800 dark:text-amber-400">
            {narrative.riskFlags.map((r, i) => (
              <li key={i}>⚠ {r}</li>
            ))}
          </ul>
        ) : null}
        {narrative.sharedStreamMixDisclaimer ? (
          <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
            {t("sharedStreamsDisclaimer")}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
