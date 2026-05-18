"use client";

import type { IncentiveSnapshot } from "@/types/incentives";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function IncentivePayoutLifecycleSummary({
  snapshot,
}: {
  snapshot: IncentiveSnapshot;
}) {
  const counts = new Map<string, number>();
  for (const line of snapshot.lines) {
    const state = line.lifecycleState ?? "accrued";
    counts.set(state, (counts.get(state) ?? 0) + 1);
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Payout lifecycle</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        {[...counts.entries()].map(([state, n]) => (
          <Badge key={state} variant="outline">
            {state}: {n} lines
          </Badge>
        ))}
        {!counts.size ? (
          <p className="text-sm text-muted-foreground">No payout lines in snapshot.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}
