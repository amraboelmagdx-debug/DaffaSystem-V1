"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { OxExpandDiagnostics } from "@/components/ox/ox-expand-diagnostics";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ExecutiveRollingForecastSection } from "@/components/dashboard/executive-rolling-forecast-section";
import { AssumptionAttributionPanel } from "@/components/dashboard/assumption-attribution-panel";
import { OperationalFeasibilityPanel } from "@/components/dashboard/operational-feasibility-panel";
import { ScenarioComparisonDiffPanel } from "@/components/dashboard/scenario-comparison-diff-panel";
import { ScenarioComparisonNarrative } from "@/components/dashboard/scenario-comparison-narrative";
import { ScenarioComparisonToolbar } from "@/components/dashboard/scenario-comparison-toolbar";
import { ScenarioDeltaKpiStrip } from "@/components/dashboard/scenario-delta-kpi-strip";
import { ForwardForecastSection } from "@/components/dashboard/forward-forecast-section";
import { useRollingForecastSeries } from "@/hooks/use-rolling-forecast-series";
import type { ForwardForecastResult } from "@/types/forward-forecast";
import type { AssumptionAttributionPhase } from "@/hooks/use-assumption-attribution";
import type { OperationalFeasibilityPhase } from "@/hooks/use-operational-feasibility";
import type { ScenarioComparisonPhase } from "@/hooks/use-scenario-comparison";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import type { ExecutiveWorkspaceMeasuresResult } from "@/lib/planning/measures";
import { InsightBulb } from "@/components/planning/insight-bulb";
import type { DemoCompany, DemoOpportunity, DemoScenario } from "@/types/domain";

type Props = {
  company: DemoCompany;
  activeScenario: DemoScenario;
  scenarios: DemoScenario[];
  linkedUnits: DemoCompany[];
  opportunities: DemoOpportunity[];
  measures: ExecutiveWorkspaceMeasuresResult;
  onSelectCompany: (companyId: string) => void;
  onSelectScenario: (scenarioId: string) => void;
  compareMode?: boolean;
  onCompareModeChange?: (on: boolean) => void;
  baseScenarioId?: string;
  compareScenarioId?: string;
  onBaseScenarioChange?: (id: string) => void;
  onCompareScenarioChange?: (id: string) => void;
  comparison?: ScenarioComparisonPhase;
  attribution?: AssumptionAttributionPhase;
  operationalFeasibility?: OperationalFeasibilityPhase;
  forwardForecast?: ForwardForecastResult | null;
};

