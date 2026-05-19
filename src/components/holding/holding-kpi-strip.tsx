"use client";

import { useLocale, useTranslations } from "next-intl";
import { Building2, Coins, TrendingUp, Users2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrencyLocale } from "@/lib/calculations/engine";
import type { HoldingBuRow } from "@/lib/holding/build-holding-board-snapshot";

type Props = {
  rows: HoldingBuRow[];
};

export function HoldingKpiStrip({ rows }: Props) {
  const t = useTranslations("holding.kpiStrip");
  const locale = useLocale();

  const totalRevenue = sumOrNull(rows.map((r) => r.revenueMonthly));
  const totalNetProfit = sumOrNull(rows.map((r) => r.netProfitMonthly));
  const totalHeadcount = rows.reduce((sum, r) => sum + r.headcount, 0);
  const unitCount = rows.length;

  const fmt = (n: number | null) =>
    n == null ? "—" : formatCurrencyLocale(n, locale);

  const tiles = [
    {
      key: "units",
      label: t("units"),
      value: unitCount.toString(),
      icon: Building2,
    },
    {
      key: "revenue",
      label: t("revenue"),
      value: fmt(totalRevenue),
      icon: Coins,
    },
    {
      key: "netProfit",
      label: t("netProfit"),
      value: fmt(totalNetProfit),
      icon: TrendingUp,
    },
    {
      key: "headcount",
      label: t("headcount"),
      value: totalHeadcount.toString(),
      icon: Users2,
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {tiles.map((tile) => {
        const Icon = tile.icon;
        return (
          <Card
            key={tile.key}
            className="border-border/60 bg-card/60 backdrop-blur"
          >
            <CardContent className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-5 w-5" />
              </div>
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{tile.label}</p>
                <p className="text-lg font-semibold tabular-nums">
                  {tile.value}
                </p>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function sumOrNull(values: Array<number | null>): number | null {
  let any = false;
  let total = 0;
  for (const v of values) {
    if (v != null) {
      any = true;
      total += v;
    }
  }
  return any ? total : null;
}
