"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import type { DemoCompany, DemoScenario } from "@/types/domain";
import type { IncentiveRunMode } from "@/types/incentives";

export type IncentivesNavSection = "plan" | "try" | "results" | "govern";

type Props = {
  title: string;
  company: DemoCompany;
  linkedUnits: DemoCompany[];
  scenarios: DemoScenario[];
  selectedScenarioId: string;
  runMode: IncentiveRunMode;
  periodYear: number;
  activeSection: IncentivesNavSection;
  onSectionChange: (section: IncentivesNavSection) => void;
  onSelectCompany: (id: string) => void;
  onSelectScenario: (id: string) => void;
  onRunModeChange: (mode: IncentiveRunMode) => void;
  onPeriodYearChange: (year: number) => void;
  onRunSimulation: () => void;
  showEmptyGuide?: boolean;
  children: ReactNode;
};

const NAV: { id: IncentivesNavSection; labelKey: string }[] = [
  { id: "plan", labelKey: "navPlan" },
  { id: "try", labelKey: "navTry" },
  { id: "results", labelKey: "navResults" },
  { id: "govern", labelKey: "navGovern" },
];

export function IncentivesWorkspaceLayout({
  title,
  company,
  linkedUnits,
  scenarios,
  selectedScenarioId,
  runMode,
  periodYear,
  activeSection,
  onSectionChange,
  onSelectCompany,
  onSelectScenario,
  onRunModeChange,
  onPeriodYearChange,
  onRunSimulation,
  showEmptyGuide,
  children,
}: Props) {
  const t = useTranslations("incentives.layout");

  return (
    <OperationalWorkspaceGate>
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Link
              href="/holding"
              className="inline-flex items-center gap-1 hover:text-foreground"
            >
              <Building2 className="h-3.5 w-3.5" />
              {t("backToHolding")}
            </Link>
            <span aria-hidden>·</span>
            <span>{t("workingIn", { unit: company.name })}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        </div>

        <div className="sticky top-14 z-10 -mx-1 flex flex-wrap items-end gap-3 rounded-lg border border-border/60 bg-card/80 p-3 backdrop-blur-md">
          <div className="space-y-1">
            <Label className="text-xs">{t("businessUnit")}</Label>
            <Select value={company.id} onValueChange={onSelectCompany}>
              <SelectTrigger className="h-9 w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {linkedUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("scenario")}</Label>
            <Select value={selectedScenarioId} onValueChange={onSelectScenario}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder={t("scenario")} />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("periodYear")}</Label>
            <Select
              value={String(periodYear)}
              onValueChange={(v) => onPeriodYearChange(Number(v))}
            >
              <SelectTrigger className="h-9 w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[periodYear - 1, periodYear, periodYear + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">{t("runMode")}</Label>
            <Select value={runMode} onValueChange={(v) => onRunModeChange(v as IncentiveRunMode)}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simulation">{t("modeSimulation")}</SelectItem>
                <SelectItem value="shadow_actual">{t("modeShadowActual")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button className="ms-auto gap-1.5" onClick={onRunSimulation}>
            <Play className="h-4 w-4" />
            {t("runSimulation")}
          </Button>
        </div>

        {showEmptyGuide ? (
          <div className="rounded-lg border border-dashed border-border/60 bg-card/40 p-6 text-center">
            <p className="text-sm font-medium">{t("emptyTitle")}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t("emptyBody")}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link href="/sales-plan">{t("emptyCtaPlan")}</Link>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <Link href="/hr-workforce">{t("emptyCtaHr")}</Link>
              </Button>
              <Button size="sm" onClick={onRunSimulation}>
                {t("runSimulation")}
              </Button>
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-6 lg:flex-row">
          <nav
            className="flex shrink-0 gap-1 lg:w-44 lg:flex-col"
            aria-label={t("navLabel")}
          >
            {NAV.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSectionChange(item.id)}
                className={cn(
                  "rounded-lg px-3 py-2 text-start text-sm font-medium transition-colors",
                  activeSection === item.id
                    ? "bg-primary/10 text-foreground ring-1 ring-primary/25"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                {t(item.labelKey)}
              </button>
            ))}
          </nav>
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </div>
    </OperationalWorkspaceGate>
  );
}
