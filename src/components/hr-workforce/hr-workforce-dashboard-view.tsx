"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "@/lib/theme/theme-provider";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import { computeOhEngine } from "@/lib/hr-workforce/oh-engine";
import { resolveOhAnnualNumerator } from "@/lib/hr-workforce/oh-numerator";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { parseHrSnapshotPayload } from "@/lib/hr-workforce/snapshot-payload";
import {
  rankRolesByMonthlyCost,
  rankRolesByOhSurcharge,
  rankRolesByRiskFactor,
} from "@/lib/hr-workforce/role-analytics";
import { monthlyWorkingHoursPerEmployee } from "@/lib/hr-workforce/monthly-hours";
import { effectiveOhBillableHeadcount } from "@/lib/hr-workforce/structure-utils";
import { effectiveOperationalRoleType } from "@/lib/hr-workforce/role-operational-type";
import { aggregateByDepartment, buildWorkforceDashboardAggregates } from "@/lib/hr-workforce/aggregates";
import { filterBusinessUnitsForBu } from "@/lib/hr-workforce/scope-by-business-unit";
import { useUnitScope } from "@/hooks/use-unit-scope";
import { cn } from "@/lib/utils";
import type { HrDashChartLabels } from "./hr-workforce-dashboard-charts";
import type { RoleCostBreakdown } from "@/types/hr-workforce";

const HrWorkforceDashboardCharts = dynamic(
  () => import("./hr-workforce-dashboard-charts").then((m) => m.HrWorkforceDashboardCharts),
  { ssr: false, loading: () => <div className="min-h-[420px] animate-pulse rounded-xl bg-muted/30" aria-hidden /> }
);

const HrWorkforceBuOhCompareChart = dynamic(
  () => import("./hr-workforce-dashboard-charts").then((m) => m.HrWorkforceBuOhCompareChart),
  { ssr: false, loading: () => <div className="h-52 min-h-[200px] animate-pulse rounded-xl bg-muted/30" aria-hidden /> }
);

