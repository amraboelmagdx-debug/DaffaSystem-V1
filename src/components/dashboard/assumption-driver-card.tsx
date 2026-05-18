"use client";

import { useLocale, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { formatCurrencyLocale } from "@/lib/calculations/engine";
import type { AssumptionDriverAttribution } from "@/types/scenario-attribution";

type Props = {
  driver: AssumptionDriverAttribution;
  driverLabel: string;
  categoryLabel: string;
};

export function AssumptionDriverCard({ driver, driverLabel, categoryLabel }: Props) {
  const t = useTranslations("planning.attribution");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const np = driver.contributions.netProfit;
  const rev = driver.contributions.revenue;
  const sharePct =
    np.shareOfTotalDeltaPct !== null && Number.isFinite(np.shareOfTotalDeltaPct)
      ? np.shareOfTotalDeltaPct.toFixed(0)
      : null;

  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-4 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium">{driverLabel}</span>
        <Badge variant="outline" className="text-[10px]">
          {categoryLabel}
        </Badge>
        <Badge variant={driver.role === "primary" ? "default" : "secondary"} className="text-[10px]">
          {t(`role.${driver.role}`)}
        </Badge>
        <Badge variant="outline" className="text-[10px]">
          {t(`effect.${driver.effect}`)}
        </Badge>
      </div>
      <div className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        <p>
          {t("contribution.revenue")}:{" "}
          <span className="font-medium text-foreground">
            {rev.absolute >= 0 ? "+" : ""}
            {fmt(rev.absolute)}
          </span>
        </p>
        <p>
          {t("contribution.netProfit")}:{" "}
          <span className="font-medium text-foreground">
            {np.absolute >= 0 ? "+" : ""}
            {fmt(np.absolute)}
          </span>
          {sharePct ? (
            <span className="ms-1 text-muted-foreground">
              ({t("contribution.share", { pct: sharePct })})
            </span>
          ) : null}
        </p>
      </div>
      <p className="text-[11px] text-muted-foreground">
        {String(driver.baseValue)} → {String(driver.compareValue)}
      </p>
    </div>
  );
}
