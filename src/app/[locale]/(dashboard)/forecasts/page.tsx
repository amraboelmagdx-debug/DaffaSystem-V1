"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationalPlanningPageShell } from "@/components/platform-simplification/operational-planning-page-shell";
import { buildDemoForecastSeries } from "@/data/demo-seed";
import { formatCurrency } from "@/lib/calculations/engine";
import { buildBuForecastContext } from "@/lib/planning/measures/bu-forecast-context";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type Row = ReturnType<typeof buildDemoForecastSeries>[number];

const columnHelper = createColumnHelper<Row>();

export default function ForecastsPage() {
  const { selectedUnit: company } = useOperationalWorkspace();
  const selectedScenarioId = useWorkspaceStore((s) => s.selectedScenarioId);
  const buContext = useMemo(
    () => (company ? buildBuForecastContext(company, selectedScenarioId || null) : null),
    [company, selectedScenarioId]
  );

  const data = useMemo(
    () => (company ? buildDemoForecastSeries(company) : []),
    [company]
  );

  const columns = useMemo(
    () => [
      columnHelper.accessor("month", { header: "Period" }),
      columnHelper.accessor("revenue", {
        header: "Revenue",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("grossProfit", {
        header: "Gross profit",
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("netProfit", {
        header: "Net profit",
        cell: (info) => formatCurrency(info.getValue()),
      }),
    ],
    []
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <OperationalPlanningPageShell
      routeContext="forecasts"
      bannerVariant="transitional"
      readOnly
      usesDemoData
    >
      {!company ? (
        <div className="mx-auto max-w-6xl p-8 text-center text-sm text-muted-foreground">
          Select or sync a business unit to view forecasts.
        </div>
      ) : (
        <div className="mx-auto max-w-6xl space-y-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Rolling forecasts</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Monthly roll-forward for the active business unit
              {buContext ? ` (${buContext.companyName})` : ""} using growth and margin targets
              from workspace settings.
            </p>
          </div>
          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">{company.name} — 12 month path</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="app-data-table min-w-[640px]">
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
                        <td key={cell.id}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      )}
    </OperationalPlanningPageShell>
  );
}
