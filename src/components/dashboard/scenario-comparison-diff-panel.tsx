"use client";

import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import type { NumericDelta, ScenarioComparisonResult } from "@/types/scenario-comparison";

function DeltaRow({
  label,
  delta,
  fmt,
  isPct = false,
}: {
  label: string;
  delta: NumericDelta;
  fmt: (n: number) => string;
  isPct?: boolean;
}) {
  const baseStr = isPct ? formatPct(delta.base) : fmt(delta.base);
  const compareStr = isPct ? formatPct(delta.compare) : fmt(delta.compare);
  const sign = delta.absolute >= 0 ? "+" : "";
  const deltaStr =
    delta.percent !== null
      ? `${sign}${delta.percent.toFixed(1)}%`
      : `${sign}${isPct ? formatPct(delta.absolute) : fmt(delta.absolute)}`;

  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pe-4 text-sm text-muted-foreground">{label}</td>
      <td className="py-2 pe-4 text-sm tabular-nums">{baseStr}</td>
      <td className="py-2 pe-4 text-sm tabular-nums font-medium">{compareStr}</td>
      <td
        className={`py-2 text-sm tabular-nums ${
          delta.direction === "up"
            ? "text-emerald-700 dark:text-emerald-400"
            : delta.direction === "down"
              ? "text-rose-700 dark:text-rose-400"
              : "text-muted-foreground"
        }`}
      >
        {deltaStr}
      </td>
    </tr>
  );
}

function DeltaTable({
  title,
  rows,
  fmt,
}: {
  title: string;
  rows: { label: string; delta: NumericDelta; isPct?: boolean }[];
  fmt: (n: number) => string;
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      <table className="w-full text-start">
        <thead>
          <tr className="text-[10px] uppercase text-muted-foreground">
            <th className="pb-2 pe-4 font-medium">{""}</th>
            <th className="pb-2 pe-4 font-medium">Base</th>
            <th className="pb-2 pe-4 font-medium">Compare</th>
            <th className="pb-2 font-medium">Δ</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <DeltaRow key={r.label} label={r.label} delta={r.delta} fmt={fmt} isPct={r.isPct} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Props = {
  comparison: ScenarioComparisonResult;
};

export function ScenarioComparisonDiffPanel({ comparison }: Props) {
  const t = useTranslations("planning.comparison");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);
  const f = comparison.financial;
  const o = comparison.operational;

  return (
    <Card className="border-border/60 bg-card/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("diffTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 md:grid-cols-2">
        <DeltaTable
          title={t("diffFinancial")}
          fmt={fmt}
          rows={[
            { label: t("field.revenue"), delta: f.revenue },
            { label: t("field.netProfit"), delta: f.netProfit },
            { label: t("field.grossProfit"), delta: f.grossProfit },
            { label: t("field.npPct"), delta: f.npPct, isPct: true },
            { label: t("field.roi"), delta: f.roi, isPct: true },
            { label: t("field.salesGap"), delta: f.salesNeededGap },
          ]}
        />
        <DeltaTable
          title={t("diffOperational")}
          fmt={fmt}
          rows={[
            { label: t("field.fixedCosts"), delta: o.fixedCostsMonthly },
            { label: t("field.revenueMonthly"), delta: o.revenueMonthly },
            { label: t("field.npTarget"), delta: o.npTargetPct, isPct: true },
            { label: t("field.growthAdj"), delta: o.growthAdj, isPct: true },
            { label: t("field.fixedCostAdj"), delta: o.fixedCostAdj, isPct: true },
            {
              label: t("field.tierOverrides"),
              delta: o.tierOverrideStreamCount,
            },
          ]}
        />
        {comparison.posture.some((p) => p.shifted) ? (
          <div className="md:col-span-2">
            <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("diffPosture")}
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {comparison.posture
                .filter((p) => p.shifted)
                .map((p) => (
                  <li key={p.field}>
                    {t(`posture.${p.field}`)}: {p.base} → {p.compare}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
