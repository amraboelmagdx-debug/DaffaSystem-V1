"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { DemoOpportunity, OpportunityStage } from "@/types/domain";
import { formatCurrency, formatPct } from "@/lib/calculations/engine";
import { stageLeakage } from "@/lib/calculations/pipeline";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

const stages: OpportunityStage[] = [
  "discovery",
  "qualification",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
];

const columnHelper = createColumnHelper<DemoOpportunity>();

export default function PipelinePage() {
  const { opportunities, selectedCompanyId, updateOpportunity } = useWorkspaceStore();
  const rows = useMemo(
    () => opportunities.filter((o) => o.companyId === selectedCompanyId),
    [opportunities, selectedCompanyId]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("clientName", { header: "Client" }),
      columnHelper.accessor("name", { header: "Opportunity" }),
      columnHelper.accessor("stage", {
        header: "Stage",
        cell: ({ row }) => (
          <Select
            value={row.original.stage}
            onValueChange={(v) =>
              updateOpportunity(row.original.id, { stage: v as OpportunityStage })
            }
          >
            <SelectTrigger className="h-8 w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {stages.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ),
      }),
      columnHelper.accessor("probabilityPct", {
        header: "Prob %",
        cell: ({ row }) => (
          <Input
            className="h-8 w-20"
            type="number"
            step="0.01"
            defaultValue={row.original.probabilityPct}
            onBlur={(e) =>
              updateOpportunity(row.original.id, {
                probabilityPct: Number(e.target.value),
              })
            }
          />
        ),
      }),
      columnHelper.accessor("dealValue", {
        header: "Value",
        cell: ({ row }) => (
          <Input
            className="h-8 w-28"
            type="number"
            defaultValue={row.original.dealValue}
            onBlur={(e) =>
              updateOpportunity(row.original.id, {
                dealValue: Number(e.target.value),
              })
            }
          />
        ),
      }),
      columnHelper.display({
        id: "weighted",
        header: "Weighted",
        cell: ({ row }) =>
          formatCurrency(row.original.dealValue * row.original.probabilityPct),
      }),
      columnHelper.display({
        id: "leakage",
        header: "Stage leakage",
        cell: ({ row }) => formatPct(stageLeakage(row.original.stage)),
      }),
    ],
    [updateOpportunity]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Pipeline intelligence</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Weighted revenue, stage leakage heuristics, and inline edits sync to the
          executive dashboard instantly.
        </p>
      </div>
      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Open opportunities</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[900px]">
            <thead>
              {table.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((h) => (
                    <th key={h.id}>
                      {h.isPlaceholder
                        ? null
                        : flexRender(h.column.columnDef.header, h.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
