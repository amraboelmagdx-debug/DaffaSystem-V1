"use client";

import type { IncentivePlan } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IncentiveScorecardExplain({
  plan,
  attainmentByComponent,
  multiplier,
  explainInputs,
}: {
  plan: IncentivePlan;
  attainmentByComponent: Record<string, number>;
  multiplier: number;
  explainInputs?: Record<string, number | string>;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Scorecard breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <p className="text-muted-foreground">Pool multiplier: {multiplier.toFixed(3)}</p>
        {explainInputs && Object.keys(explainInputs).length ? (
          <p className="text-[10px] text-muted-foreground">
            {Object.entries(explainInputs)
              .map(([k, v]) => `${k}=${String(v)}`)
              .join(" · ")}
          </p>
        ) : null}
        {plan.scorecard.components.map((c) => (
          <div key={c.id} className="flex justify-between border-b border-border/40 py-1">
            <span>
              {c.componentKey}
              {c.dependsOnComponentId ? ` (depends ${c.dependsOnComponentId})` : ""}
            </span>
            <span>{(attainmentByComponent[c.id] ?? 0).toFixed(2)}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
