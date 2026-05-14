"use client";

import { useLocale, useTranslations } from "next-intl";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatCurrencyLocale } from "@/lib/calculations/engine";
import type { ChartSeries } from "@/lib/sales-plan/build-model";
import type { OpportunityTierKey } from "@/types/sales-plan";

const TIER_COLORS: Record<OpportunityTierKey, string> = {
  tiny: "hsl(var(--chart-2))",
  standard: "hsl(var(--chart-3))",
  big: "hsl(var(--chart-4))",
  mega: "hsl(var(--chart-5))",
};

interface SalesPlanChartsProps {
  charts: ChartSeries;
  currency: string;
}

export function SalesPlanCharts({ charts, currency }: SalesPlanChartsProps) {
  const t = useTranslations("salesPlan");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale, currency);

  const tierData = charts.revenueByTier.map((d) => ({
    tier: d.tier,
    revenue: d.revenue,
    label: t(`tierShort.${d.tier}`),
  }));

  const svcData = charts.revenueByService.map((d) => ({
    name: d.name.length > 14 ? `${d.name.slice(0, 12)}…` : d.name,
    revenue: d.revenue,
  }));

  const qData = charts.quarterly.map((d) => ({
    quarter: d.quarter,
    revenue: d.revenue,
  }));

  const funnelData = charts.funnelGlobal.map((d) => ({
    ...d,
    label: t(`funnelLabels.${d.stage}` as "funnelLabels.contacts"),
  }));

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">{t("charts.revenueByTier")}</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tierData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" radius={[6, 6, 0, 0]}>
                {tierData.map((e) => (
                  <Cell key={e.tier} fill={TIER_COLORS[e.tier]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm">
        <p className="mb-3 text-sm font-semibold">{t("charts.revenueByService")}</p>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={svcData} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis type="number" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis type="category" dataKey="name" width={88} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number) => fmt(v)}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="revenue" fill="hsl(var(--chart-1))" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm lg:col-span-2">
        <p className="mb-3 text-sm font-semibold">{t("charts.quarterlyRev")}</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={qData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="quarter" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis
                tick={{ fontSize: 10 }}
                stroke="hsl(var(--muted-foreground))"
                tickFormatter={(v) => (Math.abs(v) >= 1e6 ? `${(v / 1e6).toFixed(1)}M` : `${Math.round(v / 1e3)}k`)}
              />
              <Tooltip
                formatter={(v: number) => [fmt(v), t("charts.revAxis")]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line type="monotone" dataKey="revenue" stroke="hsl(var(--chart-1))" strokeWidth={2} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border/60 bg-card/40 p-4 shadow-sm lg:col-span-2">
        <p className="mb-3 text-sm font-semibold">{t("charts.funnel")}</p>
        <div className="h-52 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnelData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <YAxis tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
              <Tooltip
                formatter={(v: number) => [Math.round(v).toLocaleString(locale), t("charts.funnelSeries")]}
                contentStyle={{
                  background: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Bar dataKey="value" fill="hsl(var(--chart-3))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
