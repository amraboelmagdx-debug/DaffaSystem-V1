"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ArrowRight, Building2, Plus, RefreshCw, Upload } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useHrWorkforceSnapshotSlice } from "@/hooks/use-hr-workforce-snapshot-slice";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { buildHoldingBoardSnapshot } from "@/lib/holding/build-holding-board-snapshot";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";

export function HoldingBoard() {
  const t = useTranslations("holding");
  const locale = useLocale();
  const router = useRouter();
  const { organizationName } = useTenantPersistenceContext();
  const {
    linkedUnits,
    setCompany,
    isReady,
    hrActiveBuCount,
    retryWorkspaceBootstrap,
    bootstrapError,
  } = useOperationalWorkspace();
  const [syncing, setSyncing] = useState(false);
  const companies = useWorkspaceStore((s) => s.companies);
  const streams = useWorkspaceStore((s) => s.streams);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const tierLineOverrides = useWorkspaceStore((s) => s.tierLineOverrides);
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrSlice = useHrWorkforceSnapshotSlice();

  const snapshot = useMemo(
    () =>
      buildHoldingBoardSnapshot({
        organizationName,
        companies,
        streams,
        opportunities,
        scenarios,
        scenarioBundles,
        tierLineOverrides,
        businessUnits,
        roles,
        hrSlice,
      }),
    [
      organizationName,
      companies,
      streams,
      opportunities,
      scenarios,
      scenarioBundles,
      tierLineOverrides,
      businessUnits,
      roles,
      hrSlice,
    ]
  );

  const fmt = (n: number | null) =>
    n == null ? "—" : formatCurrencyLocale(n, locale);

  const enterUnit = (companyId: string) => {
    setCompany(companyId);
    router.push(`/unit/${companyId}`);
  };

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-5 w-5" />
            <span className="text-sm font-medium">{t("eyebrow")}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{snapshot.holdingName}</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">{t("boardPurpose")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/hr-workforce/settings">
              <Plus className="h-3.5 w-3.5" />
              {t("addUnit")}
            </Link>
          </Button>
          <Button variant="outline" size="sm" className="gap-1" asChild>
            <Link href="/hr-workforce/import">
              <Upload className="h-3.5 w-3.5" />
              {t("importUnits")}
            </Link>
          </Button>
        </div>
      </div>

      {linkedUnits.length === 0 ? (
        <Card className="border-border/60 bg-card/60 backdrop-blur">
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {hrActiveBuCount > 0 ? t("emptyUnitsPendingSync") : t("emptyUnits")}
            </p>
            {bootstrapError ? (
              <p className="text-xs text-destructive">{bootstrapError}</p>
            ) : null}
            <div className="flex flex-wrap justify-center gap-2">
              <Button size="sm" className="gap-1" asChild>
                <Link href="/hr-workforce/settings">
                  <Plus className="h-3.5 w-3.5" />
                  {t("addUnit")}
                </Link>
              </Button>
              <Button size="sm" variant="outline" className="gap-1" asChild>
                <Link href="/hr-workforce/import">
                  <Upload className="h-3.5 w-3.5" />
                  {t("importUnits")}
                </Link>
              </Button>
              {hrActiveBuCount > 0 ? (
                <Button
                  size="sm"
                  variant="secondary"
                  className="gap-1"
                  disabled={syncing}
                  onClick={() => {
                    setSyncing(true);
                    void retryWorkspaceBootstrap().finally(() => setSyncing(false));
                  }}
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
                  {t("syncToPlanning")}
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {snapshot.rows.map((row) => (
              <Card
                key={row.companyId}
                className="border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-primary/30"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-base">{row.hrBusinessUnitName}</CardTitle>
                    {row.hrBusinessUnitCode ? (
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {row.hrBusinessUnitCode}
                      </Badge>
                    ) : null}
                  </div>
                  {row.scenarioName ? (
                    <p className="text-xs text-muted-foreground">{row.scenarioName}</p>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">{t("revenue")}</p>
                      <p className="font-medium tabular-nums">{fmt(row.revenueMonthly)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("netProfit")}</p>
                      <p className="font-medium tabular-nums">{fmt(row.netProfitMonthly)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("roi")}</p>
                      <p className="font-medium tabular-nums">
                        {row.roiPct == null ? "—" : formatPct(row.roiPct)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">{t("headcount")}</p>
                      <p className="font-medium tabular-nums">{row.headcount}</p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="w-full gap-1"
                    onClick={() => enterUnit(row.companyId)}
                  >
                    {t("enterPortal")}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-border/60 bg-card/60 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-base">{t("comparisonTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/60 text-muted-foreground">
                    <th className="pb-2 text-start font-medium">{t("unitColumn")}</th>
                    <th className="pb-2 text-end font-medium">{t("revenue")}</th>
                    <th className="pb-2 text-end font-medium">{t("netProfit")}</th>
                    <th className="pb-2 text-end font-medium">{t("roi")}</th>
                    <th className="pb-2 text-end font-medium">{t("headcount")}</th>
                    <th className="w-[100px]" />
                  </tr>
                </thead>
                <tbody>
                  {snapshot.rows.map((row) => (
                    <tr key={row.companyId} className="border-b border-border/40 last:border-0">
                      <td className="py-2 font-medium">{row.hrBusinessUnitName}</td>
                      <td className="py-2 text-end tabular-nums">{fmt(row.revenueMonthly)}</td>
                      <td className="py-2 text-end tabular-nums">{fmt(row.netProfitMonthly)}</td>
                      <td className="py-2 text-end tabular-nums">
                        {row.roiPct == null ? "—" : formatPct(row.roiPct)}
                      </td>
                      <td className="py-2 text-end tabular-nums">{row.headcount}</td>
                      <td className="py-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link
                            href={`/unit/${row.companyId}`}
                            onClick={() => setCompany(row.companyId)}
                          >
                            {t("open")}
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </>
      )}

      {snapshot.orphanCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("orphanHint", { count: snapshot.orphanCount })}
        </p>
      ) : null}
    </div>
  );
}
