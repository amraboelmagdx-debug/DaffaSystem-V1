"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { RollingForecastTable } from "@/components/dashboard/rolling-forecast-table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import type { ForwardForecastResult } from "@/types/forward-forecast";
import type { DemoCompany } from "@/types/domain";

type Props = {
  company: DemoCompany;
  forwardForecast: ForwardForecastResult;
  showPageHeading?: boolean;
  id?: string;
};

export function ForwardForecastSection({
  company,
  forwardForecast,
  showPageHeading = false,
  id = "rolling-forecast",
}: Props) {
  const t = useTranslations("planning.forwardForecast");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const chartData = forwardForecast.financial.points.map((p) => ({
    month: p.period,
    revenue: p.revenue,
    netProfit: p.netProfit,
    revenueLow: forwardForecast.financial.confidenceBands.find((b) => b.period === p.period)
      ?.revenueLow,
    revenueHigh: forwardForecast.financial.confidenceBands.find((b) => b.period === p.period)
      ?.revenueHigh,
  }));

  const tableRows = forwardForecast.financial.points.map((p) => ({
    month: p.period,
    revenue: p.revenue,
    grossProfit: p.grossProfit,
    netProfit: p.netProfit,
  }));

  const utilData =
    forwardForecast.operational.mode === "hr_backed"
      ? forwardForecast.operational.points.map((p) => ({
          month: p.period,
          utilization: p.utilizationPct,
          hiringGap: p.hiringFteGap,
        }))
      : [];

  return (
    <section id={id} className="scroll-mt-24 space-y-6">
      {showPageHeading ? (
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{t("pageTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{t("description")}</p>
        </div>
      ) : (
        <div>
          <h2 className="text-lg font-semibold tracking-tight">{t("sectionTitle")}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("scenarioNote")}</p>
        </div>
      )}

      <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
        {forwardForecast.narrative.headline}
      </p>

      {forwardForecast.narrative.bullets.length > 0 ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {forwardForecast.narrative.bullets.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              {t("horizonEndRevenue")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {fmt(forwardForecast.targets.finalProjectedRevenue)}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              {t("workbookAttainment")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {formatPct(forwardForecast.targets.attainmentPct / 100)}
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              {t("marginTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {forwardForecast.financial.marginTrendPct.toFixed(1)} pp
          </CardContent>
        </Card>
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
              {t("saturationMonth")}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xl font-semibold">
            {forwardForecast.operational.firstSaturationMonth ?? t("none")}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">{t("trajectoryChart")}</CardTitle>
          <Badge variant="outline">{forwardForecast.meta.scenarioName}</Badge>
        </CardHeader>
        <CardContent className="h-72 pl-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <RTooltip />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="hsl(var(--chart-1))"
                fill="hsl(var(--chart-1))"
                fillOpacity={0.2}
                name={t("revenue")}
              />
              <Area
                type="monotone"
                dataKey="netProfit"
                stroke="hsl(var(--chart-2))"
                fillOpacity={0}
                name={t("netProfit")}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {utilData.length > 0 ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-base">{t("utilizationChart")}</CardTitle>
          </CardHeader>
          <CardContent className="h-64 pl-0">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={utilData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <RTooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="utilization"
                  stroke="hsl(var(--chart-3))"
                  name={t("utilization")}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      ) : null}

      <RollingForecastTable rows={tableRows} companyName={company.name} />
    </section>
  );
}
