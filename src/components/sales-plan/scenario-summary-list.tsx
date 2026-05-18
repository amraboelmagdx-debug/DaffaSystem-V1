"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ScenarioMetadataPanel } from "@/components/planning/scenario-metadata-panel";
import { ScenarioSummaryCard } from "@/components/planning/scenario-summary-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { DemoScenario } from "@/types/domain";

type Props = {
  scenarios: DemoScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
};

export function ScenarioSummaryList({
  scenarios,
  activeScenarioId,
  onSelectScenario,
}: Props) {
  const t = useTranslations("salesPlan.session");
  const tg = useTranslations("planning.governance");
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(
    () =>
      scenarios.filter((sc) => {
        const status = scenarioBundles[sc.id]?.governance?.status;
        return showArchived || status !== "archived";
      }),
    [scenarios, scenarioBundles, showArchived]
  );

  const activeBundle = activeScenarioId ? scenarioBundles[activeScenarioId] : null;

  return (
    <div className="space-y-4">
      <Card className="border-border/60 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t("summaryTitle")}</CardTitle>
          <p className="text-xs text-muted-foreground">{t("summaryHint")}</p>
          <div className="flex items-center gap-2 pt-2">
            <input
              id="show-archived"
              type="checkbox"
              className="size-4 rounded border-input"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            <Label htmlFor="show-archived" className="text-xs font-normal">
              {tg("showArchived")}
            </Label>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("noScenarios")}</p>
          ) : (
            filtered.map((sc) => {
              const bundle = scenarioBundles[sc.id];
              if (!bundle) return null;
              return (
                <ScenarioSummaryCard
                  key={sc.id}
                  bundle={bundle}
                  bundlesById={scenarioBundles}
                  active={sc.id === activeScenarioId}
                  onSelect={() => onSelectScenario(sc.id)}
                />
              );
            })
          )}
        </CardContent>
      </Card>

      {activeBundle ? <ScenarioMetadataPanel bundle={activeBundle} /> : null}
    </div>
  );
}
