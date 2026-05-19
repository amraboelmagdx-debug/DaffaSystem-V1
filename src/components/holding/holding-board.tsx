"use client";

import { useMemo, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, Building2, Pencil, Plus, RefreshCw, Trash2 } from "lucide-react";
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
import { AddBusinessUnitDialog } from "@/components/holding/add-business-unit-dialog";
import {
  DeleteBusinessUnitDialog,
  type DeleteBusinessUnitTarget,
} from "@/components/holding/delete-business-unit-dialog";
import {
  RenameBusinessUnitDialog,
  type RenameBusinessUnitTarget,
} from "@/components/holding/rename-business-unit-dialog";
import { HoldingKpiStrip } from "@/components/holding/holding-kpi-strip";

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
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteBusinessUnitTarget | null>(
    null
  );
  const [renameTarget, setRenameTarget] = useState<RenameBusinessUnitTarget | null>(
    null
  );
  const companies = useWorkspaceStore((s) => s.companies);
  const streams = useWorkspaceStore((s) => s.streams);
  const opportunities = useWorkspaceStore((s) => s.opportunities);
  const scenarios = useWorkspaceStore((s) => s.scenarios);
  const scenarioBundles = useWorkspaceStore((s) => s.scenarioBundles);
  const tierLineOverrides = useWorkspaceStore((s) => s.tierLineOverrides);
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrSlice = useHrWorkforceSnapshotSlice();
  const canDeleteBu = businessUnits.length > 1;

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
          <h1 className="text-2xl font-semibold tracking-tight">
            {snapshot.holdingName}
          </h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            {t("boardPurpose")}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {bootstrapError && hrActiveBuCount > 0 ? (
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
              <RefreshCw
                className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`}
              />
              {t("syncToPlanning")}
            </Button>
          ) : null}
          <Button
            size="sm"
            className="gap-1"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="h-3.5 w-3.5" />
            {t("addUnit")}
          </Button>
        </div>
      </div>

      <HoldingKpiStrip rows={snapshot.rows} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {snapshot.rows.map((row) => (
          <Card
            key={row.companyId}
            role="button"
            tabIndex={0}
            onClick={() => enterUnit(row.companyId)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                enterUnit(row.companyId);
              }
            }}
            className="cursor-pointer border-border/60 bg-card/60 backdrop-blur transition-colors hover:border-primary/40 hover:bg-card/80"
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">
                  {row.hrBusinessUnitName}
                </CardTitle>
                <div className="flex shrink-0 items-center gap-1">
                  {row.hrBusinessUnitCode ? (
                    <Badge variant="outline" className="text-[10px]">
                      {row.hrBusinessUnitCode}
                    </Badge>
                  ) : null}
                  {row.hrBusinessUnitId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      aria-label={t("renameBu.renameAria")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setRenameTarget({
                          hrBusinessUnitId: row.hrBusinessUnitId,
                          name: row.hrBusinessUnitName,
                          code: row.hrBusinessUnitCode,
                        });
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  ) : null}
                  {canDeleteBu && row.hrBusinessUnitId ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={t("deleteBu.deleteAria")}
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({
                          hrBusinessUnitId: row.hrBusinessUnitId,
                          name: row.hrBusinessUnitName,
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {row.scenarioName ? (
                <p className="text-xs text-muted-foreground">
                  {row.scenarioName}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">{t("revenue")}</p>
                  <p className="font-medium tabular-nums">
                    {fmt(row.revenueMonthly)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("netProfit")}
                  </p>
                  <p className="font-medium tabular-nums">
                    {fmt(row.netProfitMonthly)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{t("roi")}</p>
                  <p className="font-medium tabular-nums">
                    {row.roiPct == null ? "—" : formatPct(row.roiPct)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">
                    {t("headcount")}
                  </p>
                  <p className="font-medium tabular-nums">{row.headcount}</p>
                </div>
              </div>
              <div className="flex items-center justify-end text-xs font-medium text-primary">
                <span>{t("enterPortal")}</span>
                <ArrowRight className="ms-1 h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        ))}

        <Card
          role="button"
          tabIndex={0}
          onClick={() => setAddOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setAddOpen(true);
            }
          }}
          className="cursor-pointer border-2 border-dashed border-border/60 bg-card/30 backdrop-blur transition-colors hover:border-primary/40 hover:bg-card/60"
        >
          <CardContent className="flex h-full min-h-[180px] flex-col items-center justify-center gap-2 py-6 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Plus className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium">{t("addUnit")}</p>
            <p className="text-xs text-muted-foreground">
              {t("addUnitHint")}
            </p>
          </CardContent>
        </Card>
      </div>

      {snapshot.rows.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">
          {hrActiveBuCount > 0 ? t("emptyUnitsPendingSync") : t("emptyUnits")}
        </p>
      ) : null}

      <AddBusinessUnitDialog open={addOpen} onOpenChange={setAddOpen} />
      <DeleteBusinessUnitDialog
        target={deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      />
      <RenameBusinessUnitDialog
        target={renameTarget}
        onOpenChange={(open) => {
          if (!open) setRenameTarget(null);
        }}
      />
    </div>
  );
}
