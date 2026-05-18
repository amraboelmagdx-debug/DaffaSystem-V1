"use client";

import type { IncentiveSnapshot } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function IncentiveParticipantDrilldown({
  snapshot,
  participantNames,
  filterParticipantId,
  filterLayerId,
}: {
  snapshot: IncentiveSnapshot;
  participantNames: Map<string, string>;
  filterParticipantId?: string | null;
  filterLayerId?: string | null;
}) {
  const fmt = (n: number) => formatCurrency(n, "SAR");
  const lines = snapshot.lines.filter((l) => {
    if (filterParticipantId && l.jobRoleId !== filterParticipantId) return false;
    if (filterLayerId && l.layerId !== filterLayerId) return false;
    return true;
  });

  const byPerson = new Map<string, typeof lines>();
  for (const line of lines) {
    const id = line.jobRoleId ?? line.participantId ?? "unknown";
    const list = byPerson.get(id) ?? [];
    list.push(line);
    byPerson.set(id, list);
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">Participant drilldown</CardTitle>
      </CardHeader>
      <CardContent className="max-h-80 space-y-4 overflow-y-auto text-sm">
        {[...byPerson.entries()].map(([id, personLines]) => {
          const total = personLines.reduce((s, l) => s + l.amountSar, 0);
          return (
            <div key={id}>
              <p className="font-medium">
                {participantNames.get(id) ?? id} — {fmt(total)}
              </p>
              <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                {personLines.map((l, i) => (
                  <li key={`${l.dealId}-${l.layerId}-${i}`}>
                    {l.dealId} · {l.accrualMonth} → pay {l.payoutMonth}: {fmt(l.amountSar)}
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
