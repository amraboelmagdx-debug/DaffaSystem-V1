"use client";

import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PlanningWorkbookPanel } from "@/components/planning/planning-workbook-panel";
import { buildDemoForecastSeries } from "@/data/demo-seed";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

type MetricKey = "revenue" | "grossProfit" | "netProfit";

export default function ForecastGridPage() {
  const tp = useTranslations("planning");
  const { companies, selectedCompanyId } = useWorkspaceStore();
  const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
  const base = useMemo(() => buildDemoForecastSeries(company), [company]);
  const [grid, setGrid] = useState(() =>
    base.map((r) => ({
      month: r.month,
      revenue: r.revenue,
      grossProfit: r.grossProfit,
      netProfit: r.netProfit,
    }))
  );
  const [dbStatus, setDbStatus] = useState<"unknown" | "ok" | "none">("unknown");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/planning/workspace", { credentials: "include" });
        if (cancelled) return;
        if (res.status === 401 || res.status === 403) {
          setDbStatus("none");
          return;
        }
        const data = await res.json();
        setDbStatus(data?.source === "supabase" ? "ok" : "none");
      } catch {
        if (!cancelled) setDbStatus("none");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const updateCell = (row: number, key: MetricKey, value: number) => {
    setGrid((prev) => {
      const next = [...prev];
      const copy = { ...next[row], [key]: value };
      if (key === "revenue") {
        const cm = company.contributionMarginPct;
        copy.grossProfit = value * cm;
        copy.netProfit = copy.grossProfit - company.fixedCostsMonthly;
      }
      next[row] = copy;
      return next;
    });
  };

  const metrics: { key: MetricKey; labelKey: "revenue" | "grossProfit" | "netProfit" }[] = [
    { key: "revenue", labelKey: "revenue" },
    { key: "grossProfit", labelKey: "grossProfit" },
    { key: "netProfit", labelKey: "netProfit" },
  ];

  const matrixForExport = () => {
    const header = [tp("period"), ...metrics.map((m) => tp(m.labelKey))];
    const body = grid.map((row) => [
      row.month,
      Math.round(row.revenue),
      Math.round(row.grossProfit),
      Math.round(row.netProfit),
    ]);
    return [header, ...body];
  };

  const downloadExport = async (format: "csv" | "xlsx" | "pdf") => {
    const res = await fetch("/api/planning/export", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        format,
        title: `${company.name}-matrix`,
        matrix: matrixForExport(),
      }),
    });
    if (!res.ok) return;
    const blob = await res.blob();
    const ext = format === "xlsx" ? "xlsx" : format === "pdf" ? "pdf" : "csv";
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `planning.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImportFile = async (file: File | null) => {
    if (!file) return;
    const buf = await file.arrayBuffer();
    const res = await fetch("/api/planning/import", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/octet-stream" },
      body: buf,
    });
    const data = await res.json();
    if (!data.rows?.length) return;
    const rows = data.rows as (string | number)[][];
    const parsed = rows
      .slice(1)
      .map((r) => ({
        month: String(r[0] ?? ""),
        revenue: Number(r[1]) || 0,
        grossProfit: Number(r[2]) || 0,
        netProfit: Number(r[3]) || 0,
      }))
      .filter((r) => r.month);
    if (parsed.length) setGrid(parsed);
  };

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">{tp("matrixTitle")}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{tp("matrixSubtitle")}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant={dbStatus === "ok" ? "success" : "secondary"}>
              {dbStatus === "ok" ? "PostgreSQL" : tp("noDatabase")}
            </Badge>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => onImportFile(e.target.files?.[0] ?? null)}
          />
          <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
            {tp("import")}
          </Button>
          <Button type="button" variant="outline" onClick={() => downloadExport("csv")}>
            {tp("exportCsv")}
          </Button>
          <Button type="button" variant="outline" onClick={() => downloadExport("xlsx")}>
            {tp("exportXlsx")}
          </Button>
          <Button type="button" variant="outline" onClick={() => downloadExport("pdf")}>
            {tp("exportPdf")}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              setGrid(
                buildDemoForecastSeries(company).map((r) => ({
                  month: r.month,
                  revenue: r.revenue,
                  grossProfit: r.grossProfit,
                  netProfit: r.netProfit,
                }))
              )
            }
          >
            {tp("resetModel")}
          </Button>
        </div>
      </div>

      <PlanningWorkbookPanel />

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader className="sticky top-14 z-10 bg-card/95 backdrop-blur">
          <CardTitle className="text-base">{company.name}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div
              className="grid gap-px bg-border/60"
              style={{
                gridTemplateColumns: `minmax(140px,1fr) repeat(${metrics.length}, minmax(120px,1fr))`,
              }}
            >
              <div className="sticky start-0 z-[1] bg-muted/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide backdrop-blur">
                {tp("period")}
              </div>
              {metrics.map((m) => (
                <div
                  key={m.key}
                  className="bg-muted/80 px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                >
                  {tp(m.labelKey)}
                </div>
              ))}
              {grid.map((row, ri) => (
                <Fragment key={row.month}>
                  <div className="sticky start-0 z-[1] bg-card/95 px-3 py-2 text-sm font-medium backdrop-blur">
                    {row.month}
                  </div>
                  {metrics.map((m) => (
                    <div key={`${row.month}-${m.key}`} className="bg-card p-1">
                      <Input
                        className="h-9 border-transparent bg-transparent focus-visible:bg-muted"
                        type="number"
                        value={Math.round(row[m.key])}
                        onChange={(e) =>
                          updateCell(ri, m.key, Number(e.target.value || 0))
                        }
                      />
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
