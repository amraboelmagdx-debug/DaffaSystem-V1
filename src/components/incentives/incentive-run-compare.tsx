"use client";

import type { IncentiveRunRecord } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function delta(a: number, b: number): number {
  return b - a;
}

function DeltaCell({ value }: { value: number }) {
  return (
    <span className={value >= 0 ? "text-emerald-600" : "text-destructive"}>
      {value >= 0 ? "+" : ""}
      {formatCurrency(value, "SAR")}
    </span>
  );
}

export function IncentiveRunCompare({
  runA,
  runB,
  labelA,
  labelB,
}: {
  runA: IncentiveRunRecord;
  runB: IncentiveRunRecord;
  labelA: string;
  labelB: string;
}) {
  const fmt = (n: number) => formatCurrency(n, "SAR");
  const poolDelta = delta(
    runA.snapshot.companyTotalSar,
    runB.snapshot.companyTotalSar
  );
  const retainedDelta = delta(
    runA.snapshot.companyRetainedSar,
    runB.snapshot.companyRetainedSar
  );

  const layerIds = new Set([
    ...Object.keys(runA.snapshot.byLayer),
    ...Object.keys(runB.snapshot.byLayer),
  ]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Run comparison</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="grid grid-cols-4 gap-2 font-medium">
          <span>Metric</span>
          <span>{labelA}</span>
          <span>{labelB}</span>
          <span>Delta</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <span>Company pool</span>
          <span>{fmt(runA.snapshot.companyTotalSar)}</span>
          <span>{fmt(runB.snapshot.companyTotalSar)}</span>
          <DeltaCell value={poolDelta} />
        </div>
        <div className="grid grid-cols-4 gap-2">
          <span>Retained</span>
          <span>{fmt(runA.snapshot.companyRetainedSar)}</span>
          <span>{fmt(runB.snapshot.companyRetainedSar)}</span>
          <DeltaCell value={retainedDelta} />
        </div>
        <p className="text-xs font-medium text-muted-foreground">By layer</p>
        {[...layerIds].map((layerId) => {
          const a = runA.snapshot.byLayer[layerId] ?? 0;
          const b = runB.snapshot.byLayer[layerId] ?? 0;
          const d = delta(a, b);
          return (
            <div key={layerId} className="grid grid-cols-4 gap-2 text-xs">
              <span>{layerId}</span>
              <span>{fmt(a)}</span>
              <span>{fmt(b)}</span>
              <DeltaCell value={d} />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
