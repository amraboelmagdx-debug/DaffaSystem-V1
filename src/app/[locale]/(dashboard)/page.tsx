"use client";

import { useTranslations } from "next-intl";
import { ExecutiveDashboardContent } from "@/components/dashboard/executive-dashboard-content";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { usePlanningEvaluation } from "@/hooks/use-planning-evaluation";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

export default function ExecutiveDashboardPage() {
  const t = useTranslations("dashboard");
  const { linkedUnits, selectedUnit, setCompany, isReady } = useOperationalWorkspace();
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const tierLineOverrides = useWorkspaceStore((s) => s.tierLineOverrides);

  const company = selectedUnit;
  const scenarios = company ? scenariosForCompany(company.id) : [];
  const streams = company ? streamsForCompany(company.id) : [];

  const evaluation = usePlanningEvaluation({
    company,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
  });

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

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
      <OperationalWorkspaceGate>
        <div className="mx-auto max-w-2xl space-y-4">
          <SampleDataPanel moduleId="workspace" />
          <p className="text-center text-sm text-muted-foreground">{message}</p>
          <p className="text-center text-xs text-muted-foreground">{hint}</p>
        </div>
      </OperationalWorkspaceGate>
    );
  }

  if (!company) {
    return null;
  }

  return (
    <OperationalWorkspaceGate>
      <SampleDataPanel moduleId="workspace" />
      <ExecutiveDashboardContent
        company={company}
        activeScenario={evaluation.activeScenario}
        scenarios={scenarios}
        linkedUnits={linkedUnits}
        opportunities={opportunities}
        measures={evaluation.measures}
        onSelectCompany={setCompany}
        onSelectScenario={setScenario}
      />
    </OperationalWorkspaceGate>
  );
}
