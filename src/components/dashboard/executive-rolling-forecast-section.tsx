"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { RollingForecastTable } from "@/components/dashboard/rolling-forecast-table";
import { useRollingForecastSeries } from "@/hooks/use-rolling-forecast-series";
import { buildBuForecastContext } from "@/lib/planning/measures/bu-forecast-context";
import type { DemoCompany } from "@/types/domain";

type Props = {
  company: DemoCompany;
  activeScenarioId: string;
  /** Anchor for deep links from transitional /forecasts route (Wave 4a). */
  id?: string;
  showPageHeading?: boolean;
};

export function ExecutiveRollingForecastSection({
  company,
  activeScenarioId,
  id = "rolling-forecast",
  showPageHeading = false,
}: Props) {
  const t = useTranslations("dashboard.rollingForecast");
  const series = useRollingForecastSeries(company);
  const buContext = useMemo(
    () => buildBuForecastContext(company, activeScenarioId || null),
    [company, activeScenarioId]
  );

  return (
    <section id={id} className="scroll-mt-24 space-y-4">
      {showPageHeading ? (
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("pageTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t("description")}
            {buContext ? ` (${buContext.companyName})` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("pathANote")}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("sectionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("description")}
            {buContext ? ` (${buContext.companyName})` : ""}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{t("pathANote")}</p>
        </div>
      )}
      <RollingForecastTable rows={series} companyName={company.name} />
    </section>
  );
}