export function ExecutiveDashboardContent({
  company,
  activeScenario,
  scenarios,
  linkedUnits,
  opportunities,
  measures,
  onSelectCompany,
  onSelectScenario,
  compareMode = false,
  onCompareModeChange,
  baseScenarioId = "",
  compareScenarioId = "",
  onBaseScenarioChange,
  onCompareScenarioChange,
  comparison,
  attribution,
  operationalFeasibility,
  forwardForecast,
}: Props) {
  const t = useTranslations("dashboard");
  const tf = useTranslations("planning.forwardForecast");
  const tc = useTranslations("planning.comparison");
  const tm = useTranslations("measures");
  const tp = useTranslations("planning");
  const ts = useTranslations("planning.scenarios");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const { baseEngine, activeEngine: scenarioEngine, workbook, pipeline, scenarioCompare } =
    measures;
  const workbookTargets = workbook.workbookTargets;
  const { health, coverage } = pipeline;
  const { weightedPipeline, forecastAchievementVsPlanProxy: forecastAchievement, blendedStreamCmPct } =
    measures;

  const fallbackSeries = useRollingForecastSeries(company);
  const forecastSeries =
    forwardForecast?.financial.points.map((p) => ({
      month: p.period,
      revenue: p.revenue,
      grossProfit: p.grossProfit,
      netProfit: p.netProfit,
    })) ?? fallbackSeries;

  const workbookSalesLabel =
    Number.isFinite(workbookTargets.salesTarget) && workbookTargets.salesTarget < 1e14
      ? fmt(workbookTargets.salesTarget)
      : tp("unboundedSales");

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("overview")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">{t("title")}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase text-muted-foreground">{t("company")}</span>
            <Select value={company.id} onValueChange={onSelectCompany}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t("company")} />
              </SelectTrigger>
              <SelectContent>
                {linkedUnits.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase text-muted-foreground">{t("scenario")}</span>
            <Select value={activeScenario.id} onValueChange={onSelectScenario}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t("scenario")} />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                    {s.baseline ? ` (${ts("baseline")})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="h-9 px-3">
            {activeScenario.baseline ? t("baseline") : t("simulation")}
          </Badge>
        </div>
      </div>

      <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("scenariosMonitorHint")}{" "}
        <Link href="/sales-plan" className="font-medium text-primary underline">
          {t("scenariosAuthorInSalesPlan")}
        </Link>
      </p>

      {onCompareModeChange && onBaseScenarioChange && onCompareScenarioChange ? (
        <ScenarioComparisonToolbar
          compareMode={compareMode}
          onCompareModeChange={onCompareModeChange}
          baseScenarioId={baseScenarioId}
          compareScenarioId={compareScenarioId}
          onBaseChange={onBaseScenarioChange}
          onCompareChange={onCompareScenarioChange}
          scenarios={scenarios}
        />
      ) : null}

      {compareMode && comparison?.phase === "ready" ? (
        <div className="space-y-4">
          <ScenarioDeltaKpiStrip comparison={comparison.result} />
          <ScenarioComparisonNarrative
            comparison={comparison.result}
            suppressCapacityProxy={
              operationalFeasibility?.phase === "compare_ready" &&
              operationalFeasibility.result.suppressCapacityProxyNarrative
            }
          />
          <ScenarioComparisonDiffPanel comparison={comparison.result} />
          {attribution?.phase === "ready" ? (
            <AssumptionAttributionPanel attribution={attribution.result} />
          ) : null}
          {operationalFeasibility?.phase === "compare_ready" ? (
            <OperationalFeasibilityPanel comparison={operationalFeasibility.result} />
          ) : null}
        </div>
      ) : null}

      {!compareMode && operationalFeasibility?.phase === "ready" ? (
        <OperationalFeasibilityPanel monitor={operationalFeasibility.result} />
      ) : null}

      {compareMode && comparison && comparison.phase !== "ready" && comparison.phase !== "idle" ? (
        <p className="text-sm text-muted-foreground">
          {comparison.phase === "blocked"
            ? comparison.reason === "same_scenario"
              ? tc("sameScenarioBlocked")
              : tc("comparisonBlocked")
            : comparison.phase === "error"
              ? comparison.message
              : null}
        </p>
      ) : null}

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{tm("stripTitle")}</p>
          <InsightBulb label={tm("bulbUnifiedTitle")} description={tm("bulbUnifiedBody")} />
          <InsightBulb label={tm("bulbTwoRoiTitle")} description={tm("bulbTwoRoiBody")} />
          <InsightBulb label={tm("bulbSalesPlanTitle")} description={tm("bulbSalesPlanBody")} />
        </div>
        <p className="text-xs text-muted-foreground">{tm("stripSubtitle")}</p>
      </div>

      {!compareMode ? (
      <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue (scenario)"
          value={fmt(scenarioEngine.revenue)}
          delta={`NP ${formatPct(scenarioEngine.npPct)}`}
          positive={scenarioEngine.netProfit >= 0}
          measureId={MEASURE_ID.REVENUE_SCENARIO_MONTHLY}
          explanation="Scenario-adjusted revenue after growth, conversion, and mix levers. Use compare mode for baseline deltas."
        />
        <KpiCard
          title="Net profit"
          value={fmt(scenarioEngine.netProfit)}
          delta={`Margin ${formatPct(scenarioEngine.npPct)}`}
          positive={scenarioEngine.netProfit >= 0}
          measureId={MEASURE_ID.NET_PROFIT_SCENARIO_MONTHLY}
          explanation="Net profit equals gross profit minus fixed costs for the period. NP% is net profit divided by revenue."
        />
        <KpiCard
          title="ROI on fixed cost"
          value={formatPct(scenarioEngine.roi)}
          delta={`Burn ${fmt(scenarioEngine.burnRateMonthly)}`}
          positive={scenarioEngine.roi >= 0}
          measureId={MEASURE_ID.ROI_SCENARIO_ON_FIXED}
          explanation="ROI = Net Profit ÷ Fixed Costs. Values above zero mean operating profit fully covers fixed overhead."
        />
        <KpiCard
          title="Sales needed (NP target)"
          value={fmt(scenarioEngine.salesNeededGap)}
          delta={`Target rev ${fmt(scenarioEngine.salesTargetRevenue)}`}
          positive={scenarioEngine.salesNeededGap <= 0}
          measureId={MEASURE_ID.SALES_GAP_SCENARIO_MONTHLY}
          explanation="Uses Sales Target ≈ Fixed Costs ÷ (Contribution Margin − Target NP). Gap is target revenue minus current scenario revenue."
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={tp("blendedCm")}
          value={formatPct(workbookTargets.blended)}
          delta={tp("workbookTitle")}
          positive={workbookTargets.blended >= 0.35}
          measureId={MEASURE_ID.CM_BLENDED_WORKBOOK}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("salesTargetWorkbook")}
          value={workbookSalesLabel}
          delta={tp("npTargetScenario")}
          positive={Number.isFinite(workbookTargets.salesTarget)}
          measureId={MEASURE_ID.WORKBOOK_SALES_TARGET}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("npAtSalesTarget")}
          value={fmt(workbookTargets.netProfitAtTarget)}
          delta={formatPct(activeScenario.npTargetPct)}
          positive={workbookTargets.netProfitAtTarget >= 0}
          measureId={MEASURE_ID.WORKBOOK_NP_AT_TARGET}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("roiOnFixed")}
          value={formatPct(workbookTargets.roi)}
          delta={fmt(company.fixedCostsMonthly)}
          positive={workbookTargets.roi >= 0}
          measureId={MEASURE_ID.WORKBOOK_ROI_ON_FIXED}
          explanation={tp("workbookKpiExplain")}
        />
      </div>
      <p className="text-end text-xs">
        <Link
          href="/grid"
          className="font-medium text-primary underline-offset-4 hover:underline"
        >
          {tp("workbookAdvancedEditorLink")}
        </Link>
      </p>
      </>
      ) : null}

      <OxExpandDiagnostics>
        <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          title="Forecast achievement"
          value={formatPct(forecastAchievement)}
          delta="Rolling vs plan"
          positive
          measureId={MEASURE_ID.FORECAST_ACHIEVEMENT_PROXY}
          explanation="Ratio of scenario revenue to a 5% uplift plan proxy. Tune plan targets in company settings."
          className="lg:col-span-1"
        />
        <KpiCard
          title="Pipeline strength"
          value={formatPct(health)}
          delta={`Coverage ${formatPct(coverage)}`}
          positive={health >= 0.25}
          measureId={MEASURE_ID.PIPELINE_HEALTH}
          explanation="Strength is weighted pipeline ÷ gross pipeline. Coverage compares weighted pipeline to a 3× monthly quota heuristic."
          className="lg:col-span-1"
        />
        <KpiCard
          title="Weighted pipeline"
          value={fmt(weightedPipeline)}
          delta={`${opportunities.filter((o) => o.companyId === company.id).length} open deals`}
          positive
          measureId={MEASURE_ID.PIPELINE_WEIGHTED_VALUE}
          explanation="Σ(deal value × probability) for open opportunities. Drives coverage and forecast risk views."
          className="lg:col-span-1"
        />
        </div>
      </OxExpandDiagnostics>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">{tf("chartTitle")}</CardTitle>
            <Badge variant="outline">{activeScenario.name}</Badge>
          </CardHeader>
          <CardContent className="h-72 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={forecastSeries}>
                <defs>
                  <linearGradient id="fillRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="hsl(var(--chart-1))"
                  fill="url(#fillRev)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Area
                  type="monotone"
                  dataKey="netProfit"
                  stroke="hsl(var(--chart-2))"
                  fillOpacity={0}
                  strokeWidth={2}
                  name="Net profit"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Scenario comparison</CardTitle>
            <Badge variant="outline">Net profit</Badge>
          </CardHeader>
          <CardContent className="h-72 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scenarioCompare}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <RTooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend />
                <Bar dataKey="profit" fill="hsl(var(--chart-3))" name="Net profit" radius={[6, 6, 0, 0]} />
                <Bar dataKey="revenue" fill="hsl(var(--chart-4))" name="Revenue" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {forwardForecast ? (
        <ForwardForecastSection company={company} forwardForecast={forwardForecast} />
      ) : (
        <ExecutiveRollingForecastSection
          company={company}
          activeScenarioId={activeScenario.id}
        />
      )}

      <Card className="border-border/60 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Operating snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Gross profit</p>
            <p className="text-xl font-semibold">{fmt(scenarioEngine.grossProfit)}</p>
            <Separator className="my-3" />
            <p className="text-xs uppercase text-muted-foreground">EBITDA</p>
            <p className="text-xl font-semibold">{fmt(scenarioEngine.ebitda)}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Operating margin</p>
            <p className="text-xl font-semibold">{formatPct(scenarioEngine.operatingMarginPct)}</p>
            <Separator className="my-3" />
            <p className="text-xs uppercase text-muted-foreground">Contribution (blended)</p>
            <p className="text-xl font-semibold">{formatPct(blendedStreamCmPct)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
