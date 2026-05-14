"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { applyScenario, runForecastEngine } from "@/lib/calculations/engine";
import { weightedRevenue } from "@/lib/calculations/pipeline";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

export default function AssistantPage() {
  const [q, setQ] = useState("Why is ROI decreasing?");
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<{
    summary: string;
    bullets: string[];
    actions: string[];
  } | null>(null);

  const { companies, selectedCompanyId, opportunities, selectedScenarioId } =
    useWorkspaceStore();
  const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
  const streams = streamsForCompany(company.id);
  const scenario =
    scenariosForCompany(company.id).find((s) => s.id === selectedScenarioId) ??
    scenariosForCompany(company.id)[0];
  const weightedPipeline = opportunities
    .filter((o) => o.companyId === company.id)
    .reduce((s, o) => s + weightedRevenue(o), 0);
  const cm =
    streams.length > 0
      ? streams.reduce((a, s) => a + s.revenueWeight * s.contributionMarginPct, 0) /
        streams.reduce((a, s) => a + s.revenueWeight, 0)
      : company.contributionMarginPct;
  const engine = applyScenario(
    {
      fixedCostsMonthly: company.fixedCostsMonthly,
      contributionMarginPct: cm,
      targetNpPct: company.npTargetPct,
      revenueMonthly: company.revenueMonthly,
    },
    {
      npTargetPct: scenario.npTargetPct,
      revenueMixAdj: scenario.revenueMixAdj,
      conversionRateAdj: scenario.conversionRateAdj,
      fixedCostAdj: scenario.fixedCostAdj,
      growthAdj: scenario.growthAdj,
      pipelineWeightAdj: scenario.pipelineWeightAdj,
    },
    weightedPipeline
  );
  const base = runForecastEngine(
    {
      fixedCostsMonthly: company.fixedCostsMonthly,
      contributionMarginPct: cm,
      targetNpPct: company.npTargetPct,
      revenueMonthly: company.revenueMonthly,
    },
    { weightedPipeline }
  );

  const ask = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: {
            revenue: engine.revenue,
            netProfit: engine.netProfit,
            roi: engine.roi,
            npPct: engine.npPct,
            pipelineWeighted: weightedPipeline,
          },
        }),
      });
      const data = await res.json();
      setAnswer(data);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">AI business assistant</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Rule-based insights today — wire your model provider behind the same API
          contract for natural language + tool use.
        </p>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row flex-wrap items-center gap-2">
          <CardTitle className="text-base">Live context</CardTitle>
          <Badge variant="secondary">ROI {base.roi.toFixed(2)}</Badge>
          <Badge variant="outline">Scenario Δ NP {(engine.npPct - base.npPct).toFixed(3)}</Badge>
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={ask} disabled={loading}>
            {loading ? "Analyzing…" : "Ask"}
          </Button>
        </CardContent>
      </Card>

      {answer && (
        <Card className="border-border/60 bg-card/40 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">{answer.summary}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-relaxed">
            <ul className="list-disc space-y-2 pl-5">
              {answer.bullets.map((b, i) => (
                <li key={i}>{b}</li>
              ))}
            </ul>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                Suggested moves
              </p>
              <ul className="mt-2 list-decimal space-y-1 pl-5">
                {answer.actions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
