"use client";

import { useTranslations } from "next-intl";
import { ForwardForecastSection } from "@/components/dashboard/forward-forecast-section";
import { ExecutiveRollingForecastSection } from "@/components/dashboard/executive-rolling-forecast-section";
import { OperationalPlanningPageShell } from "@/components/platform-simplification/operational-planning-page-shell";
import { useForwardForecast } from "@/hooks/use-forward-forecast";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

export default function ForecastsPage() {
  const t = useTranslations("dashboard.rollingForecast");
  const { selectedUnit: company } = useOperationalWorkspace();
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const { tierLineOverrides } = useActivePlanningInputs(company?.id);
  const streams = company ? streamsForCompany(company.id) : [];
  const scenarios = company ? scenariosForCompany(company.id) : [];

  const forwardForecastPhase = useForwardForecast({
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  });

  return (
    <OperationalPlanningPageShell
      routeContext="forecasts"
      bannerVariant="transitional"
      readOnly
      usesDemoData
    >
      {!company ? (
        <div className="mx-auto max-w-6xl p-8 text-center text-sm text-muted-foreground">
          {t("emptyState")}
        </div>
      ) : (
        <div className="mx-auto max-w-6xl">
          {forwardForecastPhase.phase === "ready" ? (
            <ForwardForecastSection
              company={company}
              forwardForecast={forwardForecastPhase.forwardForecast}
              showPageHeading
            />
          ) : (
            <ExecutiveRollingForecastSection
              company={company}
              activeScenarioId={selectedScenarioId}
              showPageHeading
            />
          )}
        </div>
      )}
    </OperationalPlanningPageShell>
  );
}
