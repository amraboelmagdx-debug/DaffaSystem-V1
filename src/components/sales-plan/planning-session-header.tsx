"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { OperationalBuToolbar } from "@/components/operational-workspace/operational-bu-toolbar";
import { ScenarioAuthoringControls } from "@/components/sales-plan/scenario-authoring-controls";
import { Button } from "@/components/ui/button";
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
import {
  getActiveScenarioBundle,
  scenariosForCompany,
  selectableScenariosForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";

type Props = {
  companyId: string | undefined;
  companyName: string | undefined;
  canSave: boolean;
  onSave: () => void;
  onSaveAs: (name: string) => void;
  onApply: () => void;
  saveFeedback: { text: string; ok: boolean } | null;
};

export function PlanningSessionHeader({
  companyId,
  companyName,
  canSave,
  onSave,
  onSaveAs,
  onApply,
  saveFeedback,
}: Props) {
  const t = useTranslations("salesPlan.session");
  const ts = useTranslations("planning.scenarios");
  const locale = useLocale();

  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const setScenario = useWorkspaceStore((s) => s.setScenario);
  const scenarios = companyId ? selectableScenariosForCompany(companyId) : [];
  const baselineId = scenarios.find((s) => s.baseline)?.id;
  const activeBundle = useWorkspaceStore((s) => getActiveScenarioBundle(s));
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const isEditable = useWorkspaceStore((s) =>
    selectedScenarioId ? s.isScenarioEditable(selectedScenarioId) : true
  );
  const intentLabels = useScenarioIntentLabels();

  const [saveAsOpen, setSaveAsOpen] = useState(false);
  const [saveAsName, setSaveAsName] = useState("");

  return (
    <section className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-sm sm:p-6 space-y-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {t("headerTitle")}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{t("headerSubtitle")}</p>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap items-end gap-4">
          <OperationalBuToolbar />
          {companyId ? (
            <div className="flex flex-col gap-1">
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                {t("scenario")}
              </span>
              <Select
                value={selectedScenarioId || scenarios[0]?.id || ""}
                onValueChange={setScenario}
              >
                <SelectTrigger className="w-[220px] max-w-full">
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
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="default" disabled={!canSave || !isEditable} onClick={onSave}>
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
          <Button type="button" size="sm" variant="outline" disabled={!canSave || !isEditable} onClick={onApply}>
            {t("apply")}
          </Button>
          <Button type="button" size="sm" variant="outline" asChild>
            <Link href="/scenarios" locale={locale}>
              {t("compare")}
            </Link>
          </Button>
          {activeBundle && baselineId ? (
            <Button type="button" size="sm" variant="outline" asChild>
              <Link
                href={`/?base=${baselineId}&compare=${selectedScenarioId}`}
                locale={locale}
              >
                {t("compareExecutive")}
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {saveAsOpen ? (
        <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border/60 bg-muted/20 p-3">
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

      {companyId ? (
        <ScenarioAuthoringControls
          companyId={companyId}
          scenarios={scenariosForCompany(companyId)}
          activeScenarioId={selectedScenarioId}
        />
      ) : null}

      {activeBundle ? (
        <div className="space-y-1.5">
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

      {companyName ? (
        <p className="text-xs text-muted-foreground">
          {t("activeUnit")}: <span className="font-medium text-foreground">{companyName}</span>
          {activeBundle ? (
            <>
              {" · "}
              {t("activeScenario")}:{" "}
              <span className="font-medium text-foreground">{activeBundle.scenario.name}</span>
            </>
          ) : null}
        </p>
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
    </section>
  );
}
