"use client";

import type { ReactNode } from "react";
import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Minus } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { deriveWorkspaceProjection } from "@/lib/hr-workforce/workspace-projection";
import { DEFAULT_OH } from "@/lib/hr-workforce/default-oh";
import {
  computeOhScenarioForBu,
  deriveWorkforceIntelligence,
} from "@/lib/hr-workforce/intelligence";
import type { BuBenchmarkRow, OhCompositionMonthly, WorkforceAlert } from "@/lib/hr-workforce/intelligence";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { cn } from "@/lib/utils";

const IntelligenceOrgDistributionChart = dynamic(
  () =>
    import("./hr-workforce-intelligence-org-distribution-chart").then((m) => m.IntelligenceOrgDistributionChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-[280px] w-full animate-pulse rounded-lg bg-muted/25" aria-hidden />
    ),
  }
);

type BenchSortKey = keyof Pick<
  BuBenchmarkRow,
  | "name"
  | "ohRatePerHour"
  | "monthlyWorkforceCost"
  | "deliveryRatio"
  | "indirectBurdenPct"
  | "avgLoadedHourly"
  | "monthlyBillableHours"
>;

export function HrWorkforceIntelligenceView() {
  const t = useTranslations("hrWorkforce.intelligence");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const isRtl = locale.startsWith("ar");

  const roles = useHrWorkforceStore((s) => s.roles);
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);
  const snapshots = useHrWorkforceStore((s) => s.snapshots);
  const currency = hrGlobalSettings.defaultCurrency;

  const [scopeBuId, setScopeBuId] = useState<string>("all");
  const [scenarioBuId, setScenarioBuId] = useState(() => businessUnits[0]?.id ?? "");
  const [utilDelta, setUtilDelta] = useState(0);
  const [overheadDeltaPct, setOverheadDeltaPct] = useState(0);
  const [deliveryDeltaPct, setDeliveryDeltaPct] = useState(0);
  const [rentDeltaPct, setRentDeltaPct] = useState(0);
  const [benchSort, setBenchSort] = useState<{ key: BenchSortKey; dir: "asc" | "desc" }>({
    key: "monthlyWorkforceCost",
    dir: "desc",
  });

  const scopeStructure = useMemo(() => {
    if (scopeBuId === "all") {
      return {
        rolesSlice: roles,
        businessUnitsSlice: businessUnits,
        departmentsSlice: departments,
        teamsSlice: teams,
      };
    }
    const businessUnitsSlice = businessUnits.filter((b) => b.id === scopeBuId);
    const departmentsSlice = departments.filter((d) => d.businessUnitId === scopeBuId);
    const deptIds = new Set(departmentsSlice.map((d) => d.id));
    const teamsSlice = teams.filter((t) => deptIds.has(t.departmentId));
    const rolesSlice = roles.filter((r) => r.businessUnitId === scopeBuId);
    return { rolesSlice, businessUnitsSlice, departmentsSlice, teamsSlice };
  }, [scopeBuId, roles, businessUnits, departments, teams]);

  const modelFull = useMemo(
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

  const modelScoped = useMemo(
    () =>
      deriveWorkspaceProjection({
        roles: scopeStructure.rolesSlice,
        businessUnits: scopeStructure.businessUnitsSlice,
        departments: scopeStructure.departmentsSlice,
        teams: scopeStructure.teamsSlice,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
      }),
    [scopeStructure, hrGlobalSettings, ohManualByBusinessUnitId]
  );

  const intelFull = useMemo(
    () =>
      deriveWorkforceIntelligence({
        model: modelFull,
        allRoles: roles,
        businessUnits,
        departments,
        teams,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
        currency,
        snapshots,
      }),
    [
      modelFull,
      roles,
      businessUnits,
      departments,
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
      currency,
      snapshots,
    ]
  );

  const intelScoped = useMemo(
    () =>
      deriveWorkforceIntelligence({
        model: modelScoped,
        allRoles: roles,
        businessUnits: scopeStructure.businessUnitsSlice,
        departments: scopeStructure.departmentsSlice,
        teams: scopeStructure.teamsSlice,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
        currency,
        snapshots,
        orgStructureForHygiene: { departments, teams },
        disableSnapshotTrend: scopeBuId !== "all",
      }),
    [
      modelScoped,
      scopeBuId,
      scopeStructure,
      roles,
      businessUnits,
      departments,
      teams,
      hrGlobalSettings,
      ohManualByBusinessUnitId,
      currency,
      snapshots,
    ]
  );

  const intel = useMemo(() => {
    if (scopeBuId === "all") return intelFull;
    return { ...intelScoped, benchmarking: intelFull.benchmarking };
  }, [scopeBuId, intelFull, intelScoped]);

  const fmtMoney = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "SAR",
      maximumFractionDigits: 0,
    }).format(n);

  const fmtMoneyFine = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "SAR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);

  const fmtNum = (n: number, digits = 1) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: digits }).format(n);

  const fmtPct = (ratio: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(ratio * 100) + "%";

  useEffect(() => {
    if (scopeBuId !== "all" && !businessUnits.some((b) => b.id === scopeBuId)) {
      setScopeBuId("all");
    }
  }, [scopeBuId, businessUnits]);

  useEffect(() => {
    if (scopeBuId !== "all" && businessUnits.some((b) => b.id === scopeBuId)) {
      setScenarioBuId(scopeBuId);
    }
  }, [scopeBuId, businessUnits]);

  useEffect(() => {
    if (!scenarioBuId && businessUnits[0]) setScenarioBuId(businessUnits[0].id);
    if (scenarioBuId && !businessUnits.some((b) => b.id === scenarioBuId)) {
      setScenarioBuId(businessUnits[0]?.id || "");
    }
  }, [businessUnits, scenarioBuId]);

  const scenarioOh = useMemo(() => {
    if (!scenarioBuId) return null;
    const manual = { ...DEFAULT_OH, ...(ohManualByBusinessUnitId[scenarioBuId] ?? {}) };
    return computeOhScenarioForBu(roles, hrGlobalSettings, manual, scenarioBuId, {
      utilizationDeltaPct: utilDelta,
      totalAnnualOverheadDeltaPct: overheadDeltaPct,
      billableEmployeeCountDeltaPct: deliveryDeltaPct,
      rentNonWorkforceDeltaPct: rentDeltaPct,
    });
  }, [scenarioBuId, roles, hrGlobalSettings, ohManualByBusinessUnitId, utilDelta, overheadDeltaPct, deliveryDeltaPct, rentDeltaPct]);

  const sortedBenchmark = useMemo(() => {
    const rows = [...intel.benchmarking];
    const { key, dir } = benchSort;
    const mul = dir === "asc" ? 1 : -1;
    rows.sort((a, b) => (a[key] < b[key] ? -1 : a[key] > b[key] ? 1 : 0) * mul);
    return rows;
  }, [intel.benchmarking, benchSort]);

  const compositionTotal = useMemo(() => {
    const c = intel.oh.compositionMonthly;
    return (
      c.indirectWorkforce +
      c.rent +
      c.software +
      c.legal +
      c.utilities +
      c.infrastructure +
      c.miscellaneous +
      c.additionalOverheadBucket
    );
  }, [intel.oh.compositionMonthly]);

  const compositionEntries = useMemo(() => {
    const c = intel.oh.compositionMonthly;
    const keys: (keyof Omit<OhCompositionMonthly, never>)[] = [
      "indirectWorkforce",
      "rent",
      "software",
      "legal",
      "utilities",
      "infrastructure",
      "miscellaneous",
      "additionalOverheadBucket",
    ];
    return keys.map((k) => ({ key: k, value: c[k], label: t(`ohBucket_${k}`) }));
  }, [intel.oh.compositionMonthly, t]);

  const toggleBenchSort = (key: BenchSortKey) => {
    setBenchSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: "desc" }
    );
  };

  const trendIcon =
    intel.trend.direction === "up" ? (
      <ChevronUp className="h-4 w-4 text-amber-600 dark:text-amber-400" aria-hidden />
    ) : intel.trend.direction === "down" ? (
      <ChevronDown className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden />
    ) : (
      <Minus className="h-4 w-4 text-muted-foreground" aria-hidden />
    );

  const trendLabel =
    intel.trend.suppressedReason === "snapshot_org_only"
      ? t("trendHiddenScoped")
      : intel.trend.deltaPct == null
        ? t("trendUnknown")
        : t("trendDelta", { pct: fmtNum(intel.trend.deltaPct, 1) });

  const teamDisplayName = (id: string) => (id === "__unassigned__" ? t("teamUnassignedLabel") : undefined);

  return (
    <div className="space-y-8 pb-10">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{t("pageTitle")}</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">{t("pageSubtitle")}</p>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <Label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {t("scopeLabel")}
            </Label>
            <Select value={scopeBuId} onValueChange={setScopeBuId}>
              <SelectTrigger className="h-10 w-full min-w-[220px] max-w-md bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("scopeAll")}</SelectItem>
                {businessUnits.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="max-w-xl text-xs text-muted-foreground sm:text-end">{t("scopeHint")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-4">
        <ExecKpi
          title={t("kpiMonthlyCost")}
          value={fmtMoney(intel.executive.totalMonthlyWorkforceCost)}
          hint={t("kpiMonthlyCostHint")}
          trendSlot={
            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              {trendIcon}
              <span>{trendLabel}</span>
            </div>
          }
        />
        <ExecKpi
          title={t("kpiHeadcount")}
          value={fmtNum(intel.executive.totalHeadcount, 0)}
          hint={t("kpiHeadcountHint")}
        />
        <ExecKpi
          title={t("kpiDeliveryShare")}
          value={fmtPct(intel.executive.workforceEfficiencyRatio)}
          hint={t("kpiDeliveryShareHint")}
        />
        <ExecKpi
          title={scopeBuId === "all" ? t("kpiOhRate") : t("kpiOhRateUnit")}
          value={`${fmtMoneyFine(intel.executive.orgWideOhRatePerHour)} / hr`}
          hint={t("kpiOhRateHint")}
        />
        <ExecKpi
          title={t("kpiLoadedHourly")}
          value={fmtMoneyFine(intel.executive.avgLoadedHourly)}
          hint={t("kpiLoadedHourlyHint")}
        />
        <ExecKpi
          title={t("kpiUtilization")}
          value={`${fmtNum(intel.executive.capacityUtilizationPct, 1)}%`}
          hint={t("kpiUtilizationHint")}
        />
        <ExecKpi
          title={t("kpiTop3Concentration")}
          value={`${fmtNum(intel.executive.workforceCostConcentrationTop3Pct, 1)}%`}
          hint={t("kpiTop3ConcentrationHint")}
        />
        <ExecKpi
          title={t("kpiDeliveryVsIndirectHc")}
          value={fmtNum(intel.executive.deliveryVsIndirectRatio, 2)}
          hint={t("kpiDeliveryVsIndirectHcHint")}
        />
      </div>

      {intel.alerts.length > 0 ? (
        <div className="flex flex-col gap-2">
          {intel.alerts.map((a) => (
            <AlertBanner key={a.id} alert={a} t={t} />
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">{t("orgDistributionTitle")}</CardTitle>
                <CardDescription>{t("orgDistributionDesc")}</CardDescription>
              </div>
              <InsightBulb label={t("orgDistributionBulbTitle")} description={t("orgDistributionBulbBody")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="overflow-hidden rounded-xl border border-border/50 bg-gradient-to-br from-muted/30 via-card to-card shadow-sm ring-1 ring-border/35">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/30 px-4 py-3 sm:px-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t("orgDistChartTitle")}
                </p>
                <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
                  {t("orgDistChartBadge")}
                </span>
              </div>
              <div className="px-2 pb-3 pt-1 sm:px-3">
                <IntelligenceOrgDistributionChart
                  rows={intel.org.distribution.byDepartment}
                  theme={resolvedTheme === "dark" ? "dark" : "light"}
                  isRtl={isRtl}
                  fmtNum={fmtNum}
                  seriesLabel={t("orgDistChartSeries")}
                  emptyHint={t("orgDistChartEmpty")}
                />
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-3 sm:gap-4">
              <CountList title={t("colBu")} rows={intel.org.distribution.byBusinessUnit} />
              <CountList title={t("colDept")} rows={intel.org.distribution.byDepartment} />
              <CountList title={t("colTeam")} rows={intel.org.distribution.byTeam} fmtName={teamDisplayName} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("orgSpanTitle")}</CardTitle>
            <CardDescription>{t("orgSpanDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <MetricRow label={t("spanAvgRolesPerDept")} value={fmtNum(intel.org.span.avgRolesPerDepartment, 2)} />
            <MetricRow label={t("spanMgmtRatio")} value={fmtPct(intel.org.span.managementRatio)} />
            <MetricRow
              label={t("spanDeptHhi")}
              value={fmtNum(intel.org.span.departmentCostConcentration, 3)}
            />
            <div className="border-t border-border/50 pt-3">
              <div className="mb-2 text-xs font-medium text-foreground">{t("orgHygieneTitle")}</div>
              <MetricRow label={t("hygieneInactiveDept")} value={String(intel.org.hygiene.inactiveDepartments)} />
              <MetricRow label={t("hygieneInactiveTeams")} value={String(intel.org.hygiene.inactiveTeams)} />
              <MetricRow label={t("hygieneArchivedRoles")} value={String(intel.org.hygiene.archivedRoles)} />
            </div>
            <div className="border-t border-border/50 pt-3">
              <div className="mb-2 text-xs font-medium text-foreground">{t("orgMixTitle")}</div>
              <MetricRow label={t("mixDeliveryHc")} value={fmtNum(intel.org.distribution.deliveryHeadcount, 0)} />
              <MetricRow label={t("mixSupportHc")} value={fmtNum(intel.org.distribution.supportHeadcount, 0)} />
              <MetricRow label={t("mixMgmtHc")} value={fmtNum(intel.org.distribution.managementHeadcount, 0)} />
              <MetricRow
                label={t("mixIndirectLegacyHc")}
                value={fmtNum(intel.org.distribution.indirectLegacyHeadcount, 0)}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">{t("econTopRolesTitle")}</CardTitle>
                <CardDescription>{t("econTopRolesDesc")}</CardDescription>
              </div>
              <InsightBulb label={t("econBulbTitle")} description={t("econBulbBody")} />
            </div>
          </CardHeader>
          <CardContent>
            <AmountTable rows={intel.economics.concentration.topRoles} fmtMoney={fmtMoney} empty={t("emptyTable")} />
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <CardTitle className="text-base">{t("econTopDeptTitle")}</CardTitle>
            <CardDescription>{t("econTopDeptDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <AmountTable
              rows={intel.economics.concentration.topDepartments}
              fmtMoney={fmtMoney}
              empty={t("emptyTable")}
            />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <RatioChip label={t("ratioDeliveryPayroll")} value={fmtPct(intel.economics.ratios.deliveryPayrollShare)} />
        <RatioChip label={t("ratioIndirectBurden")} value={fmtPct(intel.economics.ratios.indirectBurdenShare)} />
        <RatioChip label={t("ratioOhLoad")} value={fmtPct(intel.economics.ratios.monthlyOhLoadRatio)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">{t("ohCompositionTitle")}</CardTitle>
                <CardDescription>{t("ohCompositionDesc")}</CardDescription>
              </div>
              <InsightBulb label={t("ohCompositionBulbTitle")} description={t("ohCompositionBulbBody")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {compositionTotal > 1e-6 ? (
              <div className="flex h-8 w-full overflow-hidden rounded-md border border-border/60">
                {compositionEntries.map(({ key, value, label }) => {
                  const w = (value / compositionTotal) * 100;
                  if (w < 0.05) return null;
                  return (
                    <div
                      key={key}
                      className={cn("min-w-0 bg-muted", ohBarTone(key))}
                      style={{ width: `${w}%` }}
                      title={`${label}: ${fmtMoney(value)}`}
                    />
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("ohCompositionEmpty")}</p>
            )}
            <table className="w-full text-sm">
              <tbody>
                {compositionEntries.map(({ key, value, label }) => (
                  <tr key={key} className="border-b border-border/40 last:border-0">
                    <td className="py-1.5 text-muted-foreground">{label}</td>
                    <td className="py-1.5 text-end tabular-nums font-medium">{fmtMoney(value)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="border-t border-border/50 pt-3 text-sm">
              <MetricRow
                label={t("burdenOhToDelivery")}
                value={fmtNum(intel.oh.burden.ohToDeliveryPayroll, 2)}
              />
              <MetricRow label={t("burdenOhToTotal")} value={fmtNum(intel.oh.burden.ohToTotalPayroll, 2)} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card/50">
          <CardHeader>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="space-y-1">
                <CardTitle className="text-base">{t("ohScenarioTitle")}</CardTitle>
                <CardDescription>{t("ohScenarioDesc")}</CardDescription>
              </div>
              <InsightBulb label={t("ohScenarioBulbTitle")} description={t("ohScenarioBulbBody")} />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs">{t("scenarioBuLabel")}</Label>
              <Select value={scenarioBuId} onValueChange={setScenarioBuId}>
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {businessUnits
                    .filter((b) => b.isActive !== false)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <ScenarioSlider
              label={t("scenarioUtilDelta")}
              hint={t("scenarioUtilDeltaHint")}
              min={-25}
              max={15}
              value={utilDelta}
              onChange={setUtilDelta}
              display={fmtNum(utilDelta, 0)}
            />
            <ScenarioSlider
              label={t("scenarioOverheadDelta")}
              hint={t("scenarioOverheadDeltaHint")}
              min={-20}
              max={40}
              value={overheadDeltaPct}
              onChange={setOverheadDeltaPct}
              display={`${fmtNum(overheadDeltaPct, 0)}%`}
            />
            <ScenarioSlider
              label={t("scenarioDeliveryDelta")}
              hint={t("scenarioDeliveryDeltaHint")}
              min={-35}
              max={25}
              value={deliveryDeltaPct}
              onChange={setDeliveryDeltaPct}
              display={`${fmtNum(deliveryDeltaPct, 0)}%`}
            />
            <ScenarioSlider
              label={t("scenarioRentDelta")}
              hint={t("scenarioRentDeltaHint")}
              min={0}
              max={40}
              value={rentDeltaPct}
              onChange={setRentDeltaPct}
              display={`${fmtNum(rentDeltaPct, 0)}%`}
            />
            {scenarioOh ? (
              <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="text-muted-foreground">{t("scenarioRateLabel")}</span>
                  <span className="text-lg font-semibold tabular-nums">
                    {fmtMoneyFine(scenarioOh.ohRatePerHour)} / hr
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t("scenarioBaseline", { rate: fmtMoneyFine(scenarioOh.baselineRate) })}
                </p>
                {scenarioOh.deltaPct != null ? (
                  <p className="mt-2 font-medium tabular-nums text-foreground">
                    {t("scenarioDeltaPct", { pct: fmtNum(scenarioOh.deltaPct, 1) })}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("scenarioNoBu")}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="space-y-1">
              <CardTitle className="text-base">{t("capacityTitle")}</CardTitle>
              <CardDescription>{t("capacityDesc")}</CardDescription>
            </div>
            <InsightBulb label={t("capacityBulbTitle")} description={t("capacityBulbBody")} />
          </div>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
          <MetricBlock
            label={t("capBillableHrsMo")}
            value={fmtNum(intel.capacity.totalDeliveryBillableHoursPerMonth, 0)}
          />
          <MetricBlock
            label={t("capTheoreticalHrsMo")}
            value={fmtNum(intel.capacity.theoreticalBillableHoursPerMonthAtFullUtil, 0)}
          />
          <MetricBlock label={t("capLostHrsMo")} value={fmtNum(intel.capacity.lostHoursPerMonthVsFullUtil, 0)} />
          <MetricBlock
            label={t("capUtilStored")}
            value={`${fmtNum(intel.capacity.utilizationRatePct, 1)}%`}
          />
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">{t("benchmarkTitle")}</CardTitle>
          <CardDescription>
            {t("benchmarkDesc")}
            {scopeBuId !== "all" ? (
              <span className="mt-1 block text-muted-foreground/90">{t("benchmarkOrgWideNote")}</span>
            ) : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-sm">
            <thead>
              <tr className="border-b border-border text-start text-xs font-medium text-muted-foreground">
                <th className="py-2 pe-2">
                  <SortBtn label={t("benchColBu")} active={benchSort.key === "name"} onClick={() => toggleBenchSort("name")} />
                </th>
                <th className="py-2 pe-2 text-end">
                  <SortBtn
                    label={t("benchColOhRate")}
                    active={benchSort.key === "ohRatePerHour"}
                    onClick={() => toggleBenchSort("ohRatePerHour")}
                  />
                </th>
                <th className="py-2 pe-2 text-end">
                  <SortBtn
                    label={t("benchColMonthlyCost")}
                    active={benchSort.key === "monthlyWorkforceCost"}
                    onClick={() => toggleBenchSort("monthlyWorkforceCost")}
                  />
                </th>
                <th className="py-2 pe-2 text-end">
                  <SortBtn
                    label={t("benchColDeliveryRatio")}
                    active={benchSort.key === "deliveryRatio"}
                    onClick={() => toggleBenchSort("deliveryRatio")}
                  />
                </th>
                <th className="py-2 pe-2 text-end">
                  <SortBtn
                    label={t("benchColIndirect")}
                    active={benchSort.key === "indirectBurdenPct"}
                    onClick={() => toggleBenchSort("indirectBurdenPct")}
                  />
                </th>
                <th className="py-2 pe-2 text-end">
                  <SortBtn
                    label={t("benchColLoadedHr")}
                    active={benchSort.key === "avgLoadedHourly"}
                    onClick={() => toggleBenchSort("avgLoadedHourly")}
                  />
                </th>
                <th className="py-2 text-end">
                  <SortBtn
                    label={t("benchColBillHrsMo")}
                    active={benchSort.key === "monthlyBillableHours"}
                    onClick={() => toggleBenchSort("monthlyBillableHours")}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedBenchmark.map((row) => (
                <tr key={row.businessUnitId} className="border-b border-border/40">
                  <td className="py-2 pe-2 font-medium">{row.name}</td>
                  <td className="py-2 pe-2 text-end tabular-nums">{fmtMoneyFine(row.ohRatePerHour)}</td>
                  <td className="py-2 pe-2 text-end tabular-nums">{fmtMoney(row.monthlyWorkforceCost)}</td>
                  <td className="py-2 pe-2 text-end tabular-nums">{fmtPct(row.deliveryRatio)}</td>
                  <td className="py-2 pe-2 text-end tabular-nums">{fmtNum(row.indirectBurdenPct, 1)}%</td>
                  <td className="py-2 pe-2 text-end tabular-nums">{fmtMoneyFine(row.avgLoadedHourly)}</td>
                  <td className="py-2 text-end tabular-nums">{fmtNum(row.monthlyBillableHours, 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sortedBenchmark.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">{t("benchmarkEmpty")}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50">
        <CardHeader>
          <CardTitle className="text-base">{t("segmentsTitle")}</CardTitle>
          <CardDescription>{t("segmentsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            {intel.roleSegments.map((seg) => (
              <div
                key={seg.segment}
                className="rounded-lg border border-border/60 bg-muted/15 p-4 text-sm shadow-sm"
              >
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {t(`segment_${seg.segment}`)}
                </div>
                <div className="mt-2 text-2xl font-semibold tabular-nums">{fmtNum(seg.headcount, 0)}</div>
                <div className="text-muted-foreground">{t("segmentHeadcount")}</div>
                <div className="mt-3 text-lg font-medium tabular-nums">{fmtMoney(seg.monthlyPayroll)}</div>
                <div className="text-muted-foreground">{t("segmentPayrollMo")}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ohBarTone(key: keyof OhCompositionMonthly): string {
  switch (key) {
    case "indirectWorkforce":
      return "bg-sky-500/80";
    case "rent":
      return "bg-violet-500/80";
    case "software":
      return "bg-emerald-500/80";
    case "legal":
      return "bg-amber-500/80";
    case "utilities":
      return "bg-cyan-500/80";
    case "infrastructure":
      return "bg-rose-500/80";
    case "miscellaneous":
      return "bg-slate-400/80";
    case "additionalOverheadBucket":
      return "bg-muted-foreground/50";
    default:
      return "bg-muted-foreground/50";
  }
}

function ExecKpi({
  title,
  value,
  hint,
  trendSlot,
}: {
  title: string;
  value: string;
  hint: string;
  trendSlot?: ReactNode;
}) {
  return (
    <Card className="border-border/60 bg-gradient-to-br from-card to-muted/20">
      <CardHeader className="space-y-2 pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardDescription className="min-w-0 flex-1 leading-snug">{title}</CardDescription>
          <InsightBulb label={title} description={hint} wide className="shrink-0" />
        </div>
        <CardTitle className="text-2xl tabular-nums leading-none">{value}</CardTitle>
        {trendSlot}
      </CardHeader>
    </Card>
  );
}

function AlertBanner({
  alert,
  t,
}: {
  alert: WorkforceAlert;
  t: (key: string) => string;
}) {
  const isWarn = alert.severity === "warning";
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3 text-sm shadow-sm",
        isWarn
          ? "border-amber-500/40 bg-amber-500/5 text-foreground"
          : "border-sky-500/35 bg-sky-500/5 text-foreground"
      )}
    >
      <div className="font-medium">{t(alert.titleKey)}</div>
      <p className="mt-1 text-muted-foreground">{t(alert.bodyKey)}</p>
    </div>
  );
}

function CountList({
  title,
  rows,
  fmtName,
}: {
  title: string;
  rows: { id: string; name: string; count: number }[];
  fmtName?: (id: string) => string | undefined;
}) {
  return (
    <div className="min-w-0">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</div>
      <ul className="max-h-[13rem] space-y-1 overflow-y-auto overscroll-contain rounded-md border border-border/40 bg-muted/15 px-2 py-2 text-sm [scrollbar-width:thin] sm:max-h-[17rem]">
        {rows.slice(0, 14).map((r) => {
          const label = fmtName?.(r.id) ?? r.name;
          return (
            <li key={r.id} className="flex justify-between gap-2 border-b border-border/30 py-1 last:border-0">
              <span className="min-w-0 truncate text-muted-foreground" title={label}>
                {label}
              </span>
              <span className="shrink-0 tabular-nums font-medium">{r.count}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/35 py-1.5 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function AmountTable({
  rows,
  fmtMoney,
  empty,
}: {
  rows: { id: string; name: string; monthly: number }[];
  fmtMoney: (n: number) => string;
  empty: string;
}) {
  if (!rows.length) return <p className="text-sm text-muted-foreground">{empty}</p>;
  return (
    <table className="w-full text-sm">
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-b border-border/40 last:border-0">
            <td className="py-1.5 pe-2 text-muted-foreground">{r.name}</td>
            <td className="py-1.5 text-end tabular-nums font-medium">{fmtMoney(r.monthly)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function RatioChip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/20 px-3 py-1 text-xs font-medium">
      <span className="text-muted-foreground">{label}</span>
      <span className="tabular-nums text-foreground">{value}</span>
    </span>
  );
}

function ScenarioSlider({
  label,
  hint,
  min,
  max,
  value,
  onChange,
  display,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  value: number;
  onChange: (n: number) => void;
  display: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <Label className="text-xs font-medium">{label}</Label>
        <span className="text-xs tabular-nums text-muted-foreground">{display}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer accent-primary"
        aria-label={label}
      />
      <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p>
    </div>
  );
}

function SortBtn({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1 rounded px-1 py-0.5 text-start hover:bg-muted/60",
        active && "text-foreground"
      )}
    >
      {label}
    </button>
  );
}
