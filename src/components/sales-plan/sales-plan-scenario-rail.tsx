"use client";

import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { ScenarioSummaryCard } from "@/components/planning/scenario-summary-card";
import { ScenarioAuthoringControls } from "@/components/sales-plan/scenario-authoring-controls";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { scenariosForCompany, useWorkspaceStore } from "@/stores/use-workspace-store";
import type { DemoScenario } from "@/types/domain";

type Props = {
  companyId: string;
  scenarios: DemoScenario[];
  activeScenarioId: string;
  onSelectScenario: (id: string) => void;
};

export function SalesPlanScenarioRail({
  companyId,
  scenarios,
  activeScenarioId,
  onSelectScenario,
}: Props) {
  const t = useTranslations("salesPlan.rail");
  const tg = useTranslations("planning.governance");
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const [showArchived, setShowArchived] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const filtered = useMemo(
    () =>
      scenarios.filter((sc) => {
        const status = scenarioBundles[sc.id]?.governance?.status;
        return showArchived || status !== "archived";
      }),
    [scenarios, scenarioBundles, showArchived]
  );

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{t("label")}</p>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-3.5 rounded border-input"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
            />
            {tg("showArchived")}
          </label>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" size="sm" variant="outline" className="h-8 gap-1">
                <Plus className="h-3.5 w-3.5" />
                {t("newScenario")}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t("newScenarioTitle")}</DialogTitle>
              </DialogHeader>
              <ScenarioAuthoringControls
                companyId={companyId}
                scenarios={scenariosForCompany(companyId)}
                activeScenarioId={activeScenarioId}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {filtered.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{t("empty")}</p>
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
                compact
                onSelect={() => onSelectScenario(sc.id)}
              />
            );
          })
        )}
      </div>
    </div>
  );
}
