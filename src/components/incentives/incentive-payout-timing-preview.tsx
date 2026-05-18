"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { IncentiveSnapshot } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IncentivePayoutTimingPreview({
  snapshot,
}: {
  snapshot: IncentiveSnapshot;
}) {
  const t = useTranslations("incentives");
  const fmt = (n: number) => formatCurrency(n, "SAR");

  const byPayoutMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const line of snapshot.lines) {
      const key = line.payoutMonth.slice(0, 7);
      map.set(key, (map.get(key) ?? 0) + line.amountSar);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [snapshot.lines]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("payoutTiming")}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {byPayoutMonth.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noPayoutLines")}</p>
        ) : (
          byPayoutMonth.map(([month, amt]) => (
            <Badge key={month} variant="outline">
              {month}: {fmt(amt)}
            </Badge>
          ))
        )}
      </CardContent>
    </Card>
  );
}
