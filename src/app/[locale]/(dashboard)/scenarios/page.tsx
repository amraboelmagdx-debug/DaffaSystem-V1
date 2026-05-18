"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ScenarioSummaryCard } from "@/components/planning/scenario-summary-card";
import { OperationalPlanningPageShell } from "@/components/platform-simplification/operational-planning-page-shell";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import { usePlanningEvaluation } from "@/hooks/use-planning-evaluation";
import { formatCurrency, formatPct } from "@/lib/calculations/engine";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

export default function ScenariosPage() {
  const tg = useTranslations("planning.governance");
  const ta = useTranslations("architectureCleanup");
  const { companies, selectedCompanyId, opportunities, selectedScenarioId, scenarioBundles } =
    useWorkspaceStore();
  const anchor = companies.find((c) => c.id === selectedCompanyId);
  const { company, tierLineOverrides } = useActivePlanningInputs(anchor?.id);
  const scenarios = anchor ? scenariosForCompany(anchor.id) : [];
  const streams = anchor ? streamsForCompany(anchor.id) : [];
  const [hideArchived, setHideArchived] = useState(true);

  const visibleScenarios = useMemo(
    () =>
      scenarios.filter((sc) => {
        const status = scenarioBundles[sc.id]?.governance?.status;
        return !hideArchived || status !== "archived";
      }),
    [scenarios, scenarioBundles, hideArchived]
  );

  const evaluation = usePlanningEvaluation({
    company,
    streams,
    opportunities,
    scenarios: visibleScenarios,
    selectedScenarioId,
    tierLineOverrides,
    scenarioBundles,
  });

  const cards =
    evaluation.phase === "ready"
      ? visibleScenarios.flatMap((sc) => {
          const out = evaluation.measures.scenarioById[sc.id];
          const bundle = scenarioBundles[sc.id];
          if (!out || !bundle) return [];
          return [{ sc, out, bundle }];
        })
      : [];

  return (
    <OperationalPlanningPageShell routeContext="scenarios" bannerVariant="transitional">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{tg("compareTitle")}</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{tg("compareSubtitle")}</p>
          <p className="mt-2 max-w-3xl text-xs text-muted-foreground">
            {ta("scenarioLibraryHint")}
          </p>
          <div className="mt-3 flex items-center gap-2">
            <input
              id="hide-archived"
              type="checkbox"
              className="size-4 rounded border-input"
              checked={hideArchived}
              onChange={(e) => setHideArchived(e.target.checked)}
            />
            <Label htmlFor="hide-archived" className="text-sm font-normal">
              {tg("hideArchived")}
            </Label>
          </div>
        </div>
        {evaluation.phase === "blocked" ? (
          <p className="text-sm text-muted-foreground">
            {evaluation.reason === "no_scenarios"
              ? tg("noScenarios")
              : tg("selectBu")}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(({ sc, out, bundle }, i) => (
              <motion.div
                key={sc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full border-border/60 bg-card/60 backdrop-blur">
                  <CardHeader className="space-y-3">
                    <ScenarioSummaryCard
                      bundle={bundle}
                      bundlesById={scenarioBundles}
                      active={sc.id === selectedScenarioId}
                    />
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 border-t border-border/50 pt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">{tg("kpiRevenue")}</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{tg("kpiNetProfit")}</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.netProfit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{tg("kpiRoi")}</p>
                      <p className="text-lg font-semibold">{formatPct(out.roi)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">{tg("kpiSalesGap")}</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.salesNeededGap)}</p>
                    </div>
                    <div className="col-span-2 text-xs text-muted-foreground">
                      {tg("leverSummary", {
                        np: formatPct(sc.npTargetPct),
                        growth: formatPct(sc.growthAdj),
                        fixed: formatPct(sc.fixedCostAdj),
                      })}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </OperationalPlanningPageShell>
  );
}
