"use client";

import type { IncentiveExplainLine, IncentiveSnapshot } from "@/types/incentives";
import { formatCurrency } from "@/lib/calculations/engine";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type ExplainNodeType = IncentiveExplainLine & { children: ExplainNodeType[] };

function buildTree(lines: IncentiveExplainLine[]): ExplainNodeType[] {
  const byId = new Map<string, ExplainNodeType>();
  for (const line of lines) {
    byId.set(line.id, { ...line, children: [] });
  }
  const roots: ExplainNodeType[] = [];
  for (const line of lines) {
    const node = byId.get(line.id)!;
    if (line.parentId && byId.has(line.parentId)) {
      byId.get(line.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

function ExplainNode({ line, depth }: { line: ExplainNodeType; depth: number }) {
  const fmt = (n: number) => formatCurrency(n, "SAR");
  return (
    <div className="space-y-1" style={{ marginLeft: depth * 12 }}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-md border border-border/40 bg-muted/20 px-2 py-1 text-sm">
        <span>
          <span className="font-mono text-[10px] text-muted-foreground">{line.formulaId}</span>{" "}
          {line.label}
        </span>
        <span className="font-medium tabular-nums">{fmt(line.amountSar)}</span>
      </div>
      {line.inputs ? (
        <p className="text-[10px] text-muted-foreground">
          {Object.entries(line.inputs)
            .map(([k, v]) => `${k}=${String(v)}`)
            .join(" · ")}
        </p>
      ) : null}
      {line.children.map((c) => (
        <ExplainNode key={c.id} line={c} depth={depth + 1} />
      ))}
    </div>
  );
}

function filterLines(
  lines: IncentiveExplainLine[],
  dealId?: string | null,
  layerId?: string | null,
  participantId?: string | null
): IncentiveExplainLine[] {
  if (!dealId && !layerId && !participantId) return lines;
  return lines.filter((l) => {
    if (dealId && l.dealId !== dealId) return false;
    if (layerId && l.layerId !== layerId) return false;
    if (participantId && l.participantId !== participantId) return false;
    return true;
  });
}

export function IncentiveExplainPanel({
  snapshot,
  title,
  filterDealId,
  filterLayerId,
  filterParticipantId,
}: {
  snapshot: IncentiveSnapshot;
  title: string;
  filterDealId?: string | null;
  filterLayerId?: string | null;
  filterParticipantId?: string | null;
}) {
  const filtered = filterLines(
    snapshot.explainLines,
    filterDealId,
    filterLayerId,
    filterParticipantId
  );
  const roots = buildTree(filtered);
  const scoreLine = snapshot.explainLines.find((e) => e.formulaId === "scorecard_multiplier");

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="max-h-96 space-y-2 overflow-y-auto">
        {scoreLine ? (
          <p className="text-xs text-muted-foreground">
            Scorecard multiplier: {String(scoreLine.inputs?.scoreMult ?? "—")}
          </p>
        ) : null}
        {roots.length === 0 ? (
          <p className="text-sm text-muted-foreground">No explain lines.</p>
        ) : (
          roots.map((r) => <ExplainNode key={r.id} line={r} depth={0} />)
        )}
      </CardContent>
    </Card>
  );
}
