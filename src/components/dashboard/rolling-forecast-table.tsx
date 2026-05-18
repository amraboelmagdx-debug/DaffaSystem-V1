"use client";

import { useMemo } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/calculations/engine";
import type { DemoForecastMonth } from "@/types/domain";

const columnHelper = createColumnHelper<DemoForecastMonth>();

type Props = {
  rows: DemoForecastMonth[];
  companyName: string;
  className?: string;
};

export function RollingForecastTable({ rows, companyName, className }: Props) {
  const t = useTranslations("dashboard.rollingForecast");

  const columns = useMemo(
    () => [
      columnHelper.accessor("month", { header: t("columnPeriod") }),
      columnHelper.accessor("revenue", {
        header: t("columnRevenue"),
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("grossProfit", {
        header: t("columnGrossProfit"),
        cell: (info) => formatCurrency(info.getValue()),
      }),
      columnHelper.accessor("netProfit", {
        header: t("columnNetProfit"),
        cell: (info) => formatCurrency(info.getValue()),
      }),
    ],
    [t]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Card className={className ?? "border-border/60 bg-card/60 backdrop-blur"}>
      <CardHeader>
        <CardTitle className="text-base">{t("tableTitle", { company: companyName })}</CardTitle>
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
  );
}