export function HrWorkforceDashboardView() {
  const t = useTranslations("hrWorkforce");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();

  const fmtMoney = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "SAR",
      maximumFractionDigits: 0,
    }).format(n);

  const fmtNum = (n: number, digits = 1) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);

  const fmtOhRatePerHr = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const roles = useHrWorkforceStore((s) => s.roles);
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);
  const snapshots = useHrWorkforceStore((s) => s.snapshots);
  const currency = hrGlobalSettings.defaultCurrency;
  const isRtl = locale.startsWith("ar");
  const chartTheme = resolvedTheme === "dark" ? "dark" : "light";
  const { isUnitScoped, hrBusinessUnitId } = useUnitScope();
  const visibleBusinessUnits = useMemo(
    () => filterBusinessUnitsForBu(businessUnits, isUnitScoped ? hrBusinessUnitId : null),
    [businessUnits, isUnitScoped, hrBusinessUnitId]
  );

  const [selectedOhBuId, setSelectedOhBuId] = useState(
    () => hrBusinessUnitId ?? businessUnits[0]?.id ?? ""
  );

  useEffect(() => {
    if (isUnitScoped && hrBusinessUnitId) {
      setSelectedOhBuId(hrBusinessUnitId);
      return;
    }
    if (businessUnits.length && !businessUnits.some((b) => b.id === selectedOhBuId)) {
      setSelectedOhBuId(businessUnits[0].id);
    }
  }, [businessUnits, selectedOhBuId, isUnitScoped, hrBusinessUnitId]);

  const model = useMemo(
    () =>
      deriveWorkspaceProjection({
        roles,
        businessUnits,
        departments,
        teams,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
      }),
    [roles, businessUnits, departments, teams, hrGlobalSettings, ohManualByBusinessUnitId]
  );

  const operationalRolesInBu = useMemo(
    () => model.operationalRoles.filter((r) => r.businessUnitId === selectedOhBuId),
    [model.operationalRoles, selectedOhBuId]
  );

  const breakdownsForBu = useMemo((): RoleCostBreakdown[] => {
    const out: RoleCostBreakdown[] = [];
    for (const r of operationalRolesInBu) {
      const b = model.breakdownByRoleId.get(r.id);
      if (b) out.push(b);
    }
    return out;
  }, [operationalRolesInBu, model.breakdownByRoleId]);

  const buDashboard = useMemo(
    () => buildWorkforceDashboardAggregates(operationalRolesInBu, breakdownsForBu),
    [operationalRolesInBu, breakdownsForBu]
  );

  const deptNames = useMemo(() => new Map(departments.map((d) => [d.id, d.name])), [departments]);

  const topDept = useMemo(() => {
    const agg = aggregateByDepartment(operationalRolesInBu, breakdownsForBu, deptNames);
    return agg.slice(0, 8).map((d) => ({
      name: d.departmentName,
      cost: Math.round(d.monthlyCost),
      headcount: d.headcount,
    }));
  }, [operationalRolesInBu, breakdownsForBu, deptNames]);

  const selectedBuName = useMemo(
    () => businessUnits.find((b) => b.id === selectedOhBuId)?.name ?? "—",
    [businessUnits, selectedOhBuId]
  );

  const ohManualSelected = useMemo(
    () => ({ ...DEFAULT_OH, ...(ohManualByBusinessUnitId[selectedOhBuId] ?? {}) }),
    [ohManualByBusinessUnitId, selectedOhBuId]
  );

  const utilCurve = useMemo(() => {
    const pts: { u: string; rate: number; billableHrsYr: number; effFte: number }[] = [];
    const eff = effectiveOhBillableHeadcount(roles, ohManualSelected, selectedOhBuId);
    const num = resolveOhAnnualNumerator(ohManualSelected, roles, hrGlobalSettings, selectedOhBuId);
    for (let u = 50; u <= 100; u += 10) {
      const oh = computeOhEngine({
        ...hrGlobalSettings,
        ...ohManualSelected,
        utilizationRatePct: u,
        billableEmployeeCount: eff,
        totalAnnualOverhead: num.totalNumerator,
      });
      pts.push({
        u: `${u}%`,
        rate: oh.ohRatePerHour,
        billableHrsYr: oh.totalBillableHoursPerYear,
        effFte: oh.effectiveBillableEmployeeCount,
      });
    }
    return pts;
  }, [roles, hrGlobalSettings, ohManualSelected, selectedOhBuId]);

  const manualBillableSumForSelectedBu = useMemo(() => {
    const om = ohManualByBusinessUnitId[selectedOhBuId];
    if (!om) return 0;
    if ((om.billableFteSource ?? "manual") !== "manual") return 0;
    return Math.max(0, Math.floor(om.billableEmployeeCount));
  }, [ohManualByBusinessUnitId, selectedOhBuId]);

  const totalMonthlyOhLoad = useMemo(() => {
    const mh = monthlyWorkingHoursPerEmployee(hrGlobalSettings);
    let s = 0;
    for (const r of operationalRolesInBu) {
      if (r.archived) continue;
      const b = model.breakdownByRoleId.get(r.id);
      if (!b) continue;
      const n = Math.max(0, Math.floor(r.employeeCount));
      s += (b.ohAdjustedHourlyCost - b.standardHourlyCost) * mh * n;
    }
    return s;
  }, [operationalRolesInBu, model.breakdownByRoleId, hrGlobalSettings]);

  const dashOhSlot = useMemo(() => {
    const direct =
      model.ohByBusinessUnitId[selectedOhBuId] ??
      model.ohByBusinessUnitId[businessUnits[0]?.id ?? ""];
    if (direct) return direct;
    const first = Object.values(model.ohByBusinessUnitId)[0];
    if (first) return first;
    const buId = selectedOhBuId || businessUnits[0]?.id || "";
    const ohManual = { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[buId] ?? {}) };
    const eff = effectiveOhBillableHeadcount(roles, ohManual, buId);
    const ohNumerator = resolveOhAnnualNumerator(ohManual, roles, hrGlobalSettings, buId);
    const oh = computeOhEngine({
      ...hrGlobalSettings,
      ...ohManual,
      billableEmployeeCount: eff,
      totalAnnualOverhead: ohNumerator.totalNumerator,
    });
    return { oh, ohNumerator };
  }, [
    model.ohByBusinessUnitId,
    selectedOhBuId,
    businessUnits,
    ohManualByBusinessUnitId,
    roles,
    hrGlobalSettings,
  ]);

  const trendData = useMemo(() => {
    const rows: { label: string; monthly: number }[] = [];
    for (let i = Math.min(8, snapshots.length) - 1; i >= 0; i--) {
      const snap = snapshots[i];
      try {
        const p = parseHrSnapshotPayload(snap.payloadJson);
        const snapBus = p.businessUnits ?? [];
        if (!snapBus.some((b) => b.id === selectedOhBuId)) {
          rows.push({ label: snap.meta.label.slice(0, 12), monthly: 0 });
          continue;
        }
        const m = deriveWorkspaceProjection({
          roles: p.roles ?? [],
          businessUnits: snapBus,
          departments: p.departments ?? [],
          teams: p.teams ?? [],
          hrGlobalSettings: p.hrGlobalSettings ?? hrGlobalSettings,
          ohManualByBusinessUnitId: p.ohManualByBusinessUnitId ?? {},
        });
        const inBu = m.operationalRoles.filter((r) => r.businessUnitId === selectedOhBuId);
        const bds: RoleCostBreakdown[] = [];
        for (const r of inBu) {
          const b = m.breakdownByRoleId.get(r.id);
          if (b) bds.push(b);
        }
        const monthly = buildWorkforceDashboardAggregates(inBu, bds).monthlyWorkforceCost;
        rows.push({ label: snap.meta.label.slice(0, 12), monthly });
      } catch {
        rows.push({ label: snap.meta.label.slice(0, 12), monthly: 0 });
      }
    }
    return rows;
  }, [snapshots, hrGlobalSettings, selectedOhBuId]);

  const topRoles = useMemo(() => {
    const byCost = rankRolesByMonthlyCost(operationalRolesInBu, model.breakdownByRoleId).slice(0, 6);
    return byCost.map((r) => {
      const b = model.breakdownByRoleId.get(r.id);
      return {
        name: r.name,
        monthly: b?.monthlyTotalCost ?? 0,
        stdHr: b?.standardHourlyCost ?? 0,
        ohAdjHr: b?.ohAdjustedHourlyCost ?? 0,
      };
    });
  }, [operationalRolesInBu, model.breakdownByRoleId]);

  const buRateData = useMemo(
    () =>
      businessUnits.map((u) => ({
        name: u.name,
        rate: model.ohByBusinessUnitId[u.id]?.oh.ohRatePerHour ?? 0,
      })),
    [businessUnits, model.ohByBusinessUnitId]
  );

  const buOhRows = useMemo(
    () =>
      businessUnits.map((u) => {
        const slot = model.ohByBusinessUnitId[u.id];
        const om = { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[u.id] ?? {}) };
        const src = om.billableFteSource ?? "manual";
        return {
          id: u.id,
          name: u.name,
          ohRate: slot?.oh.ohRatePerHour ?? 0,
          effFte: slot?.oh.effectiveBillableEmployeeCount ?? 0,
          billableHrsYr: slot?.oh.totalBillableHoursPerYear ?? 0,
          numerator: slot?.ohNumerator.totalNumerator ?? 0,
          composed: slot?.ohNumerator.composed ?? false,
          fteSource: src,
        };
      }),
    [businessUnits, model.ohByBusinessUnitId, ohManualByBusinessUnitId]
  );

  const ohImpactRoles = useMemo(() => {
    const mh = monthlyWorkingHoursPerEmployee(hrGlobalSettings);
    const rateFor = (r: (typeof roles)[number]) =>
      model.ohByBusinessUnitId[r.businessUnitId]?.oh.ohRatePerHour ?? 0;
    return rankRolesByOhSurcharge(operationalRolesInBu, hrGlobalSettings, rateFor)
      .slice(0, 5)
      .map((r) => {
        const rate = rateFor(r);
        const buName = businessUnits.find((u) => u.id === r.businessUnitId)?.name ?? "—";
        const fte = Math.max(0, r.employeeCount);
        return {
          roleId: r.id,
          name: r.name,
          oh$: rate * mh * fte,
          buName,
          ohRatePerHour: rate,
          fte,
          monthlyHours: mh,
        };
      });
  }, [operationalRolesInBu, hrGlobalSettings, model.ohByBusinessUnitId, businessUnits]);

  const riskRoles = useMemo(
    () =>
      rankRolesByRiskFactor(operationalRolesInBu)
        .slice(0, 5)
        .map((r) => ({ name: r.name, risk: r.riskFactorPct })),
    [operationalRolesInBu]
  );

  const billableFromRoles = useMemo(
    () =>
      operationalRolesInBu
        .filter((r) => !r.archived && effectiveOperationalRoleType(r) === "delivery")
        .reduce((s, r) => s + r.employeeCount, 0),
    [operationalRolesInBu]
  );

  const workforceMix = useMemo(() => {
    const active = operationalRolesInBu.filter((r) => !r.archived);
    const by = (ty: "delivery" | "indirect") =>
      active.filter((r) => effectiveOperationalRoleType(r) === ty).reduce((s, r) => s + r.employeeCount, 0);
    return { delivery: by("delivery"), indirect: by("indirect") };
  }, [operationalRolesInBu]);

  const chartLabels: HrDashChartLabels = useMemo(
    () => ({
      seriesMonthlyCost: t("seriesMonthlyCost"),
      seriesOhRate: t("seriesOhRate"),
      seriesHeadcount: t("seriesHeadcount"),
      seriesBillableHrsYr: t("seriesBillableHrsYr"),
      seriesEffFte: t("seriesEffFte"),
      seriesStdHr: t("seriesStdHr"),
      seriesOhAdjHr: t("seriesOhAdjHr"),
      snapshotSeries: t("snapshotSeries"),
    }),
    [t]
  );

  const fmtMoneyCur = (n: number) => fmtMoney(n, currency);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("dashTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("dashSubtitle")}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">{t("dashContextNote")}</p>
      </div>

      {!isUnitScoped ? (
      <Card className="border-primary/20 bg-gradient-to-r from-primary/[0.06] via-card to-card">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("ohSettingsBusinessUnit")}
            </Label>
            <Select value={selectedOhBuId} onValueChange={setSelectedOhBuId}>
              <SelectTrigger className="h-10 w-full min-w-[200px] max-w-md bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {visibleBusinessUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground sm:max-w-md sm:text-end">{t("dashBuSelectorHint")}</div>
        </CardContent>
      </Card>
      ) : null}

      <div className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{t("dashBuScopeHeading", { bu: selectedBuName })}</h2>
          <p className="text-sm text-muted-foreground">{t("dashBuScopeDesc")}</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <Kpi title={t("kpiTotalEmployees")} value={fmtNum(buDashboard.totalEmployees, 0)} hint={t("kpiHeadcountHint")} />
          <Kpi
            title={t("kpiDeliveryHeadcount")}
            value={fmtNum(buDashboard.billableEmployees, 0)}
            hint={t("kpiDeliveryHint", {
              manual: fmtNum(manualBillableSumForSelectedBu, 0),
              fromRoles: fmtNum(billableFromRoles, 0),
              effective: fmtNum(dashOhSlot.oh.effectiveBillableEmployeeCount, 0),
            })}
          />
          <Kpi
            title={t("kpiMonthlyCost")}
            value={fmtMoney(buDashboard.monthlyWorkforceCost, currency)}
            hint={t("kpiAnnualRunRate", { v: fmtMoney(buDashboard.annualWorkforceCost, currency) })}
          />
          <Kpi
            title={t("kpiAvgHourlyOh")}
            value={fmtMoney(buDashboard.averageOhAdjustedHourly, currency)}
            hint={t("kpiStdHourly", { v: fmtMoney(buDashboard.averageStandardHourly, currency) })}
          />
          <Kpi
            title={t("kpiMonthlyOhLoad")}
            value={fmtMoney(totalMonthlyOhLoad, currency)}
            hint={t("kpiMonthlyOhLoadHint")}
          />
        </div>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("dashChartsTitle")}</CardTitle>
            <CardDescription>{t("dashChartsDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <HrWorkforceDashboardCharts
              theme={chartTheme}
              isRtl={isRtl}
              fmtMoney={fmtMoneyCur}
              fmtNum={fmtNum}
              labels={chartLabels}
              deptData={topDept}
              utilData={utilCurve}
              rolesData={topRoles}
              trendData={trendData}
              emptyDeptHint={t("emptyDeptChart")}
              emptyRolesHint={t("chartEmptyRolesInCharts")}
              emptyTrendHint={t("chartEmptyTrendInCharts")}
            />
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="border-border/60 bg-card/50">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div className="min-w-0 flex-1 space-y-1">
                <CardTitle className="text-base">{t("panelOhAnalytics")}</CardTitle>
                <CardDescription>{t("panelOhAnalyticsDesc")}</CardDescription>
                <p className="text-xs text-muted-foreground">
                  {t("ohSettingsBusinessUnit")}:{" "}
                  <span className="font-medium text-foreground">{selectedBuName}</span>
                </p>
              </div>
              <InsightBulb label={t("bulbDashOhTitle")} description={t("bulbDashOhBody")} />
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Row label={t("ohRate")} value={fmtMoney(dashOhSlot.oh.ohRatePerHour, currency) + " / hr"} />
              <Row label={t("billableHoursYr")} value={fmtNum(dashOhSlot.oh.totalBillableHoursPerYear, 0)} />
              <Row label={t("billableHoursMo")} value={fmtNum(dashOhSlot.oh.totalBillableHoursPerMonth, 0)} />
              <Row label={t("netHoursEmpYr")} value={fmtNum(dashOhSlot.oh.netAvailableHoursPerEmployeeYear, 0)} />
              <div className="border-t border-border/50 pt-2">
                <div className="mb-1 text-xs font-medium text-foreground">{t("dashWorkforceMix")}</div>
                <Row label={t("roleType_delivery")} value={fmtNum(workforceMix.delivery, 0)} />
                <Row label={t("roleType_indirect")} value={fmtNum(workforceMix.indirect, 0)} />
              </div>
              {dashOhSlot.ohNumerator.composed ? (
                <div className="border-t border-border/50 pt-2">
                  <div className="mb-1 text-xs font-medium text-foreground">{t("dashOhNumeratorBreakdown")}</div>
                  <Row
                    label={t("ohComposedIndirect")}
                    value={fmtMoney(dashOhSlot.ohNumerator.indirectWorkforceAnnualStd, currency) + " / yr"}
                  />
                  <Row
                    label={t("ohComposedLines")}
                    value={fmtMoney(dashOhSlot.ohNumerator.nonWorkforceLinesAnnual, currency) + " / yr"}
                  />
                  <Row
                    label={t("ohComposedAdditional")}
                    value={fmtMoney(dashOhSlot.ohNumerator.additionalAnnualOverhead, currency) + " / yr"}
                  />
                  <Row
                    label={t("ohComposedTotal")}
                    value={fmtMoney(dashOhSlot.ohNumerator.totalNumerator, currency) + " / yr"}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="lg:col-span-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <OhImpactList
                title={t("listOhImpact")}
                description={t("listOhImpactDesc")}
                rows={ohImpactRoles}
                empty={t("emptyRoles")}
                fmtMoney={(n) => fmtMoney(n, currency)}
                expandRowLabel={t("ohImpactExpandRow")}
                collapseRowLabel={t("ohImpactCollapseRow")}
                perMoLabel={t("ohImpactPerMo")}
                meta={(r) =>
                  t("ohLoadRowMeta", {
                    bu: r.buName,
                    rate: fmtOhRatePerHr(r.ohRatePerHour),
                    fte: fmtNum(r.fte, 0),
                    hrs: fmtNum(r.monthlyHours, 1),
                  })
                }
              />
              <MiniList
                title={t("listRiskRoles")}
                rows={riskRoles.map((r) => ({ k: r.name, v: `${r.risk}%` }))}
                empty={t("emptyRoles")}
              />
            </div>
          </div>
        </div>
      </div>

      {!isUnitScoped ? (
      <div className="space-y-6 border-t border-border/50 pt-8">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold tracking-tight">{t("dashPortfolioSectionTitle")}</h2>
          <p className="text-sm text-muted-foreground">{t("dashPortfolioSectionDesc")}</p>
        </div>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("dashBuTableTitle")}</CardTitle>
            <CardDescription>{t("dashBuTableDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="app-data-table min-w-[720px] text-sm">
              <thead>
                <tr>
                  <th className="!text-center">{t("dashColBu")}</th>
                  <th className="!text-center tabular-nums">{t("dashColOhRate")}</th>
                  <th className="!text-center tabular-nums">{t("dashColEffFte")}</th>
                  <th className="!text-center tabular-nums">{t("dashColBillableHrs")}</th>
                  <th className="!text-center tabular-nums">{t("dashColNumerator")}</th>
                  <th className="!text-center">{t("dashColFteSrc")}</th>
                  <th className="!text-center">{t("dashColComposed")}</th>
                </tr>
              </thead>
              <tbody>
                {buOhRows.map((row) => (
                  <tr key={row.id}>
                    <td className="!text-center font-medium">{row.name}</td>
                    <td className="!text-center tabular-nums">{fmtMoney(row.ohRate, currency)}</td>
                    <td className="!text-center tabular-nums">{fmtNum(row.effFte, 0)}</td>
                    <td className="!text-center tabular-nums">{fmtNum(row.billableHrsYr, 0)}</td>
                    <td className="!text-center tabular-nums">{fmtMoney(row.numerator, currency)}</td>
                    <td className="!text-center">{row.fteSource === "from_roles" ? t("dashFteSrc_roles") : t("dashFteSrc_manual")}</td>
                    <td className="!text-center">{row.composed ? t("dashYes") : t("dashNo")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        {!isUnitScoped && buRateData.length > 1 ? (
          <Card className="border-border/60 bg-card/50">
            <CardHeader>
              <CardTitle className="text-base">{t("chartBuOhCompareTitle")}</CardTitle>
              <CardDescription>{t("dashPortfolioOhChartDesc")}</CardDescription>
            </CardHeader>
            <CardContent>
              <HrWorkforceBuOhCompareChart
                theme={chartTheme}
                fmtMoney={fmtMoneyCur}
                labels={chartLabels}
                buRateData={buRateData}
              />
            </CardContent>
          </Card>
        ) : null}
      </div>
      ) : null}
    </div>
  );
}

function Kpi({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="min-w-0 flex-1 leading-snug">{title}</CardDescription>
          <InsightBulb label={title} description={hint} wide className="shrink-0" />
        </div>
        <CardTitle className="text-2xl tabular-nums leading-none">{value}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/40 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

type OhImpactRow = {
  roleId: string;
  name: string;
  oh$: number;
  buName: string;
  ohRatePerHour: number;
  fte: number;
  monthlyHours: number;
};

function OhImpactList({
  title,
  description,
  rows,
  empty,
  fmtMoney,
  meta,
  expandRowLabel,
  collapseRowLabel,
  perMoLabel,
}: {
  title: string;
  description: string;
  rows: OhImpactRow[];
  empty: string;
  fmtMoney: (n: number) => string;
  meta: (r: OhImpactRow) => string;
  expandRowLabel: string;
  collapseRowLabel: string;
  perMoLabel: string;
}) {
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);

  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader className="space-y-1.5">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription className="text-pretty text-xs leading-relaxed">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => {
              const open = expandedRoleId === r.roleId;
              return (
                <li key={r.roleId}>
                  <button
                    type="button"
                    onClick={() => setExpandedRoleId((cur) => (cur === r.roleId ? null : r.roleId))}
                    aria-expanded={open}
                    aria-label={`${open ? collapseRowLabel : expandRowLabel}: ${r.name}`}
                    className={cn(
                      "w-full rounded-md text-start transition-colors",
                      open
                        ? "bg-muted/20 px-2 py-2 ring-1 ring-border/60"
                        : "py-0.5 hover:bg-muted/35"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ChevronDown
                          className={cn(
                            "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200",
                            open && "rotate-180"
                          )}
                          aria-hidden
                        />
                        <span className="truncate text-muted-foreground">{r.name}</span>
                      </span>
                      <span className="shrink-0 font-medium tabular-nums">
                        {fmtMoney(r.oh$)}
                        <span className="ms-1 text-xs font-normal text-muted-foreground">{perMoLabel}</span>
                      </span>
                    </div>
                    {open ? (
                      <p className="mt-2 border-t border-border/40 pt-2 text-[11px] leading-relaxed text-muted-foreground">
                        {meta(r)}
                      </p>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MiniList({
  title,
  rows,
  empty,
}: {
  title: string;
  rows: { k: string; v: string }[];
  empty: string;
}) {
  return (
    <Card className="border-border/60 bg-card/50">
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.k} className="flex justify-between gap-2">
                <span className="truncate text-muted-foreground">{r.k}</span>
                <span className="shrink-0 font-medium tabular-nums">{r.v}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
