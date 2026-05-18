"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { resolveTierLines } from "@/data/default-tier-lines";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";
import { computeWorkbookPlanningSlice } from "@/lib/planning/measures";
import type { TierLine } from "@/lib/planning/workbook-engine";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActivePlanningInputs } from "@/hooks/use-active-planning-inputs";
import {
  scenariosForCompany,
  streamsForCompany,
  useWorkspaceStore,
} from "@/stores/use-workspace-store";

function tierLabelKey(tierKey: string): string {
  const map: Record<string, string> = {
    tiny: "tierTiny",
    standard: "tierStandard",
    big: "tierBig",
    mega: "tierMega",
  };
  return map[tierKey] ?? "tierStandard";
}

export function PlanningWorkbookPanel() {
  const t = useTranslations("planning");
  const locale = useLocale();
  const fmt = (n: number) => formatCurrencyLocale(n, locale);

  const {
    companies,
    selectedCompanyId,
    selectedScenarioId,
    setTierLinesForStream,
    updateActiveScenarioOverlay,
    resetTierLinesForCompany,
  } = useWorkspaceStore();

  const anchor = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
  const { company, tierLineOverrides } = useActivePlanningInputs(anchor?.id);
  if (!company) return null;
  const scenarios = scenariosForCompany(company.id);
  const scenario = scenarios.find((s) => s.id === selectedScenarioId) ?? scenarios[0];
  const streams = streamsForCompany(company.id);

  const streamGroups = useMemo(
    () =>
      streams.map((s) => ({
        revenueStreamId: s.id,
        lines: resolveTierLines(tierLineOverrides, s.id),
      })),
    [streams, tierLineOverrides]
  );

  const npTarget = scenario?.npTargetPct ?? company.npTargetPct;

  const { blendedWorkbook: blended, workbookTargets: targets } = useMemo(
    () =>
      computeWorkbookPlanningSlice({
        streams,
        tierLineOverrides,
        fixedCostsMonthly: company.fixedCostsMonthly,
        npTargetPct: npTarget,
      }),
    [streams, tierLineOverrides, company.fixedCostsMonthly, npTarget]
  );

  const salesLabel =
    Number.isFinite(targets.salesTarget) && targets.salesTarget < 1e14
      ? fmt(targets.salesTarget)
      : t("unboundedSales");

  const commitLines = (streamId: string, next: TierLine[]) => {
    setTierLinesForStream(
      streamId,
      next.map((l, i) => ({
        ...l,
        sortOrder: l.sortOrder ?? i,
      }))
    );
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-col gap-3 border-b border-border/50 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="text-base">{t("workbookTitle")}</CardTitle>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            {t("workbookSubtitle")}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          onClick={() => resetTierLinesForCompany(company.id)}
        >
          {t("resetTierMatrix")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("fixedCostsMonthly")}
            </Label>
            <Input
              type="number"
              className="h-9"
              value={Math.round(company.fixedCostsMonthly)}
              onChange={(e) =>
                updateActiveScenarioOverlay({
                  fixedCostsMonthly: Math.max(0, Number(e.target.value) || 0),
                })
              }
            />
          </div>
          <div className="space-y-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("npTargetScenario")}
            </Label>
            <div className="flex h-9 items-center gap-2 rounded-md border border-border bg-muted/25 px-3 text-sm">
              <span className="font-medium tabular-nums">{formatPct(npTarget)}</span>
              <span className="truncate text-muted-foreground">{scenario?.name}</span>
            </div>
          </div>
          <div className="space-y-2 sm:col-span-2 lg:col-span-2">
            <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {t("workbookKpiStrip")}
            </Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {t("blendedCm")}
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatPct(targets.blended)}</p>
              </div>
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {t("salesTargetWorkbook")}
                </p>
                <p className="text-sm font-semibold tabular-nums">{salesLabel}</p>
              </div>
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {t("npAtSalesTarget")}
                </p>
                <p className="text-sm font-semibold tabular-nums">
                  {fmt(targets.netProfitAtTarget)}
                </p>
              </div>
              <div className="rounded-md border border-border/80 bg-muted/20 px-3 py-2">
                <p className="text-[10px] uppercase text-muted-foreground">
                  {t("roiOnFixed")}
                </p>
                <p className="text-sm font-semibold tabular-nums">{formatPct(targets.roi)}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {streams.map((stream) => {
            const lines = resolveTierLines(tierLineOverrides, stream.id);
            const blockHead =
              lines.find((l) => l.blockWeightPct != null && l.blockWeightPct > 0)
                ?.blockWeightPct ?? lines[0]?.blockWeightPct ?? 0;

            return (
              <div
                key={stream.id}
                className="rounded-lg border border-border/70 bg-background/40 p-4 shadow-sm"
              >
                <div className="mb-3 flex items-baseline justify-between gap-2">
                  <h3 className="text-sm font-semibold">{stream.name}</h3>
                  <span className="text-[11px] text-muted-foreground">
                    {t("streamHeadlineCm")}: {formatPct(stream.contributionMarginPct)}
                  </span>
                </div>
                <div className="overflow-x-auto">
                  <table className="app-data-table min-w-[320px]">
                    <thead>
                      <tr>
                        <th className="text-[11px] uppercase">{t("tierCol")}</th>
                        <th className="text-end text-[11px] uppercase tabular-nums">{t("cmPctCol")}</th>
                        <th className="text-end text-[11px] uppercase tabular-nums">{t("mixCol")}</th>
                        <th className="text-end text-[11px] uppercase tabular-nums">{t("blockWeightCol")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, idx) => {
                        const isBlockRow = idx === 0;
                        return (
                          <tr key={`${stream.id}-${line.tierKey}`}>
                            <td className="font-medium capitalize text-muted-foreground">
                              {t(tierLabelKey(line.tierKey))}
                            </td>
                            <td className="text-end">
                              <Input
                                className="ms-auto h-8 w-[4.5rem] px-2 text-xs"
                                type="number"
                                value={Math.round(line.contributionMarginPct * 1000) / 10}
                                onChange={(e) => {
                                  const v = Math.min(
                                    99.9,
                                    Math.max(0, Number(e.target.value) || 0)
                                  );
                                  const next = lines.map((l, i) =>
                                    i === idx
                                      ? { ...l, contributionMarginPct: v / 100 }
                                      : { ...l }
                                  );
                                  commitLines(stream.id, next);
                                }}
                              />
                            </td>
                            <td className="text-end">
                              <Input
                                className="ms-auto h-8 w-[4.5rem] px-2 text-xs"
                                type="number"
                                value={Math.round(line.mixPctWithinStream * 1000) / 10}
                                onChange={(e) => {
                                  const v = Math.min(
                                    100,
                                    Math.max(0, Number(e.target.value) || 0)
                                  );
                                  const next = lines.map((l, i) =>
                                    i === idx ? { ...l, mixPctWithinStream: v / 100 } : { ...l }
                                  );
                                  commitLines(stream.id, next);
                                }}
                              />
                            </td>
                            <td className="text-end">
                              {isBlockRow ? (
                                <Input
                                  className="ms-auto h-8 w-[4.5rem] px-2 text-xs"
                                  type="number"
                                  value={Math.round(Number(blockHead) * 1000) / 10}
                                  onChange={(e) => {
                                    const v = Math.min(
                                      100,
                                      Math.max(0, Number(e.target.value) || 0)
                                    );
                                    const w = v / 100;
                                    const next = lines.map((l, i) => ({
                                      ...l,
                                      blockWeightPct: i === 0 ? w : null,
                                    }));
                                    commitLines(stream.id, next);
                                  }}
                                />
                              ) : (
                                <span className="inline-block text-muted-foreground">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
                  {t("blockWeightHint")}
                </p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
