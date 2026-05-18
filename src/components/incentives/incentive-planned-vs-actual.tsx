"use client";

import type { IncentiveRunRecord } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IncentivePlannedVsActual({
  simulationRun,
  shadowRun,
}: {
  simulationRun: IncentiveRunRecord | null;
  shadowRun: IncentiveRunRecord | null;
}) {
  const fmt = (n: number) => formatCurrency(n, "SAR");

  if (!simulationRun && !shadowRun) {
    return (
      <Card className="border-border/60">
        <CardContent className="py-6 text-sm text-muted-foreground">
          Run simulation and shadow_actual modes to compare planned vs projected actual.
        </CardContent>
      </Card>
    );
  }

  const simPool = simulationRun?.snapshot.companyTotalSar ?? 0;
  const shadowPool = shadowRun?.snapshot.companyTotalSar ?? 0;
  const delta = shadowPool - simPool;

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Planned vs shadow actual</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Simulation</p>
          <p className="text-lg font-semibold">{fmt(simPool)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Shadow actual</p>
          <p className="text-lg font-semibold">{fmt(shadowPool)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Delta</p>
          <p className={`text-lg font-semibold ${delta >= 0 ? "text-emerald-600" : "text-destructive"}`}>
            {delta >= 0 ? "+" : ""}
            {fmt(delta)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
