"use client";

import { useTranslations } from "next-intl";
import type { IncentiveSnapshot, IncentivePlan } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IncentiveRetainedPanel({
  snapshot,
  plan,
}: {
  snapshot: IncentiveSnapshot;
  plan: IncentivePlan;
}) {
  const t = useTranslations("incentives");
  const fmt = (n: number) => formatCurrency(n, "SAR");
  const layerSum = Object.values(snapshot.byLayer).reduce((s, v) => s + v, 0);
  const unreleased =
    snapshot.companyTotalSar - layerSum - (snapshot.companyRetainedSar ?? 0);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("companyRetained")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span>{t("reservePolicy")}</span>
          <span>{plan.reservePct}%</span>
        </div>
        <div className="flex justify-between">
          <span>{t("retainedFromReserve")}</span>
          <span>{fmt(snapshot.companyRetainedSar ?? 0)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("unreleasedPool")}</span>
          <span>{fmt(Math.max(0, unreleased))}</span>
        </div>
        <div className="flex justify-between font-medium">
          <span>{t("companyTotal")}</span>
          <span>{fmt(snapshot.companyTotalSar)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
