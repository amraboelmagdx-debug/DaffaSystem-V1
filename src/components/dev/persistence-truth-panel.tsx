"use client";

import type { DomainTruthRow, PersistenceTruthReport } from "@/lib/persistence/persistence-truth-registry";
import type { DurabilityCheckItem } from "@/lib/persistence/restart-durability-checklist";
import { Badge } from "@/components/ui/badge";

function BoolBadge({ value }: { value: boolean | null | undefined }) {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return (
    <Badge variant={value ? "default" : "destructive"} className="text-[10px]">
      {value ? "yes" : "no"}
    </Badge>
  );
}

function DomainRow({ row }: { row: DomainTruthRow }) {
  return (
    <tr className="border-b border-border/40 align-top">
      <td className="py-2 pe-2 font-medium">{row.label}</td>
      <td className="py-2 pe-2 font-mono text-[10px]">{row.backend}</td>
      <td className="py-2 pe-2 text-[10px] text-muted-foreground">{row.hydrationSource}</td>
      <td className="py-2 pe-2">
        <BoolBadge value={row.restartSafe} />
      </td>
      <td className="py-2 pe-2">
        <BoolBadge value={row.serverAuthoritative} />
      </td>
      <td className="py-2 pe-2">
        <BoolBadge value={row.migrationOk} />
      </td>
      <td className="py-2 text-[10px] text-muted-foreground">{row.recommendedAction}</td>
    </tr>
  );
}

export function PersistenceTruthPanel({
  report,
  durabilityChecklist,
  loading,
}: {
  report: PersistenceTruthReport | null;
  durabilityChecklist: DurabilityCheckItem[];
  loading?: boolean;
}) {
  if (loading) {
    return <p className="text-xs text-muted-foreground">Loading persistence truth probes…</p>;
  }
  if (!report) {
    return <p className="text-xs text-destructive">Could not load persistence truth.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-xs font-medium">
        {report.pilotVerdict}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-[10px]">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="pb-1 pe-2">Domain</th>
              <th className="pb-1 pe-2">Backend</th>
              <th className="pb-1 pe-2">Hydration</th>
              <th className="pb-1 pe-2">Restart-safe</th>
              <th className="pb-1 pe-2">Server auth.</th>
              <th className="pb-1 pe-2">Migration</th>
              <th className="pb-1">Action</th>
            </tr>
          </thead>
          <tbody>
            {report.domains.map((row) => (
              <DomainRow key={row.domainId} row={row} />
            ))}
          </tbody>
        </table>
      </div>
      {durabilityChecklist.length > 0 ? (
        <div>
          <p className="mb-1 text-xs font-semibold">Restart durability checklist</p>
          <ul className="space-y-1 text-[10px]">
            {durabilityChecklist.map((item) => (
              <li
                key={item.id}
                className={item.passed ? "text-muted-foreground" : "text-destructive"}
              >
                {item.passed ? "✓" : "✗"} {item.label}: {item.explanation}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
