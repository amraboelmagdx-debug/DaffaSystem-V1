"use client";

import { useTranslations } from "next-intl";
import { DeliveryFeasibilityStatus } from "@/components/dashboard/delivery-feasibility-status";
import { OperationalSaturationSummary } from "@/components/dashboard/operational-saturation-summary";
import { RoleBottleneckList } from "@/components/dashboard/role-bottleneck-list";
import { StaffingPressureCard } from "@/components/dashboard/staffing-pressure-card";
import { UtilizationPressureStrip } from "@/components/dashboard/utilization-pressure-strip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type {
  OperationalFeasibilityComparison,
  OperationalFeasibilityResult,
} from "@/types/operational-feasibility";

type Props = {
  monitor?: OperationalFeasibilityResult;
  comparison?: OperationalFeasibilityComparison;
};

export function OperationalFeasibilityPanel({ monitor, comparison }: Props) {
  const t = useTranslations("planning.feasibility");

  const result = comparison?.compare ?? monitor;
  if (!result) return null;

  const baseStatus = comparison?.base.status;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("panelTitle")}</CardTitle>
        <p className="text-xs text-muted-foreground">{t("panelHint")}</p>
      </CardHeader>
      <CardContent className="space-y-5">
        <section className="space-y-2">
          <p className="text-xs font-semibold uppercase text-muted-foreground">
            {t("deliveryFeasibility")}
          </p>
          <DeliveryFeasibilityStatus result={result} compareStatus={baseStatus} />
          <p className="text-sm font-medium leading-relaxed">{result.narrative.headline}</p>
          {result.narrative.bullets.length > 0 ? (
            <ul className="list-disc space-y-1 ps-5 text-sm text-muted-foreground">
              {result.narrative.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>

        {result.feasibilityMode === "hr_backed" ? (
          <>
            <UtilizationPressureStrip result={result} />
            <RoleBottleneckList roles={result.roleRows} />
            <div className="grid gap-4 md:grid-cols-2">
              <StaffingPressureCard staffing={result.staffing} />
              <OperationalSaturationSummary
                saturation={result.saturation}
                servicePressures={result.servicePressures}
              />
            </div>
          </>
        ) : null}

        {result.narrative.riskBullets.length > 0 ? (
          <ul className="space-y-1 text-sm font-medium text-amber-800 dark:text-amber-400">
            {result.narrative.riskBullets.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : null}

        <p className="text-xs text-muted-foreground border-t border-border/50 pt-2">
          {t("residualDisclaimer")}
        </p>
      </CardContent>
    </Card>
  );
}
