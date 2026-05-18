"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OperationalPlanningPageShell } from "@/components/platform-simplification/operational-planning-page-shell";
import { usePlanningEvaluation } from "@/hooks/use-planning-evaluation";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";
import { formatCurrency, formatPct } from "@/lib/calculations/engine";

export default function ScenariosPage() {
  const { companies, selectedCompanyId, opportunities, selectedScenarioId, tierLineOverrides } =
    useWorkspaceStore();
  const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
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

  const cards =
    evaluation.phase === "ready"
      ? scenarios.flatMap((sc) => {
          const out = evaluation.measures.scenarioById[sc.id];
          if (!out) return [];
          return [{ sc, out }];
        })
      : [];

  return (
    <OperationalPlanningPageShell routeContext="scenarios" bannerVariant="transitional">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Scenario lab</h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
            Unlimited strategic scenarios with instant propagation to ROI, NP, and
            sales coverage. Adjust levers in data seed or extend with Supabase-backed
            scenario records.
          </p>
        </div>
        {evaluation.phase === "blocked" ? (
          <p className="text-sm text-muted-foreground">
            {evaluation.reason === "no_scenarios"
              ? "No scenarios for this business unit. Sync or bootstrap the workspace to add a baseline scenario."
              : "Select a business unit to compare scenarios."}
          </p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {cards.map(({ sc, out }, i) => (
              <motion.div
                key={sc.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="h-full border-border/60 bg-card/60 backdrop-blur">
                  <CardHeader className="flex flex-row items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{sc.name}</CardTitle>
                      <p className="mt-1 text-xs text-muted-foreground">
                        NP target {formatPct(sc.npTargetPct)} · Growth adj{" "}
                        {formatPct(sc.growthAdj)} · Fixed cost adj {formatPct(sc.fixedCostAdj)}
                      </p>
                    </div>
                    {sc.baseline ? (
                      <Badge>Baseline</Badge>
                    ) : (
                      <Badge variant="secondary">Alt</Badge>
                    )}
                  </CardHeader>
                  <CardContent className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Revenue</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.revenue)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Net profit</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.netProfit)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">ROI</p>
                      <p className="text-lg font-semibold">{formatPct(out.roi)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Sales gap</p>
                      <p className="text-lg font-semibold">{formatCurrency(out.salesNeededGap)}</p>
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
