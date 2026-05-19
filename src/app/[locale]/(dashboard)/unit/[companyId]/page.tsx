"use client";

import { useEffect, useMemo, useState, use } from "react";
import { useTranslations } from "next-intl";
import { ExecutiveDashboardContent } from "@/components/dashboard/executive-dashboard-content";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import { OperatorPageShell } from "@/components/ox/operator-page-shell";
import { NextRecommendedAction } from "@/components/ox/next-recommended-action";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useNavigateUnitCompany } from "@/hooks/use-navigate-unit-company";
import { useEconomicsGraph } from "@/hooks/use-economics-graph";
import { useAssumptionAttribution } from "@/hooks/use-assumption-attribution";
import { useOperationalFeasibility } from "@/hooks/use-operational-feasibility";
import { useScenarioComparison } from "@/hooks/use-scenario-comparison";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

type Props = {
  params: Promise<{ companyId: string }>;
};

export default function UnitExecutiveDashboardPage({ params }: Props) {
  const { companyId } = use(params);
  const t = useTranslations("dashboard");
  const tOx = useTranslations("ox");
  const { linkedUnits } = useOperationalWorkspace();
  const navigateUnitCompany = useNavigateUnitCompany();
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const companies = useWorkspaceStore((s) => s.companies);

  const anchorCompany = useMemo(
    () => linkedUnits.find((u) => u.id === companyId) ?? null,
    [linkedUnits, companyId]
  );
  const { company, tierLineOverrides } = useActivePlanningInputs(
    anchorCompany?.id
  );
  const scenarios = anchorCompany ? scenariosForCompany(anchorCompany.id) : [];
  const streams = anchorCompany ? streamsForCompany(anchorCompany.id) : [];

  const baselineId = useMemo(
    () => scenarios.find((s) => s.baseline)?.id ?? scenarios[0]?.id ?? "",
    [scenarios]
  );

  const [compareMode, setCompareMode] = useState(false);
  const [baseScenarioId, setBaseScenarioId] = useState(baselineId);
  const [compareScenarioId, setCompareScenarioId] = useState(selectedScenarioId);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const baseParam = params.get("base");
    const compareParam = params.get("compare");
    if (baseParam && compareParam && scenarios.some((s) => s.id === baseParam)) {
      setCompareMode(true);
      setBaseScenarioId(baseParam);
      setCompareScenarioId(compareParam);
    }
  }, [scenarios]);

  useEffect(() => {
    if (!compareMode) return;
    if (!baseScenarioId && baselineId) setBaseScenarioId(baselineId);
    if (!compareScenarioId && selectedScenarioId)
      setCompareScenarioId(selectedScenarioId);
  }, [
    compareMode,
    baselineId,
    selectedScenarioId,
    baseScenarioId,
    compareScenarioId,
  ]);

  const evaluation = useEconomicsGraph({
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  });

  useEffect(() => {
    if (evaluation.phase !== "ready" || typeof window === "undefined") return;
    if (window.location.hash !== "#rolling-forecast") return;
    const el = document.getElementById("rolling-forecast");
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [evaluation.phase]);

  const comparison = useScenarioComparison({
    anchorCompany:
      company ?? companies.find((c) => c.id === anchorCompany?.id),
    streams,
    opportunities,
    scenarioBundles,
    baseScenarioId: baseScenarioId || baselineId,
    compareScenarioId: compareScenarioId || selectedScenarioId,
    enabled: compareMode,
  });

  const attribution = useAssumptionAttribution({
    comparison: comparison.phase === "ready" ? comparison.result : undefined,
    anchorCompany:
      company ?? companies.find((c) => c.id === anchorCompany?.id),
    streams,
    opportunities,
    scenarioBundles,
    baseScenarioId: baseScenarioId || baselineId,
    compareScenarioId: compareScenarioId || selectedScenarioId,
    enabled: compareMode,
  });

  const operationalFeasibility = useOperationalFeasibility({
    anchorCompany:
      company ?? companies.find((c) => c.id === anchorCompany?.id),
    streams,
    opportunities,
    scenarioBundles,
    activeScenarioId: selectedScenarioId,
    baseScenarioId: baseScenarioId || baselineId,
    compareScenarioId: compareScenarioId || selectedScenarioId,
    comparison: comparison.phase === "ready" ? comparison.result : undefined,
    compareMode,
    enabled: true,
  });

  if (evaluation.phase === "blocked") {
    const message =
      evaluation.reason === "no_scenarios"
        ? t("emptyScenarios")
        : t("emptyLinkedUnits");
    const hint =
      evaluation.reason === "no_scenarios"
        ? t("emptyScenariosHint")
        : t("emptyLinkedUnitsHint");

    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SampleDataPanel moduleId="workspace" />
        <p className="text-center text-sm text-muted-foreground">{message}</p>
        <p className="text-center text-xs text-muted-foreground">{hint}</p>
        <div className="flex justify-center">
          <Button asChild size="sm">
            <Link href={`/unit/${companyId}/sales-plan`}>
              {tOx("executive.editPlanCta")}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <OperatorPageShell
      routeContext="executive"
      title={t("title")}
      purpose={tOx("executive.purpose")}
      mode="monitor"
      readOnly
      showNextAction={linkedUnits.length === 0}
      headerActions={
        <Button asChild size="sm">
          <Link href={`/unit/${companyId}/sales-plan`}>
            {tOx("executive.editPlanCta")}
          </Link>
        </Button>
      }
    >
      <SampleDataPanel moduleId="workspace" />
      {linkedUnits.length === 0 ? <NextRecommendedAction /> : null}
      <ExecutiveDashboardContent
        company={company}
        activeScenario={evaluation.activeScenario}
        scenarios={scenarios}
        linkedUnits={linkedUnits}
        opportunities={opportunities}
        measures={evaluation.measures}
        onSelectCompany={navigateUnitCompany}
        onSelectScenario={setScenario}
        compareMode={compareMode}
        onCompareModeChange={setCompareMode}
        baseScenarioId={baseScenarioId || baselineId}
        compareScenarioId={compareScenarioId || selectedScenarioId}
        onBaseScenarioChange={setBaseScenarioId}
        onCompareScenarioChange={setCompareScenarioId}
        comparison={comparison}
        attribution={attribution}
        operationalFeasibility={operationalFeasibility}
        forwardForecast={evaluation.forwardForecast ?? null}
      />
    </OperatorPageShell>
  );
}
