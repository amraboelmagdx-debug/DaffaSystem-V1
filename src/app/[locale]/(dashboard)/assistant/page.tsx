"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { weightedRevenue } from "@/lib/calculations/pipeline";
import {
  evaluatePlanningMeasures,
  resolvePlanningEvaluation,
} from "@/lib/planning/measures";
import { resolveBusinessUnitIdForCompany } from "@/lib/platform-economics/operational-unit";
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

  const {
    companies,
    selectedCompanyId,
    opportunities,
    selectedScenarioId,
    streams,
    scenarios,
    scenarioBundles,
  } = useWorkspaceStore();
  const company = companies.find((c) => c.id === selectedCompanyId);

  const evaluation = useMemo(() => {
    if (!company) return null;
    const companyStreams = streamsForCompany(company.id);
    const companyScenarios = scenariosForCompany(company.id);
    const resolution = resolvePlanningEvaluation({
      company,
      streams: companyStreams,
      opportunities,
      scenarios: companyScenarios,
      activeScenarioId: selectedScenarioId,
      tierLineOverrides: scenarioBundles[selectedScenarioId]?.tierLineOverrides ?? {},
      scenarioBundles,
    });
    if (resolution.status === "blocked") return null;
    const measures = evaluatePlanningMeasures(resolution.context);
    return { measures, activeScenario: resolution.activeScenario };
  }, [
    company,
    opportunities,
    selectedScenarioId,
    streams,
    scenarios,
    scenarioBundles,
  ]);

  if (!company) {
    return (
      <div className="mx-auto max-w-2xl p-8 text-center text-sm text-muted-foreground">
        Select or sync a business unit to use the planning assistant.
      </div>
    );
  }

  const hrBusinessUnitId =
    company.hrBusinessUnitId ?? resolveBusinessUnitIdForCompany(company.id, companies);
  const weightedPipeline = opportunities
    .filter((o) => o.companyId === company.id)
    .reduce((s, o) => s + weightedRevenue(o), 0);

  const base = evaluation?.measures.baseEngine;
  const engine = evaluation?.measures.activeEngine;

  const ask = async () => {
    if (!engine) return;
    setLoading(true);
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: q,
          context: {
            hrBusinessUnitId: hrBusinessUnitId ?? null,
            companyId: company.id,
            economicsGraphRoot: "ServiceEconomicsGraphContext",
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
          {base && engine && (
            <>
              <Badge variant="secondary">ROI {base.roi.toFixed(2)}</Badge>
              <Badge variant="outline">
                Scenario Δ NP {(engine.npPct - base.npPct).toFixed(3)}
              </Badge>
            </>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          <Input value={q} onChange={(e) => setQ(e.target.value)} />
          <Button onClick={ask} disabled={loading || !engine}>
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
