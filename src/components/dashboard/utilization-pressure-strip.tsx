"use client";

import { useTranslations } from "next-intl";
import type { OperationalFeasibilityResult } from "@/types/operational-feasibility";

type Props = {
  result: OperationalFeasibilityResult;
};

export function UtilizationPressureStrip({ result }: Props) {
  const t = useTranslations("planning.feasibility");
  const sat = result.saturation;
  const supply = result.supply;
  const demand = result.demand;
  const staffing = result.staffing;

  if (!sat || !supply || !demand) return null;

  const items = [
    { label: t("strip.utilization"), value: `${sat.buUtilizationPct.toFixed(0)}%` },
    { label: t("strip.supply"), value: Math.round(supply.totalBillableHoursMonth).toLocaleString() },
    { label: t("strip.demand"), value: Math.round(demand.totalDemandHoursMonth).toLocaleString() },
    {
      label: t("strip.safeCeiling"),
      value: `${sat.safeUtilizationCeilingPct}%`,
    },
    {
      label: t("strip.hiringGap"),
      value: staffing ? String(staffing.impliedFteGap) : "0",
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-md border border-border/60 bg-muted/20 px-3 py-2"
        >
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
            {item.label}
          </p>
          <p className="text-lg font-semibold tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
