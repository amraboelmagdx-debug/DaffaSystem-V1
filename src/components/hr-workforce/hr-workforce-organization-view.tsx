"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { monthlyWorkingHoursPerEmployee } from "@/lib/hr-workforce/monthly-hours";
import { effectiveOhBillableHeadcount } from "@/lib/hr-workforce/structure-utils";
import { annualAmountNonWorkforceLine } from "@/lib/hr-workforce/oh-numerator";
import { newHrId } from "@/lib/hr-workforce/id";
import type { OhNonWorkforceLine, OhManualSettings } from "@/types/hr-workforce";
import {
  requestHrPlanningSyncDebounced,
  requestHrPlanningSyncNow,
} from "@/lib/platform-economics/request-hr-planning-sync";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

const OH_COMPONENT_CATEGORIES = ["General", "Facilities", "IT", "Professional", "G&A", "Other"] as const;

export function HrWorkforceOrganizationView() {
  const t = useTranslations("hrWorkforce");
  const locale = useLocale();
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);
  const snapshots = useHrWorkforceStore((s) => s.snapshots);
  const importLogs = useHrWorkforceStore((s) => s.importLogs);

  const addBusinessUnit = useHrWorkforceStore((s) => s.addBusinessUnit);
  const updateBusinessUnit = useHrWorkforceStore((s) => s.updateBusinessUnit);
  const addDepartment = useHrWorkforceStore((s) => s.addDepartment);
  const updateDepartment = useHrWorkforceStore((s) => s.updateDepartment);
  const addTeam = useHrWorkforceStore((s) => s.addTeam);
  const updateTeam = useHrWorkforceStore((s) => s.updateTeam);
  const deleteBusinessUnit = useHrWorkforceStore((s) => s.deleteBusinessUnit);
  const deleteDepartment = useHrWorkforceStore((s) => s.deleteDepartment);
  const deleteTeam = useHrWorkforceStore((s) => s.deleteTeam);
  const setHr = useHrWorkforceStore((s) => s.setHrGlobalSettings);
  const setOhForBu = useHrWorkforceStore((s) => s.setOhManualForBusinessUnit);
  const saveSnapshot = useHrWorkforceStore((s) => s.saveSnapshot);
  const restoreSnapshot = useHrWorkforceStore((s) => s.restoreSnapshot);
  const lastSnapshotRestoreError = useHrWorkforceStore((s) => s.lastSnapshotRestoreError);
  const clearSnapshotRestoreError = useHrWorkforceStore((s) => s.clearSnapshotRestoreError);
  const deleteSnapshot = useHrWorkforceStore((s) => s.deleteSnapshot);
  const compareSnapshots = useHrWorkforceStore((s) => s.compareSnapshots);
  const resetModule = useHrWorkforceStore((s) => s.resetModule);
  const deleteImportLog = useHrWorkforceStore((s) => s.deleteImportLog);
  const clearAllImportLogs = useHrWorkforceStore((s) => s.clearAllImportLogs);

  const [buName, setBuName] = useState("");
  const [deptName, setDeptName] = useState("");
  const [deptBuId, setDeptBuId] = useState(() => businessUnits[0]?.id ?? "");
  const [teamName, setTeamName] = useState("");
  const [teamDeptId, setTeamDeptId] = useState(() => departments[0]?.id ?? "");
  const [selectedOhBuId, setSelectedOhBuId] = useState(() => businessUnits[0]?.id ?? "");
  const [snapLabel, setSnapLabel] = useState("Snapshot");
  const [cmpA, setCmpA] = useState("");
  const [cmpB, setCmpB] = useState("");

  useEffect(() => {
    if (businessUnits.length && !businessUnits.some((b) => b.id === deptBuId)) {
      setDeptBuId(businessUnits[0].id);
    }
  }, [businessUnits, deptBuId]);

  useEffect(() => {
    if (departments.length && !departments.some((d) => d.id === teamDeptId)) {
      setTeamDeptId(departments[0].id);
    }
  }, [departments, teamDeptId]);

  useEffect(() => {
    if (businessUnits.length && !businessUnits.some((b) => b.id === selectedOhBuId)) {
      setSelectedOhBuId(businessUnits[0].id);
    }
  }, [businessUnits, selectedOhBuId]);

  const ohManual = useMemo(
    () => ({ ...DEFAULT_OH, ...(ohManualByBusinessUnitId[selectedOhBuId] ?? {}) }),
    [ohManualByBusinessUnitId, selectedOhBuId]
  );

  const setOh = (patch: Partial<OhManualSettings>) => setOhForBu(selectedOhBuId, patch);

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

  const departmentsInSelectedBu = useMemo(
    () => departments.filter((d) => d.businessUnitId === deptBuId),
    [departments, deptBuId]
  );

  const mh = useMemo(() => monthlyWorkingHoursPerEmployee(hrGlobalSettings), [hrGlobalSettings]);
  const derivedFte = useMemo(
    () => effectiveOhBillableHeadcount(roles, ohManual, selectedOhBuId),
    [roles, ohManual, selectedOhBuId]
  );

  const ohSlot =
    model.ohByBusinessUnitId[selectedOhBuId] ??
    model.ohByBusinessUnitId[businessUnits[0]?.id ?? ""] ??
    Object.values(model.ohByBusinessUnitId)[0]!;

  const fmtInt = (n: number) =>
    new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(n));
  const fmtMoneyOh = (n: number) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: hrGlobalSettings.defaultCurrency.length === 3 ? hrGlobalSettings.defaultCurrency : "SAR",
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    }).format(n);
  const cmp = useMemo(() => {
    if (!cmpA || !cmpB) return null;
    return compareSnapshots(cmpA, cmpB);
  }, [cmpA, cmpB, compareSnapshots]);

  useEffect(() => {
    const ids = new Set(snapshots.map((s) => s.meta.id));
    if (cmpA && !ids.has(cmpA)) setCmpA("");
    if (cmpB && !ids.has(cmpB)) setCmpB("");
  }, [snapshots, cmpA, cmpB]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("orgTitle")}</h1>
        <InsightBulb label={t("bulbOrgTitle")} description={t("bulbOrgBody")} />
      </div>
      <p className="text-sm text-muted-foreground">{t("orgSubtitle")}</p>

      <Tabs defaultValue="structure" className="w-full">
        <TabsList>
          <TabsTrigger value="structure">{t("tabStructure")}</TabsTrigger>
          <TabsTrigger value="hrOh">{t("tabHrOh")}</TabsTrigger>
          <TabsTrigger value="snapshots">{t("tabSnapshots")}</TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{t("hierarchyTitle")}</CardTitle>
                <CardDescription className="mt-1">{t("useTeamLevelHint")}</CardDescription>
              </div>
              <InsightBulb label={t("bulbHierarchyTitle")} description={t("bulbHierarchyBody")} />
            </CardHeader>
            <CardContent>
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/50 bg-muted/20 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={hrGlobalSettings.useTeamLevel !== false}
                  onChange={(e) => setHr({ useTeamLevel: e.target.checked })}
                />
                <span className="text-sm">
                  <span className="font-medium text-foreground">{t("useTeamLevel")}</span>
                </span>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{t("secBusinessUnits")}</CardTitle>
                <CardDescription>{t("secBusinessUnitsDesc")}</CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => void requestHrPlanningSyncNow()}
              >
                {t("syncPlanningFromHr")}
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Input value={buName} dir="auto" onChange={(e) => setBuName(e.target.value)} placeholder={t("buNamePh")} className="max-w-xs" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    addBusinessUnit({ name: buName });
                    setBuName("");
                    requestHrPlanningSyncDebounced();
                  }}
                >
                  {t("addBU")}
                </Button>
              </div>
              <table className="app-data-table">
                <thead>
                  <tr>
                    <th className="min-w-[10rem]">{t("colName")}</th>
                    <th className="w-28 max-w-[7.5rem]">{t("colCode")}</th>
                    <th className="w-24">{t("colActive")}</th>
                    <th className="text-end w-14">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {businessUnits.map((u) => (
                    <tr key={u.id}>
                      <td>
                        <Input
                          className="h-8"
                          dir="auto"
                          value={u.name}
                          onChange={(e) => updateBusinessUnit(u.id, { name: e.target.value })}
                        />
                      </td>
                      <td>
                        <Input
                          className="h-8 w-full max-w-[7rem]"
                          value={u.code ?? ""}
                          onChange={(e) => updateBusinessUnit(u.id, { code: e.target.value })}
                        />
                      </td>
                      <td>
                        <div className="flex h-8 items-center">
                          <input
                            type="checkbox"
                            checked={u.isActive}
                            onChange={(e) => {
                              updateBusinessUnit(u.id, { isActive: e.target.checked });
                              requestHrPlanningSyncDebounced();
                            }}
                          />
                        </div>
                      </td>
                      <td className="text-end">
                        <div className="flex h-8 items-center justify-end">
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            disabled={businessUnits.length <= 1}
                            title={businessUnits.length <= 1 ? t("cannotDeleteLastBU") : t("delete")}
                            aria-label={t("delete")}
                            onClick={() => {
                              if (businessUnits.length <= 1) return;
                              if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteBU"))) {
                                deleteBusinessUnit(u.id);
                                requestHrPlanningSyncDebounced();
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("secDepartments")}</CardTitle>
              <CardDescription>{t("deptTableBuFilterDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Select value={deptBuId} onValueChange={setDeptBuId}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input value={deptName} dir="auto" onChange={(e) => setDeptName(e.target.value)} placeholder={t("deptNamePh")} />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    addDepartment(deptBuId, deptName);
                    setDeptName("");
                    requestHrPlanningSyncDebounced();
                  }}
                >
                  {t("newDept")}
                </Button>
              </div>
              <table className="app-data-table">
                <thead>
                  <tr>
                    <th className="min-w-[8rem]">{t("colBU")}</th>
                    <th className="min-w-[10rem]">{t("colName")}</th>
                    <th className="w-24">{t("colActive")}</th>
                    <th className="w-14 text-end">{t("colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {departmentsInSelectedBu.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                        {t("deptTableEmptyForBu")}
                      </td>
                    </tr>
                  ) : (
                    departmentsInSelectedBu.map((d) => (
                      <tr key={d.id}>
                        <td className="text-muted-foreground">
                          {businessUnits.find((b) => b.id === d.businessUnitId)?.name ?? "—"}
                        </td>
                        <td>
                          <Input className="h-8" dir="auto" value={d.name} onChange={(e) => updateDepartment(d.id, { name: e.target.value })} />
                        </td>
                        <td>
                          <div className="flex h-8 items-center">
                            <input
                              type="checkbox"
                              checked={d.isActive}
                              onChange={(e) => updateDepartment(d.id, { isActive: e.target.checked })}
                            />
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="flex h-8 items-center justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              disabled={departments.length <= 1}
                              title={departments.length <= 1 ? t("cannotDeleteLastDept") : t("delete")}
                              aria-label={t("delete")}
                              onClick={() => {
                                if (departments.length <= 1) return;
                                if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteDept"))) {
                                  deleteDepartment(d.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {hrGlobalSettings.useTeamLevel !== false && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("secTeams")}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Select value={teamDeptId} onValueChange={setTeamDeptId}>
                    <SelectTrigger className="w-[220px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input value={teamName} dir="auto" onChange={(e) => setTeamName(e.target.value)} placeholder={t("teamNamePh")} />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      addTeam(teamDeptId, teamName);
                      setTeamName("");
                    }}
                  >
                    {t("newTeam")}
                  </Button>
                </div>
                <table className="app-data-table">
                  <thead>
                    <tr>
                      <th className="min-w-[8rem]">{t("colDept")}</th>
                      <th className="min-w-[10rem]">{t("colName")}</th>
                      <th className="w-24">{t("colActive")}</th>
                      <th className="w-14 text-end">{t("colActions")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teams.map((tm) => (
                      <tr key={tm.id}>
                        <td className="text-muted-foreground">
                          {departments.find((d) => d.id === tm.departmentId)?.name ?? "—"}
                        </td>
                        <td>
                          <Input className="h-8" dir="auto" value={tm.name} onChange={(e) => updateTeam(tm.id, { name: e.target.value })} />
                        </td>
                        <td>
                          <div className="flex h-8 items-center">
                            <input
                              type="checkbox"
                              checked={tm.isActive}
                              onChange={(e) => updateTeam(tm.id, { isActive: e.target.checked })}
                            />
                          </div>
                        </td>
                        <td className="text-end">
                          <div className="flex h-8 items-center justify-end">
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              title={t("delete")}
                              aria-label={t("delete")}
                              onClick={() => {
                                if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteTeam"))) {
                                  deleteTeam(tm.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("structureStats")}</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                {t("statActiveRoles")}: {roles.filter((r) => !r.archived).length}
              </div>
              <div>
                {t("statHeadcount")}: {roles.filter((r) => !r.archived).reduce((s, r) => s + r.employeeCount, 0)}
              </div>
              <div>
                {t("statMonthlyOp")}: {model.dashboard.monthlyWorkforceCost.toFixed(0)} {hrGlobalSettings.defaultCurrency}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="hrOh" className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center gap-2">
            <InsightBulb label={t("bulbOhFteTitle")} description={t("bulbOhFteBody")} />
            <InsightBulb label={t("bulbBillableCountUiTitle")} description={t("bulbBillableCountUiBody")} />
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("secHrGlobal")}</CardTitle>
                <CardDescription>
                  {t("derivedMonthlyHours")}: {mh.toFixed(2)}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <Num label={t("workingDaysPerWeek")} v={hrGlobalSettings.workingDaysPerWeek} on={(n) => setHr({ workingDaysPerWeek: n })} />
                <Num label={t("workingHoursPerDay")} v={hrGlobalSettings.workingHoursPerDay} on={(n) => setHr({ workingHoursPerDay: n })} />
                <Num label={t("weeksPerYear")} v={hrGlobalSettings.weeksPerYear} on={(n) => setHr({ weeksPerYear: n })} />
                <Num label={t("offDaysPerYear")} v={hrGlobalSettings.offDaysPerYear} on={(n) => setHr({ offDaysPerYear: n })} />
                <div className="space-y-1">
                  <Label>{t("defaultCurrency")}</Label>
                  <Input
                    value={hrGlobalSettings.defaultCurrency}
                    onChange={(e) => setHr({ defaultCurrency: e.target.value.slice(0, 3).toUpperCase() })}
                    maxLength={3}
                  />
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t("secOhManual")}</CardTitle>
                <CardDescription>
                  OH {ohSlot.oh.ohRatePerHour.toFixed(2)} · {t("billableHoursYr")}:{" "}
                  {Math.round(ohSlot.oh.totalBillableHoursPerYear)}
                  {ohSlot.ohNumerator.composed ? (
                    <>
                      {" "}
                      · {t("ohNumeratorShort", { n: Math.round(ohSlot.ohNumerator.totalNumerator) })}
                    </>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>{t("ohSettingsBusinessUnit")}</Label>
                  <Select value={selectedOhBuId} onValueChange={setSelectedOhBuId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {businessUnits.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("ohSettingsBusinessUnitHint")}</p>
                </div>
                <div className="space-y-2">
                  <Label>{t("ohBillableSource")}</Label>
                  <Select
                    value={ohManual.billableFteSource ?? "manual"}
                    onValueChange={(v) => setOh({ billableFteSource: v as "manual" | "from_roles" })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="manual">{t("ohFteManual")}</SelectItem>
                      <SelectItem value="from_roles">{t("ohFteFromRoles")}</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t("ohFteDerivedHint", { n: derivedFte })}</p>
                </div>
                <Num label={t("utilizationRatePct")} v={ohManual.utilizationRatePct} on={(n) => setOh({ utilizationRatePct: n })} />
                <p className="text-xs text-muted-foreground">{t("utilizationRatePctHint")}</p>
                <Num
                  label={t("billableEmployeeCount")}
                  v={ohManual.billableFteSource === "from_roles" ? derivedFte : ohManual.billableEmployeeCount}
                  on={(n) => setOh({ billableEmployeeCount: n })}
                  disabled={ohManual.billableFteSource === "from_roles"}
                />
                <div className="space-y-1 sm:col-span-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Label>{t("totalAnnualOverhead")}</Label>
                    <InsightBulb label={t("bulbTotalOhTitle")} description={t("bulbTotalOhBody")} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {ohManual.useComposedAnnualOh ? t("totalAnnualOverheadComposedHint") : t("totalAnnualOverheadLegacyHint")}
                  </p>
                  <Input
                    type="number"
                    value={ohManual.totalAnnualOverhead}
                    onChange={(e) => setOh({ totalAnnualOverhead: Number(e.target.value) || 0 })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="overflow-hidden border-primary/25 bg-gradient-to-br from-card via-card to-primary/[0.06] shadow-sm">
            <CardHeader className="border-b border-border/50 pb-4">
              <CardTitle className="text-base">{t("secOhCalculationTitle")}</CardTitle>
              <CardDescription className="text-pretty">{t("secOhCalculationDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="grid gap-8 lg:grid-cols-3 lg:items-stretch">
                <div className="order-1 flex flex-col justify-center rounded-2xl border-2 border-primary/35 bg-gradient-to-b from-primary/12 to-primary/5 p-6 text-center shadow-inner ring-1 ring-inset ring-primary/10 lg:order-2">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-primary">
                    {t("ohCalcOhRateLabel")}
                  </p>
                  <p className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                    <span className="tabular-nums">{fmtMoneyOh(ohSlot.oh.ohRatePerHour)}</span>
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">{t("ohCalcPerHr")}</p>
                </div>
                <dl className="order-2 space-y-4 lg:order-1 lg:col-span-2">
                  <div className="rounded-lg border border-border/60 bg-background/60 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("ohCalcTotalHours")}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {fmtInt(ohSlot.oh.totalAnnualHoursPerEmployee)}
                    </dd>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("ohCalcPerEmployeeYr")}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/60 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("ohCalcOffHours")}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {fmtInt(ohSlot.oh.offHoursPerEmployeeYear)}
                    </dd>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("ohCalcPerEmployeeYr")}</p>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-background/60 px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {t("ohCalcNetHours")}
                    </dt>
                    <dd className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                      {fmtInt(ohSlot.oh.netAvailableHoursPerEmployeeYear)}
                    </dd>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("ohCalcPerEmployeeYr")}</p>
                  </div>
                  <div className="rounded-lg border border-primary/20 bg-primary/[0.07] px-4 py-3">
                    <dt className="text-xs font-medium uppercase tracking-wide text-primary">
                      {t("ohCalcTotalBillable")}
                    </dt>
                    <dd className="mt-1 text-xl font-bold tabular-nums text-foreground">
                      {fmtInt(ohSlot.oh.totalBillableHoursPerYear)}
                    </dd>
                    <p className="mt-1 text-[11px] text-muted-foreground">{t("ohCalcTotalBillableHint")}</p>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/40 pt-3 text-xs text-muted-foreground">
                      <span>
                        {t("ohCalcEffectiveHeadcount")}:{" "}
                        <span className="font-medium text-foreground">{fmtInt(ohSlot.oh.effectiveBillableEmployeeCount)}</span>
                      </span>
                      <span>
                        {t("ohCalcUtilization")}:{" "}
                        <span className="font-medium text-foreground">{fmtInt(ohManual.utilizationRatePct)}%</span>
                      </span>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-muted-foreground">{t("ohCalcNumerator")}</span>
                      <span className="font-semibold tabular-nums text-foreground">
                        {fmtMoneyOh(ohSlot.ohNumerator.totalNumerator)}
                      </span>
                    </div>
                  </div>
                </dl>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">{t("secOhComposed")}</CardTitle>
                <CardDescription>{t("secOhComposedDesc")}</CardDescription>
              </div>
              <InsightBulb wide label={t("bulbComposedOhTitle")} description={t("bulbComposedOhBody")} />
            </CardHeader>
            <CardContent className="space-y-4">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border/50 bg-muted/20 p-3">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={ohManual.useComposedAnnualOh === true}
                  onChange={(e) => setOh({ useComposedAnnualOh: e.target.checked })}
                />
                <span className="text-sm font-medium text-foreground">{t("useComposedAnnualOh")}</span>
              </label>

              {ohSlot.ohNumerator.composed ? (
                <div className="grid gap-2 rounded-md border border-border/40 bg-muted/15 p-3 text-sm sm:grid-cols-2">
                  <div>
                    {t("ohComposedIndirect")}: {Math.round(ohSlot.ohNumerator.indirectWorkforceAnnualStd)}
                  </div>
                  <div>
                    {t("ohComposedLines")}: {Math.round(ohSlot.ohNumerator.nonWorkforceLinesAnnual)}
                  </div>
                  <div>
                    {t("ohComposedAdditional")}: {Math.round(ohSlot.ohNumerator.additionalAnnualOverhead)}
                  </div>
                  <div className="font-medium sm:col-span-2">
                    {t("ohComposedTotal")}: {Math.round(ohSlot.ohNumerator.totalNumerator)}
                  </div>
                </div>
              ) : null}

              {ohManual.useComposedAnnualOh === true ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Label className="text-base">{t("ohNonWorkforceLinesTitle")}</Label>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        const prev = ohManual.ohNonWorkforceLines ?? [];
                        const row: OhNonWorkforceLine = {
                          id: newHrId("ohline"),
                          name: "",
                          amount: 0,
                          recurring: "monthly",
                          active: true,
                          category: "General",
                        };
                        setOh({ ohNonWorkforceLines: [...prev, row] });
                      }}
                    >
                      {t("addOhLine")}
                    </Button>
                  </div>
                  <div className="overflow-x-auto rounded-md border border-border/40">
                    {(ohManual.ohNonWorkforceLines ?? []).length === 0 ? (
                      <p className="p-3 text-sm text-muted-foreground">{t("ohLinesEmpty")}</p>
                    ) : (
                      <table className="app-data-table min-w-[780px]">
                        <thead>
                          <tr>
                            <th className="w-12">{t("ohLineColActive")}</th>
                            <th className="min-w-[8rem]">{t("ohLineColName")}</th>
                            <th className="w-36">{t("ohLineColCategory")}</th>
                            <th className="w-28">{t("ohLineColAmount")}</th>
                            <th className="w-36">{t("ohLineColRecurring")}</th>
                            <th className="w-28 text-end tabular-nums">{t("ohLineColAnnual")}</th>
                            <th className="min-w-[6rem]">{t("ohLineColNotes")}</th>
                            <th className="w-14 text-end" aria-label={t("colActions")} />
                          </tr>
                        </thead>
                        <tbody>
                          {(ohManual.ohNonWorkforceLines ?? []).map((line) => (
                            <tr key={line.id}>
                              <td>
                                <div className="flex h-8 items-center">
                                  <input
                                    type="checkbox"
                                    checked={line.active}
                                    onChange={(e) => {
                                      const prev = ohManual.ohNonWorkforceLines ?? [];
                                      setOh({
                                        ohNonWorkforceLines: prev.map((l) =>
                                          l.id === line.id ? { ...l, active: e.target.checked } : l
                                        ),
                                      });
                                    }}
                                  />
                                </div>
                              </td>
                              <td>
                                <Input
                                  className="h-8"
                                  value={line.name}
                                  onChange={(e) => {
                                    const prev = ohManual.ohNonWorkforceLines ?? [];
                                    setOh({
                                      ohNonWorkforceLines: prev.map((l) =>
                                        l.id === line.id ? { ...l, name: e.target.value } : l
                                      ),
                                    });
                                  }}
                                />
                              </td>
                              <td>
                                <Select
                                  value={line.category ?? "General"}
                                  onValueChange={(v) => {
                                    const prev = ohManual.ohNonWorkforceLines ?? [];
                                    setOh({
                                      ohNonWorkforceLines: prev.map((l) =>
                                        l.id === line.id ? { ...l, category: v } : l
                                      ),
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {OH_COMPONENT_CATEGORIES.map((c) => (
                                      <SelectItem key={c} value={c}>
                                        {c}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td>
                                <Input
                                  className="h-8"
                                  type="number"
                                  value={line.amount}
                                  onChange={(e) => {
                                    const prev = ohManual.ohNonWorkforceLines ?? [];
                                    setOh({
                                      ohNonWorkforceLines: prev.map((l) =>
                                        l.id === line.id ? { ...l, amount: Number(e.target.value) || 0 } : l
                                      ),
                                    });
                                  }}
                                />
                              </td>
                              <td>
                                <Select
                                  value={line.recurring}
                                  onValueChange={(v) => {
                                    const prev = ohManual.ohNonWorkforceLines ?? [];
                                    setOh({
                                      ohNonWorkforceLines: prev.map((l) =>
                                        l.id === line.id ? { ...l, recurring: v as OhNonWorkforceLine["recurring"] } : l
                                      ),
                                    });
                                  }}
                                >
                                  <SelectTrigger className="h-8">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="monthly">{t("ohLineRecurringMonthly")}</SelectItem>
                                    <SelectItem value="yearly">{t("ohLineRecurringYearly")}</SelectItem>
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="text-end tabular-nums text-muted-foreground">
                                {Math.round(annualAmountNonWorkforceLine(line))}
                              </td>
                              <td>
                                <Input
                                  className="h-8"
                                  value={line.notes ?? ""}
                                  onChange={(e) => {
                                    const prev = ohManual.ohNonWorkforceLines ?? [];
                                    setOh({
                                      ohNonWorkforceLines: prev.map((l) =>
                                        l.id === line.id ? { ...l, notes: e.target.value } : l
                                      ),
                                    });
                                  }}
                                />
                              </td>
                              <td className="text-end">
                                <div className="flex h-8 items-center justify-end">
                                  <Button
                                    type="button"
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 text-destructive hover:text-destructive"
                                    title={t("delete")}
                                    aria-label={t("delete")}
                                    onClick={() => {
                                      const prev = ohManual.ohNonWorkforceLines ?? [];
                                      setOh({ ohNonWorkforceLines: prev.filter((l) => l.id !== line.id) });
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("saveSnapshot")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Input value={snapLabel} onChange={(e) => setSnapLabel(e.target.value)} className="max-w-xs" />
              <Button type="button" onClick={() => saveSnapshot(snapLabel)}>
                {t("saveSnapshot")}
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("snapshotRestore")}</CardTitle>
              <CardDescription>{t("snapshotRestoreDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {lastSnapshotRestoreError ? (
                <div
                  role="alert"
                  className="relative rounded-md border border-destructive/50 bg-destructive/10 p-3 pr-24 text-sm text-destructive"
                >
                  <div className="font-medium">{t("snapshotRestoreFailedTitle")}</div>
                  <p className="mt-1 break-words opacity-90">{lastSnapshotRestoreError}</p>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="absolute right-2 top-2 h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => clearSnapshotRestoreError()}
                  >
                    {t("snapshotRestoreDismiss")}
                  </Button>
                </div>
              ) : null}
              {snapshots.map((s) => (
                <div key={s.meta.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 py-2 text-sm">
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{s.meta.label}</div>
                    <div className="text-muted-foreground">{new Date(s.meta.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("snapshotRestoreConfirm"))) {
                          restoreSnapshot(s.meta.id);
                        }
                      }}
                    >
                      {t("restore")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      title={t("delete")}
                      aria-label={t("delete")}
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteSnapshot"))) {
                          deleteSnapshot(s.meta.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {snapshots.length === 0 && <p className="text-sm text-muted-foreground">{t("emptySnapshots")}</p>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("snapshotCompare")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 md:flex-row md:items-end">
              <div className="space-y-1">
                <Label>A</Label>
                <Select value={cmpA} onValueChange={setCmpA}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s) => (
                      <SelectItem key={s.meta.id} value={s.meta.id}>
                        {s.meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>B</Label>
                <Select value={cmpB} onValueChange={setCmpB}>
                  <SelectTrigger className="w-[220px]">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {snapshots.map((s) => (
                      <SelectItem key={`b-${s.meta.id}`} value={s.meta.id}>
                        {s.meta.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            {cmp && (
              <CardContent className="border-t pt-3 text-sm">
                <p>
                  {t("cmpSummary", {
                    a: cmp.aLabel,
                    b: cmp.bLabel,
                    roles: cmp.rolesDelta,
                    headcount: cmp.headcountDelta,
                    cost: (cmp.monthlyCostDeltaApprox ?? 0).toFixed(0),
                  })}
                </p>
              </CardContent>
            )}
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("importLog")}</CardTitle>
            </CardHeader>
            <CardContent>
              {importLogs.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t("logsEmpty")}</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmClearImportLogs"))) {
                          clearAllImportLogs();
                        }
                      }}
                    >
                      {t("clearImportLogs")}
                    </Button>
                  </div>
                  <ul className="max-h-60 overflow-y-auto text-sm">
                    {importLogs.map((l) => (
                      <li key={l.id} className="flex items-center justify-between gap-2 border-b py-2">
                        <span className="min-w-0 break-words">
                          {l.fileName} — {l.status} ({l.rowCount})
                        </span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                          title={t("delete")}
                          aria-label={t("delete")}
                          onClick={() => {
                            if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteImportLog"))) {
                              deleteImportLog(l.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
          <Button type="button" variant="outline" className="border-destructive/40 text-destructive" onClick={() => resetModule()}>
            {t("resetModule")}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Num({
  label,
  v,
  on,
  disabled,
}: {
  label: string;
  v: number;
  on: (n: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      <Input type="number" disabled={disabled} value={v} onChange={(e) => on(Number(e.target.value) || 0)} />
    </div>
  );
}
