"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations/engine";
import type { IncentiveSnapshot } from "@/types/incentives";

export function IncentivePayoutStory({
  snapshot,
}: {
  snapshot: IncentiveSnapshot | null | undefined;
}) {
  const t = useTranslations("ox.incentives");
  if (!snapshot) return null;

  const companyTotal = snapshot.companyTotalSar;
  const retained = snapshot.companyRetainedSar;
  const accrual = Math.max(0, companyTotal - retained);

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{t("payoutStory")}</CardTitle>
        <p className="text-sm text-muted-foreground">{t("payoutStoryDesc")}</p>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Company pool</p>
          <p className="text-lg font-semibold tabular-nums">{formatCurrency(companyTotal)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Accrued payout</p>
          <p className="text-lg font-semibold tabular-nums text-amber-700 dark:text-amber-400">
            {formatCurrency(accrual)}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Retained value</p>
          <p className="text-lg font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">
            {formatCurrency(retained)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
