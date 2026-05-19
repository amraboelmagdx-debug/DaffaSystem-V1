"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";

import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useNavigateUnitCompany } from "@/hooks/use-navigate-unit-company";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import { useEconomicsGraph } from "@/hooks/use-economics-graph";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";
import { buildSalesPlanModel } from "@/lib/sales-plan/build-model";
import { sumMonthlyFixedCosts, weightedBlendedCm } from "@/lib/sales-plan/engine";
import { evaluateIncentiveRun } from "@/lib/incentives";
import {
  demoOpportunityToIncentiveDeal,
  incentiveDealFromValues,
} from "@/lib/incentives/opportunity-bridge";
import { participantsFromPlan } from "@/lib/incentives/participants-from-plan";
import { scorecardAttainmentFromSalesPlan } from "@/lib/incentives/scorecard-bridge";
import { deriveEvaluateOptionsFromPlan } from "@/lib/incentives/plan-options";
import { evaluateOperationalWarnings } from "@/lib/incentives/operational-warnings";
import {
  dealsFromForwardForecast,
  scorecardAttainmentFromEconomicsMeasures,
} from "@/lib/incentives/forecast-bridge";
import { formatCurrency } from "@/lib/calculations/engine";
import type { IncentiveDealInput, IncentiveRunMode } from "@/types/incentives";
import { IncentiveDesignStudio } from "@/components/incentives/incentive-design-studio";
import { IncentiveSimulateWorkspace } from "@/components/incentives/incentive-simulate-workspace";
import { IncentiveTierExplainPanel } from "@/components/incentives/incentive-tier-explain-panel";
import { IncentiveExplainPanel } from "@/components/incentives/incentive-explain-panel";
import { IncentivePayoutTimingPreview } from "@/components/incentives/incentive-payout-timing-preview";
import { IncentiveWarningsPanel } from "@/components/incentives/incentive-warnings-panel";
import { IncentiveScorecardExplain } from "@/components/incentives/incentive-scorecard-explain";
import { IncentiveParticipantDrilldown } from "@/components/incentives/incentive-participant-drilldown";
import { IncentiveRunCompare } from "@/components/incentives/incentive-run-compare";
import { IncentiveForecastPanel } from "@/components/incentives/incentive-forecast-panel";
import { IncentiveRunHistory } from "@/components/incentives/incentive-run-history";
import { IncentivePlannedVsActual } from "@/components/incentives/incentive-planned-vs-actual";
import { IncentivePayoutLifecycleSummary } from "@/components/incentives/incentive-payout-lifecycle-summary";
import { IncentiveManagementSummary } from "@/components/incentives/incentive-management-summary";
import { IncentiveAuditPanel } from "@/components/incentives/incentive-audit-panel";
import { useNumericReconciliation } from "@/hooks/use-numeric-reconciliation";
import { isPersistenceBannerEnabled } from "@/lib/persistence/persistence-status";
import { IncentivePayoutStory } from "@/components/incentives/incentive-payout-story";
import {
  IncentivesWorkspaceLayout,
  type IncentivesNavSection,
} from "@/components/incentives/incentives-workspace-layout";
export function SalesIncentivesWorkspace() {
  const t = useTranslations("incentives");
  const { selectedUnit: company, linkedUnits } = useOperationalWorkspace();
  const navigateUnitCompany = useNavigateUnitCompany();
  const roles = useHrWorkforceStore((s) => s.roles);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const scenarios = company ? scenariosForCompany(company.id) : [];

  const ensureDefaultPlan = useIncentivePlanStore((s) => s.ensureDefaultPlan);
  const loadPlans = useIncentivePlanStore((s) => s.loadPlans);
  const getActivePlan = useIncentivePlanStore((s) => s.getActivePlan);
  const persistRun = useIncentivePlanStore((s) => s.persistRun);
  const loadRuns = useIncentivePlanStore((s) => s.loadRuns);
  const loadFreezes = useIncentivePlanStore((s) => s.loadFreezes);
  const loadPresets = useIncentivePlanStore((s) => s.loadPresets);
  const approvePlan = useIncentivePlanStore((s) => s.approvePlan);
  const archivePlan = useIncentivePlanStore((s) => s.archivePlan);
  const visibleRuns = useIncentivePlanStore((s) => s.visibleRuns);
  const freezes = useIncentivePlanStore((s) => s.freezes);
  const plansLoaded = useIncentivePlanStore((s) => s.plansLoaded);
  const loading = useIncentivePlanStore((s) => s.loading);
  const storeError = useIncentivePlanStore((s) => s.error);
  const lastPersistError = useIncentivePlanStore((s) => s.lastPersistError);
  const persistenceMeta = useIncentivePlanStore((s) => s.persistenceMeta);
  const showSupersededRuns = useIncentivePlanStore((s) => s.showSupersededRuns);
  const setShowSupersededRuns = useIncentivePlanStore((s) => s.setShowSupersededRuns);
  const reloadForBu = useIncentivePlanStore((s) => s.reloadForBu);
  const planStorePlans = useIncentivePlanStore((s) => s.plans);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);

  const wizardProducts = useSalesPlanWizardStore((s) => s.products);
  const wizardShares = useSalesPlanWizardStore((s) => s.serviceRevenueShare);
  const wizardTierMix = useSalesPlanWizardStore((s) => s.tierMixByService);
  const wizardCells = useSalesPlanWizardStore((s) => s.contributionCells);
  const wizardFixedLines = useSalesPlanWizardStore((s) => s.fixedCostLines);
  const wizardBlendedOverride = useSalesPlanWizardStore((s) => s.blendedCmOverride);
  const wizardRates = useSalesPlanWizardStore((s) => s.conversionRates);
  const wizardQuarters = useSalesPlanWizardStore((s) => s.quarterlyWeights);
  const wizardSegments = useSalesPlanWizardStore((s) => s.marketSegments);
  const wizardNp = useSalesPlanWizardStore((s) => s.npTargetPct);
  const serviceTemplates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const updateCompany = useWorkspaceStore((s) => s.updateCompany);

  const [runMode, setRunMode] = useState<IncentiveRunMode>("simulation");
  const [periodYear, setPeriodYear] = useState(() => new Date().getFullYear());
  const [mixDeals, setMixDeals] = useState<IncentiveDealInput[]>([]);
  const [compareRunA, setCompareRunA] = useState<string | null>(null);
  const [compareRunB, setCompareRunB] = useState<string | null>(null);
  const [explainLayerId, setExplainLayerId] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<IncentivesNavSection>("try");
  const lastPersistedHash = useRef<string | null>(null);
  const [simDeal, setSimDeal] = useState<IncentiveDealInput>({
    id: "sim-1",
    label: "What-if deal",
    tierKey: "standard",
    dealValueSar: 1_500_000,
    marginSar: 525_000,
    referral: false,
    clientType: "new_client",
    complexity: "normal",
    accrualMonth: new Date().toISOString().slice(0, 7),
  });

  const hrBuId = company?.hrBusinessUnitId ?? linkedUnits[0]?.hrBusinessUnitId ?? "";

  const { company: planningCompany, tierLineOverrides } = useActivePlanningInputs(
    company?.id
  );
  const streams = company ? streamsForCompany(company.id) : [];
  const streamTemplateByProductId = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const s of streams) {
      m.set(s.id, s.serviceTemplateId ?? null);
    }
    return m;
  }, [streams]);
  const economicsGraph = useEconomicsGraph({
    company: planningCompany ?? company ?? undefined,
    streams,
    opportunities,
    scenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  });

  useEffect(() => {
    if (!company || !hrBuId) return;
    void reloadForBu(hrBuId).then(async () => {
      await ensureDefaultPlan({
        organizationId: company.organizationId,
        hrBusinessUnitId: hrBuId,
        companyId: company.id,
      });
      const p = useIncentivePlanStore.getState().getActivePlan();
      if (p) {
        await loadRuns({ planId: p.id, hrBusinessUnitId: hrBuId, periodYear });
      }
      await loadPresets(hrBuId);
    });
  }, [company?.id, hrBuId, reloadForBu, ensureDefaultPlan, loadRuns, loadPresets, periodYear]);

  const plan = useMemo(() => getActivePlan(), [getActivePlan, planStorePlans]);

  const participantNames = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of roles) {
      if (r.businessUnitId === hrBuId) map.set(r.id, r.name);
    }
    return map;
  }, [roles, hrBuId]);

  const salesPlanModel = useMemo(() => {
    if (!wizardProducts.length) return null;
    try {
      const fixedMonthly = sumMonthlyFixedCosts(wizardFixedLines);
      const serviceWeights = wizardProducts.map((p) => ({
        serviceId: p.id,
        weight: Math.max(0, wizardShares[p.id] ?? 0),
      }));
      const TIER_KEYS = ["tiny", "standard", "big", "mega"] as const;
      const engineCells: {
        serviceId: string;
        tierKey: (typeof TIER_KEYS)[number];
        exists: boolean;
        cm: number;
        mix: number;
        adv: number;
      }[] = [];
      for (const p of wizardProducts) {
        for (const tk of TIER_KEYS) {
          const cell = wizardCells[`${p.id}:${tk}`];
          const mix = wizardTierMix[p.id]?.[tk] ?? 0;
          if (!cell) continue;
          engineCells.push({
            serviceId: p.id,
            tierKey: tk,
            exists: cell.exists,
            cm: cell.contributionMarginPct,
            mix,
            adv: cell.avgDealValueSar,
          });
        }
      }
      const blendedCm =
        wizardBlendedOverride ??
        weightedBlendedCm({ serviceWeights, cells: engineCells });
      return buildSalesPlanModel({
        products: wizardProducts,
        serviceRevenueShare: wizardShares,
        tierMixByService: wizardTierMix,
        contributionCells: wizardCells,
        fixedMonthly,
        blendedCm,
        npTargetPct: wizardNp,
        conversionRates: wizardRates,
        quarterlyWeights: wizardQuarters,
        marketSegments: wizardSegments,
      });
    } catch {
      return null;
    }
  }, [
    wizardProducts,
    wizardShares,
    wizardTierMix,
    wizardCells,
    wizardFixedLines,
    wizardBlendedOverride,
    wizardNp,
    wizardRates,
    wizardQuarters,
    wizardSegments,
  ]);

  const forecastReady =
    economicsGraph.phase === "ready"
      ? (economicsGraph.forwardForecast ?? null)
      : null;
  const graphMeasures =
    economicsGraph.phase === "ready" ? economicsGraph.measures : null;

  const scorecardBridge = useMemo(() => {
    if (!plan) return { multiplier: 1, attainmentByComponent: {}, explainInputs: {} };
    if (forecastReady || graphMeasures) {
      return scorecardAttainmentFromEconomicsMeasures(
        plan.scorecard,
        graphMeasures,
        forecastReady
      );
    }
    return {
      ...scorecardAttainmentFromSalesPlan(
        plan.scorecard,
        salesPlanModel,
        opportunities.filter((o) => o.companyId === company?.id)
      ),
      explainInputs: {},
    };
  }, [plan, salesPlanModel, opportunities, company?.id, forecastReady, graphMeasures]);

  const forecastDeals = useMemo(() => {
    if (!forecastReady || !company) return [];
    return dealsFromForwardForecast(forecastReady, company);
  }, [forecastReady, company]);

  const pipelineDeals = useMemo(() => {
    if (!company) return [];
    return opportunities
      .filter((o) => o.companyId === company.id)
      .map((o) =>
        demoOpportunityToIncentiveDeal(o, company, undefined, plan?.tierProfiles)
      );
  }, [company, opportunities, plan?.tierProfiles]);

  const resolvedSimDeal = useMemo(() => {
    if (!company || !plan) return simDeal;
    return incentiveDealFromValues({
      id: simDeal.id,
      label: simDeal.label,
      dealValueSar: simDeal.dealValueSar,
      marginSar: simDeal.marginSar,
      referral: simDeal.referral,
      clientType: simDeal.clientType,
      complexity: simDeal.complexity,
      accrualMonth: simDeal.accrualMonth,
      company,
      profiles: plan.tierProfiles,
      revenueStreamId: simDeal.revenueStreamId,
      tierKey: simDeal.tierKey,
    });
  }, [simDeal, company, plan]);

  const activeDeals = useMemo(() => {
    const base = [...pipelineDeals, ...mixDeals, resolvedSimDeal];
    if (runMode === "shadow_actual" && forecastDeals.length) {
      return [...forecastDeals, ...mixDeals, simDeal];
    }
    return base;
  }, [pipelineDeals, mixDeals, resolvedSimDeal, forecastDeals, runMode]);

  const runResult = useMemo(() => {
    if (!plan || !hrBuId) return null;
    const participants = participantsFromPlan(plan, roles, hrBuId);
    const finComponent = plan.scorecard.components.find((c) => c.componentKey === "financial");
    const teamAttainment = finComponent
      ? (scorecardBridge.attainmentByComponent[finComponent.id] ?? 1)
      : 1;
    return evaluateIncentiveRun({
      plan,
      deals: activeDeals,
      participants,
      periodYear,
      mode: runMode,
      scorecardMultiplier: scorecardBridge.multiplier,
      managerTeamAttainment: teamAttainment,
      options: deriveEvaluateOptionsFromPlan(plan),
      simulation: {
        planningScenarioId: selectedScenarioId,
        planningScenarioName:
          scenarios.find((s) => s.id === selectedScenarioId)?.name ?? null,
      },
    });
  }, [
    plan,
    hrBuId,
    activeDeals,
    roles,
    scorecardBridge.multiplier,
    selectedScenarioId,
    scenarios,
    runMode,
    periodYear,
  ]);

  const operationalWarnings = useMemo(() => {
    if (!plan || !runResult?.ok) return [];
    const managerLayer = plan.layers.find((l) => l.key === "sales_manager");
    const managerPayout = managerLayer
      ? runResult.snapshot.byLayer[managerLayer.id] ?? 0
      : 0;
    const finComponent = plan.scorecard.components.find((c) => c.componentKey === "financial");
    return evaluateOperationalWarnings(plan, runResult.snapshot, {
      deals: activeDeals,
      projectedRevenueSar: forecastReady?.targets.finalProjectedRevenue,
      npTargetPct: wizardNp,
      teamFinancialAttainment: finComponent
        ? scorecardBridge.attainmentByComponent[finComponent.id]
        : undefined,
      managerLayerPayoutSar: managerPayout,
    });
  }, [plan, runResult, activeDeals, forecastReady, wizardNp, scorecardBridge]);

  const periodFrozen = useMemo(
    () =>
      freezes.some(
        (f) => f.hrBusinessUnitId === hrBuId && f.periodKey === String(periodYear)
      ),
    [freezes, hrBuId, periodYear]
  );

  useEffect(() => {
    if (!runResult?.ok || !plan || !hrBuId) return;
    if (lastPersistedHash.current === runResult.inputHash) return;
    const policy =
      lastPersistedHash.current != null && lastPersistedHash.current !== runResult.inputHash
        ? ("supersede" as const)
        : undefined;
    void persistRun(
      {
        id: runResult.runId,
        planId: plan.id,
        planVersion: plan.version,
        mode: runMode,
        periodYear,
        inputHash: runResult.inputHash,
        runLifecycle: "draft_run",
        createdAt: new Date().toISOString(),
        snapshot: runResult.snapshot,
      },
      hrBuId,
      { periodKey: String(periodYear), rerunPolicy: policy }
    ).then((ok) => {
      if (ok) lastPersistedHash.current = runResult.inputHash;
    });
  }, [runResult, plan, hrBuId, runMode, persistRun, periodYear]);

  const displayRuns = visibleRuns();
  const simRun = displayRuns.find((r) => r.mode === "simulation");
  const shadowRun = displayRuns.find((r) => r.mode === "shadow_actual");
  const compareA = displayRuns.find((r) => r.id === compareRunA);
  const compareB = displayRuns.find((r) => r.id === compareRunB);

  const reconciliation = useNumericReconciliation({
    salesPlanModel,
    executiveMeasures: economicsGraph.phase === "ready" ? economicsGraph.measures : null,
    wizardNpTargetPct: wizardNp,
    wizardBlendedCm: wizardBlendedOverride,
    incentiveSnapshot: runResult?.ok ? runResult.snapshot : null,
    forecastProjectedPoolSar: runResult?.ok ? runResult.snapshot.companyTotalSar : null,
    forecastAttainmentPct:
      economicsGraph.phase === "ready"
        ? economicsGraph.forwardForecast?.targets.attainmentPct
        : null,
  });

  const fmt = (n: number) => formatCurrency(n, "SAR");

  if (!company) {
    return (
      <OperationalWorkspaceGate>
        <p className="text-center text-sm text-muted-foreground">{t("selectBu")}</p>
      </OperationalWorkspaceGate>
    );
  }

  if (!plansLoaded || loading) {
    return (
      <OperationalWorkspaceGate loadingLabel={t("loadingPlans")}>
        <p className="text-center text-sm text-muted-foreground">{t("loadingPlans")}</p>
      </OperationalWorkspaceGate>
    );
  }

  const showEmptyGuide = !runResult?.ok && scenarios.length > 0;

  return (
    <IncentivesWorkspaceLayout
      title={t("title")}
      company={company}
      linkedUnits={linkedUnits}
      scenarios={scenarios}
      selectedScenarioId={selectedScenarioId}
      runMode={runMode}
      periodYear={periodYear}
      activeSection={activeSection}
      onSectionChange={setActiveSection}
      onSelectCompany={navigateUnitCompany}
      onSelectScenario={(id) => useWorkspaceStore.getState().setScenario(id)}
      onRunModeChange={setRunMode}
      onPeriodYearChange={setPeriodYear}
      onRunSimulation={() => setActiveSection("try")}
      showEmptyGuide={showEmptyGuide}
    >
      {storeError ? <p className="text-sm text-destructive">{storeError}</p> : null}
        {lastPersistError ? (
          <p className="text-sm text-destructive">
            {t("persistError", { message: lastPersistError.message })}
          </p>
        ) : null}
        {isPersistenceBannerEnabled() && reconciliation.severity === "warning" ? (
          <p className="text-sm text-amber-600">{t("numericDriftWarning")}</p>
        ) : null}

      {periodFrozen ? (
        <p className="text-sm text-amber-600">{t("freezeActive")}</p>
      ) : null}

      {activeSection === "plan" ? (
          <div className="space-y-6">
            {runResult?.ok ? <IncentivePayoutStory snapshot={runResult.snapshot} /> : null}
            {runResult?.ok ? (
              <IncentiveManagementSummary
                companyTotalSar={runResult.snapshot.companyTotalSar}
                retainedSar={runResult.snapshot.companyRetainedSar}
                participantCount={Object.keys(runResult.snapshot.byParticipant).length}
                warningCount={runResult.snapshot.warnings.length}
                planVersion={plan?.version ?? 0}
                periodYear={periodYear}
              />
            ) : null}
            {plan ? (
              <IncentiveDesignStudio
                plan={plan}
                company={company}
                hrBuId={hrBuId}
                roles={roles}
                products={wizardProducts.map((p) => ({
                  id: p.id,
                  name: p.name,
                  serviceTemplateId: streamTemplateByProductId.get(p.id) ?? null,
                }))}
                wizardCells={wizardCells}
                serviceTemplates={serviceTemplates}
                periodFrozen={periodFrozen}
                onApprove={() => void approvePlan(plan.id)}
                onArchive={() => void archivePlan(plan.id)}
                onCompanyTiersChange={(tiers) => {
                  if (company) updateCompany(company.id, { opportunityTiers: tiers });
                }}
              />
            ) : null}
          </div>
      ) : null}

      {activeSection === "try" ? (
          <div className="mt-4">
            {plan ? (
              <IncentiveSimulateWorkspace
                plan={plan}
                company={company}
                hrBuId={hrBuId}
                roles={roles}
                periodYear={periodYear}
                npTargetPct={wizardNp}
                scorecardMultiplier={scorecardBridge.multiplier}
                managerTeamAttainment={
                  plan.scorecard.components.find((c) => c.componentKey === "financial")
                    ? (scorecardBridge.attainmentByComponent[
                        plan.scorecard.components.find((c) => c.componentKey === "financial")!
                          .id
                      ] ?? 1)
                    : 1
                }
                projectedRevenueSar={forecastReady?.targets.finalProjectedRevenue}
                simDeal={simDeal}
                onSimDealChange={setSimDeal}
                onApplyMix={setMixDeals}
                snapshot={runResult?.ok ? runResult.snapshot : null}
              />
            ) : null}
          </div>
      ) : null}

      {activeSection === "results" ? (
          <div className="mt-4 space-y-6">
            <IncentiveForecastPanel
              forecast={forecastReady}
              projectedPoolSar={
                runResult?.ok
                  ? runResult.snapshot.companyTotalSar /
                    Math.max(1, forecastDeals.length || 1)
                  : 0
              }
              projectedRetainedSar={runResult?.ok ? runResult.snapshot.companyRetainedSar : 0}
              blockedReason={
                economicsGraph.phase === "blocked" ? economicsGraph.reason : null
              }
            />
            <IncentiveTierExplainPanel deals={activeDeals} />
            {runResult?.ok ? (
              <>
                <IncentiveExplainPanel
                  snapshot={runResult.snapshot}
                  title={t("explainWaterfall")}
                  filterLayerId={explainLayerId}
                />
                {plan ? (
                  <IncentiveScorecardExplain
                    plan={plan}
                    attainmentByComponent={scorecardBridge.attainmentByComponent}
                    multiplier={scorecardBridge.multiplier}
                    explainInputs={scorecardBridge.explainInputs}
                  />
                ) : null}
                <IncentiveParticipantDrilldown
                  snapshot={runResult.snapshot}
                  participantNames={participantNames}
                  filterLayerId={explainLayerId}
                />
              </>
            ) : null}
          </div>
      ) : null}

      {activeSection === "govern" ? (
          <div className="mt-4 space-y-6">
            <IncentiveRunHistory
              runs={displayRuns}
              selectedRunId={compareRunA}
              showSuperseded={showSupersededRuns}
              onShowSupersededChange={setShowSupersededRuns}
              onSelectRun={(id) => {
                if (!compareRunA) setCompareRunA(id);
                else setCompareRunB(id);
              }}
            />
            {compareA && compareB ? (
              <IncentiveRunCompare
                runA={compareA}
                runB={compareB}
                labelA={compareA.mode}
                labelB={compareB.mode}
              />
            ) : null}
            <IncentivePlannedVsActual simulationRun={simRun ?? null} shadowRun={shadowRun ?? null} />
            {plan ? <IncentiveAuditPanel planId={plan.id} /> : null}
          </div>
      ) : null}
    </IncentivesWorkspaceLayout>
  );
}
