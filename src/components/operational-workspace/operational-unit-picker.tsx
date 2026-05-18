"use client";

import { useMemo } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Building2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useHrWorkforceSnapshotSlice } from "@/hooks/use-hr-workforce-snapshot-slice";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { buildHoldingBoardSnapshot } from "@/lib/holding/build-holding-board-snapshot";
import { formatCurrencyLocale, formatPct } from "@/lib/calculations/engine";

export function OperationalUnitPicker() {
  const t = useTranslations("holding.operationalPicker");
  const tHolding = useTranslations("holding");
  const locale = useLocale();
  const { organizationName } = useTenantPersistenceContext();
  const {
    linkedUnits,
    setCompany,
    hrActiveBuCount,
    retryWorkspaceBootstrap,
    bootstrapError,
  } = useOperationalWorkspace();
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

  if (linkedUnits.length === 0) {
    return (
      <Card className="mx-auto max-w-lg border-border/60 bg-card/60 backdrop-blur">
        <CardContent className="space-y-4 py-10 text-center">
          <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            {hrActiveBuCount > 0 ? tHolding("emptyUnitsPendingSync") : tHolding("emptyUnits")}
          </p>
          {bootstrapError ? (
            <p className="text-xs text-destructive">{bootstrapError}</p>
          ) : null}
          <div className="flex flex-wrap justify-center gap-2">
            <Button size="sm" asChild>
              <Link href="/hr-workforce/settings">{tHolding("addUnit")}</Link>
            </Button>
            {hrActiveBuCount > 0 ? (
              <Button
                size="sm"
                variant="secondary"
                className="gap-1"
                onClick={() => void retryWorkspaceBootstrap()}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {tHolding("syncToPlanning")}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-2 text-center">
        <Building2 className="mx-auto h-10 w-10 text-muted-foreground" />
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {snapshot.rows.map((row) => (
          <Card key={row.companyId} className="border-border/60 bg-card/60 backdrop-blur">
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
                  <p className="text-xs text-muted-foreground">{tHolding("revenue")}</p>
                  <p className="font-medium tabular-nums">{fmt(row.revenueMonthly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tHolding("netProfit")}</p>
                  <p className="font-medium tabular-nums">{fmt(row.netProfitMonthly)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tHolding("roi")}</p>
                  <p className="font-medium tabular-nums">
                    {row.roiPct == null ? "—" : formatPct(row.roiPct)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{tHolding("headcount")}</p>
                  <p className="font-medium tabular-nums">{row.headcount}</p>
                </div>
              </div>
              <Button className="w-full" size="sm" onClick={() => setCompany(row.companyId)}>
                {t("workInUnit")}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        <Button variant="outline" size="sm" asChild>
          <Link href="/holding">{t("viewHolding")}</Link>
        </Button>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/hr-workforce/settings">{tHolding("addUnit")}</Link>
        </Button>
      </div>
    </div>
  );
}
