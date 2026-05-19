"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Link } from "@/i18n/navigation";
import { ScenarioGovernanceBadges } from "@/components/planning/scenario-governance-badges";
import { buildScenarioIntentLine } from "@/lib/planning/scenario";
import { useScenarioIntentLabels } from "@/lib/planning/scenario/use-scenario-intent-labels";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import {
  getActiveScenarioBundle,
  selectableScenariosForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

type Props = {
  companyId: string;
  canSave: boolean;
  onSave: () => void;
  onSaveAs: (name: string) => void;
  onApply: () => void;
  saveFeedback: { text: string; ok: boolean } | null;
};

export function SalesPlanCommandBar({
  companyId,
  canSave,
  onSave,
  onSaveAs,
  onApply,
  saveFeedback,
}: Props) {
  const t = useTranslations("salesPlan.commandBar");
  const ts = useTranslations("planning.scenarios");
  const { buildHref, companyId: routeCompanyId, isUnitScoped } = useUnitRouteContext();

  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const scenarios = selectableScenariosForCompany(companyId);
  const baselineId = scenarios.find((s) => s.baseline)?.id;
  const activeBundle = useWorkspaceStore((s) => getActiveScenarioBundle(s));
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const isEditable = useWorkspaceStore((s) =>
    selectedScenarioId ? s.isScenarioEditable(selectedScenarioId) : true
  );
  const intentLabels = useScenarioIntentLabels();

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  const executiveCompareHref =
    activeBundle && baselineId && selectedScenarioId
      ? isUnitScoped && routeCompanyId
        ? `/unit/${routeCompanyId}?base=${baselineId}&compare=${selectedScenarioId}`
        : `/?base=${baselineId}&compare=${selectedScenarioId}`
      : null;

  return (
    <div className="sticky top-14 z-20 -mx-1 space-y-3 rounded-lg border border-border/60 bg-card/90 p-3 backdrop-blur-md">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-xs text-muted-foreground">{t("scenario")}</Label>
          <Select
            value={selectedScenarioId || scenarios[0]?.id || ""}
            onValueChange={setScenario}
          >
            <SelectTrigger className="h-9 w-full max-w-xs">
              <SelectValue placeholder={t("scenario")} />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map((s) => {
                const bundle = scenarioBundles[s.id];
                return (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.baseline ? ` (${ts("baseline")})` : ""}
                    {bundle ? ` · v${bundle.version}` : ""}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={!canSave || !isEditable} onClick={onSave}>
            {t("save")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={!canSave}
            onClick={() => {
              const base = activeBundle?.scenario.name ?? t("defaultSaveAsName");
              setSaveAsName(`${base} (${t("copySuffix")})`);
              setSaveAsOpen(true);
            }}
          >
            {t("saveAs")}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!canSave || !isEditable}
            onClick={onApply}
          >
            {t("apply")}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href={buildHref("/scenarios")}>{t("compare")}</Link>
          </Button>
          {executiveCompareHref ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href={executiveCompareHref}>{t("compareExecutive")}</Link>
            </Button>
          ) : null}
        </div>
      </div>

      {saveAsOpen ? (
        <div className="flex flex-wrap items-end gap-2 rounded-md border border-dashed border-border/60 bg-muted/20 p-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{t("saveAsPrompt")}</span>
            <input
              className="h-9 w-56 rounded-md border border-input bg-background px-3 text-sm"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              onSaveAs(saveAsName.trim() || t("defaultSaveAsName"));
              setSaveAsOpen(false);
            }}
          >
            {t("saveAsConfirm")}
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setSaveAsOpen(false)}>
            {t("cancel")}
          </Button>
        </div>
      ) : null}

      {activeBundle ? (
        <div className="space-y-1 border-t border-border/40 pt-2">
          <ScenarioGovernanceBadges
            governance={activeBundle.governance}
            baseline={activeBundle.scenario.baseline}
          />
          <p className="text-xs text-muted-foreground line-clamp-2">
            {buildScenarioIntentLine(activeBundle, scenarioBundles, intentLabels)}
          </p>
          {!isEditable ? (
            <p className="text-xs font-medium text-amber-700 dark:text-amber-400">
              {t("scenarioReadOnly")}
            </p>
          ) : null}
        </div>
      ) : null}

      {saveFeedback ? (
        <p
          className={
            saveFeedback.ok
              ? "text-xs font-medium text-emerald-700 dark:text-emerald-400"
              : "text-xs font-medium text-rose-700 dark:text-rose-400"
          }
        >
          {saveFeedback.text}
        </p>
      ) : null}
          </div>
  );
}
