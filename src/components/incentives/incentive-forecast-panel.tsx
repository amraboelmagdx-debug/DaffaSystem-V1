"use client";

import type { ForwardForecastResult } from "@/types/forward-forecast";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IncentiveForecastPanel({
  forecast,
  projectedPoolSar,
  projectedRetainedSar,
  blockedReason,
}: {
  forecast: ForwardForecastResult | null;
  projectedPoolSar: number;
  projectedRetainedSar: number;
  blockedReason?: string | null;
}) {
  const fmt = (n: number) => formatCurrency(n, "SAR");

  if (blockedReason) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Forecast unavailable: {blockedReason}
        </CardContent>
      </Card>
    );
  }

  if (!forecast) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Select a planning scenario to load forward forecast.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Incentive forecast</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground">Projected monthly pool exposure</p>
            <p className="text-xl font-semibold">{fmt(projectedPoolSar)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Projected retained</p>
            <p className="text-xl font-semibold">{fmt(projectedRetainedSar)}</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Target attainment: {forecast.targets.attainmentPct.toFixed(1)}%
        </p>
        <div className="flex flex-wrap gap-2">
          {forecast.financial.points.slice(0, 6).map((p) => (
            <Badge key={p.period} variant="outline">
              {p.period.slice(0, 7)}: {fmt(p.revenue)}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
