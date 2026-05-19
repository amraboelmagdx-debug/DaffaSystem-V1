"use client";

import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { InsightBulb } from "@/components/planning/insight-bulb";
import {
  SALES_PLAN_CHAPTERS,
  chapterForStep,
  firstStepOfChapter,
  type SalesPlanChapterId,
} from "@/lib/sales-plan/wizard-chapters";
import { cn } from "@/lib/utils";
import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";

const WIZARD_STEP_TITLE_KEYS = [
  "s1",
  "s2",
  "s3",
  "s4",
  "s5",
  "s6",
  "s7",
  "s8",
  "s9",
  "s10",
  "s11",
  "s12",
  "s13",
  "s14",
  "s15",
  "s16",
  "s17",
  "s18",
] as const;

type WizardStepTitleKey = (typeof WIZARD_STEP_TITLE_KEYS)[number];

const TOTAL_STEPS = WIZARD_STEP_TITLE_KEYS.length;

type Props = {
  onGo: (delta: number) => void;
};

export function SalesPlanWizardNav({ onGo }: Props) {
  const t = useTranslations("salesPlan");
  const tOx = useTranslations("ox");
  const wizard = useSalesPlanWizardStore();
  const [toolsOpen, setToolsOpen] = useState(false);

  const activeChapter = chapterForStep(wizard.currentStep);
  const stepsInChapter = Array.from(
    { length: activeChapter.stepTo - activeChapter.stepFrom + 1 },
    (_, i) => activeChapter.stepFrom + i
  );

  return (
    <div className="space-y-3 rounded-lg border border-border/60 bg-card/40 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {SALES_PLAN_CHAPTERS.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => wizard.setStep(firstStepOfChapter(ch.id as SalesPlanChapterId))}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors",
                activeChapter.id === ch.id
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border/60 text-muted-foreground hover:bg-muted/50"
              )}
            >
              {tOx(ch.labelKey as never)}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-8 gap-1 text-xs"
          onClick={() => setToolsOpen((o) => !o)}
        >
          <MoreHorizontal className="h-4 w-4" />
          {t("commandBar.moreTools")}
        </Button>
      </div>

      {toolsOpen ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border/40 pt-3">
          <div className="flex items-center gap-1.5 rounded-md border border-violet-500/20 bg-violet-500/5 px-2 py-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="h-3.5 w-3.5 rounded border-border accent-primary"
                checked={wizard.showAdvancedEnterpriseUi ?? false}
                onChange={(e) => wizard.setShowAdvancedEnterpriseUi(e.target.checked)}
              />
              {t("advanced.toggleLabel")}
            </label>
            <InsightBulb
              label={t("advanced.toggleBulbTitle")}
              description={t("advanced.toggleBulbBody")}
            />
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => wizard.normalizeMarketSegments()}>
            {t("normalizeSegments")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => wizard.normalizeAllTierMixes()}>
            {t("normalizeTierMixAll")}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => wizard.resetWizard()}>
            {t("reset")}
          </Button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 border-b border-border/60 pb-3">
        {stepsInChapter.map((n) => {
          const key = WIZARD_STEP_TITLE_KEYS[n - 1] as WizardStepTitleKey;
          const active = wizard.currentStep === n;
          return (
            <button
              key={key}
              type="button"
              onClick={() => wizard.setStep(n)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground shadow"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted"
              )}
            >
              {n}. {t(`stepTitles.${key}`)}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={wizard.currentStep <= 1}
          onClick={() => onGo(-1)}
        >
          <ChevronLeft className="me-1 h-4 w-4" />
          {t("back")}
        </Button>
        <span className="text-xs text-muted-foreground">
          {t("stepOf", { current: wizard.currentStep, total: TOTAL_STEPS })}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={wizard.currentStep >= TOTAL_STEPS}
          onClick={() => onGo(1)}
        >
          {t("next")}
          <ChevronRight className="ms-1 h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
