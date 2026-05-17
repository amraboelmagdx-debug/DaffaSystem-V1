"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
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
import { buildDemoForecastSeries } from "@/data/demo-seed";
import {
  formatCurrencyLocale,
  formatPct,
} from "@/lib/calculations/engine";
import { evaluateExecutiveWorkspaceMeasures } from "@/lib/planning/measures";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

export default function ExecutiveDashboardPage() {
  const t = useTranslations("dashboard");
  const tm = useTranslations("measures");
  const tp = useTranslations("planning");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);
  const {
    companies,
    selectedCompanyId,
    setCompany,
    selectedScenarioId,
    setScenario,
    opportunities,
    tierLineOverrides,
  } = useWorkspaceStore();

  const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
  const scenarios = company ? scenariosForCompany(company.id) : [];
  const scenario =
    scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];
  const streams = company ? streamsForCompany(company.id) : [];

  const measures = useMemo(
    () =>
      company && scenario
        ? evaluateExecutiveWorkspaceMeasures({
            company,
            streams,
            opportunities,
            scenarios,
            activeScenarioId: scenario.id,
            tierLineOverrides,
          })
        : null,
    [company, streams, opportunities, scenarios, scenario, tierLineOverrides]
  );

  const baseEngine = measures?.baseEngine;
  const scenarioEngine = measures?.activeEngine;
  const workbookTargets = measures?.workbook.workbookTargets;
  const health = measures?.pipeline.health;
  const coverage = measures?.pipeline.coverage;
  const weightedPipeline = measures?.weightedPipeline;
  const scenarioCompare = measures?.scenarioCompare;
  const forecastAchievement = measures?.forecastAchievementVsPlanProxy;
  const blendedStreamCmPct = measures?.blendedStreamCmPct;

  const forecastSeries = useMemo(
    () => (company ? buildDemoForecastSeries(company) : []),
    [company]
  );

  const workbookSalesLabel =
    workbookTargets &&
    Number.isFinite(workbookTargets.salesTarget) &&
    workbookTargets.salesTarget < 1e14
      ? fmt(workbookTargets.salesTarget)
      : tp("unboundedSales");

  if (!company || !measures || !scenario) {
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <SampleDataPanel moduleId="workspace" />
        <p className="text-center text-sm text-muted-foreground">
          No companies in the workspace. Load sample data to open the executive dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <SampleDataPanel moduleId="workspace" />
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            {t("overview")}
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight md:text-4xl">
            {t("title")}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase text-muted-foreground">
              {t("company")}
            </span>
            <Select value={company.id} onValueChange={setCompany}>
              <SelectTrigger className="w-[220px]">
                <SelectValue placeholder={t("company")} />
              </SelectTrigger>
              <SelectContent>
                {companies.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] uppercase text-muted-foreground">
              {t("scenario")}
            </span>
            <Select value={scenario.id} onValueChange={setScenario}>
              <SelectTrigger className="w-[220px]">
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
          <Badge variant="secondary" className="h-9 px-3">
            {scenario.baseline ? t("baseline") : t("simulation")}
          </Badge>
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-lg border border-border/60 bg-muted/30 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <p className="font-medium text-foreground">{tm("stripTitle")}</p>
          <InsightBulb label={tm("bulbUnifiedTitle")} description={tm("bulbUnifiedBody")} />
          <InsightBulb label={tm("bulbTwoRoiTitle")} description={tm("bulbTwoRoiBody")} />
          <InsightBulb label={tm("bulbSalesPlanTitle")} description={tm("bulbSalesPlanBody")} />
        </div>
        <p className="text-xs text-muted-foreground">{tm("stripSubtitle")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Revenue (scenario)"
          value={fmt(scenarioEngine.revenue)}
          delta={`vs base ${fmt(scenarioEngine.revenue - baseEngine.revenue)}`}
          positive={scenarioEngine.revenue >= baseEngine.revenue}
          explanation="Scenario-adjusted revenue after growth, conversion, and mix levers. Compare to baseline for gap analysis."
        />
        <KpiCard
          title="Net profit"
          value={fmt(scenarioEngine.netProfit)}
          delta={`Margin ${formatPct(scenarioEngine.npPct)}`}
          positive={scenarioEngine.netProfit >= 0}
          explanation="Net profit equals gross profit minus fixed costs for the period. NP% is net profit divided by revenue."
        />
        <KpiCard
          title="ROI on fixed cost"
          value={formatPct(scenarioEngine.roi)}
          delta={`Burn ${fmt(scenarioEngine.burnRateMonthly)}`}
          positive={scenarioEngine.roi >= 0}
          explanation="ROI = Net Profit ÷ Fixed Costs. Values above zero mean operating profit fully covers fixed overhead."
        />
        <KpiCard
          title="Sales needed (NP target)"
          value={fmt(scenarioEngine.salesNeededGap)}
          delta={`Target rev ${fmt(scenarioEngine.salesTargetRevenue)}`}
          positive={scenarioEngine.salesNeededGap <= 0}
          explanation="Uses Sales Target ≈ Fixed Costs ÷ (Contribution Margin − Target NP). Gap is target revenue minus current scenario revenue."
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title={tp("blendedCm")}
          value={formatPct(workbookTargets.blended)}
          delta={tp("workbookTitle")}
          positive={workbookTargets.blended >= 0.35}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("salesTargetWorkbook")}
          value={workbookSalesLabel}
          delta={tp("npTargetScenario")}
          positive={Number.isFinite(workbookTargets.salesTarget)}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("npAtSalesTarget")}
          value={fmt(workbookTargets.netProfitAtTarget)}
          delta={formatPct(scenario?.npTargetPct ?? company.npTargetPct)}
          positive={workbookTargets.netProfitAtTarget >= 0}
          explanation={tp("workbookKpiExplain")}
        />
        <KpiCard
          title={tp("roiOnFixed")}
          value={formatPct(workbookTargets.roi)}
          delta={fmt(company.fixedCostsMonthly)}
          positive={workbookTargets.roi >= 0}
          explanation={tp("workbookKpiExplain")}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <KpiCard
          title="Forecast achievement"
          value={formatPct(forecastAchievement)}
          delta="Rolling vs plan"
          positive
          explanation="Ratio of scenario revenue to a 5% uplift plan proxy. Tune plan targets in company settings."
          className="lg:col-span-1"
        />
        <KpiCard
          title="Pipeline strength"
          value={formatPct(health)}
          delta={`Coverage ${formatPct(coverage)}`}
          positive={health >= 0.25}
          explanation="Strength is weighted pipeline ÷ gross pipeline. Coverage compares weighted pipeline to a 3× monthly quota heuristic."
          className="lg:col-span-1"
        />
        <KpiCard
          title="Weighted pipeline"
          value={fmt(weightedPipeline)}
          delta={`${opportunities.filter((o) => o.companyId === company.id).length} open deals`}
          positive
          explanation="Σ(deal value × probability) for open opportunities. Drives coverage and forecast risk views."
          className="lg:col-span-1"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Revenue &amp; profit curve</CardTitle>
            <Badge variant="outline">12 mo</Badge>
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

      <Card className="border-border/60 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Operating snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Gross profit</p>
            <p className="text-xl font-semibold">
              {fmt(scenarioEngine.grossProfit)}
            </p>
            <Separator className="my-3" />
            <p className="text-xs uppercase text-muted-foreground">EBITDA</p>
            <p className="text-xl font-semibold">
              {fmt(scenarioEngine.ebitda)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-muted-foreground">Operating margin</p>
            <p className="text-xl font-semibold">
              {formatPct(scenarioEngine.operatingMarginPct)}
            </p>
            <Separator className="my-3" />
            <p className="text-xs uppercase text-muted-foreground">Contribution (blended)</p>
            <p className="text-xl font-semibold">
              {formatPct(blendedStreamCmPct)}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
