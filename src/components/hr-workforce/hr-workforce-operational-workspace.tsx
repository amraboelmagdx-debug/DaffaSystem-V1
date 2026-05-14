"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { ChevronDown, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HrRoleCompensationDialog } from "@/components/hr-workforce/hr-role-compensation-dialog";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import {
  effectiveOperationalRoleType,
  patchOperationalRoleType,
} from "@/lib/hr-workforce/role-operational-type";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import type { EmploymentType, JobRole, OperationalRoleType } from "@/types/hr-workforce";
import { cn } from "@/lib/utils";

export function HrWorkforceOperationalWorkspace() {
  const t = useTranslations("hrWorkforce");
  const locale = useLocale();

  const fmtMoney = (n: number, currency: string) =>
    new Intl.NumberFormat(locale, {
      style: "currency",
      currency: currency.length === 3 ? currency : "SAR",
      maximumFractionDigits: 0,
    }).format(n);

  const employmentLabel = (et: EmploymentType) =>
    t(`emp_${et}` as "emp_full_time" | "emp_part_time" | "emp_contractor" | "emp_freelancer");
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const departments = useHrWorkforceStore((s) => s.departments);
  const teams = useHrWorkforceStore((s) => s.teams);
  const roles = useHrWorkforceStore((s) => s.roles);
  const hrGlobalSettings = useHrWorkforceStore((s) => s.hrGlobalSettings);
  const ohManualByBusinessUnitId = useHrWorkforceStore((s) => s.ohManualByBusinessUnitId);
  const addRole = useHrWorkforceStore((s) => s.addRole);
  const updateRole = useHrWorkforceStore((s) => s.updateRole);
  const duplicateRole = useHrWorkforceStore((s) => s.duplicateRole);
  const archiveRole = useHrWorkforceStore((s) => s.archiveRole);
  const deleteRole = useHrWorkforceStore((s) => s.deleteRole);
  const bulkDeleteRoles = useHrWorkforceStore((s) => s.bulkDeleteRoles);
  const bulkPatchRoles = useHrWorkforceStore((s) => s.bulkPatchRoles);

  const [q, setQ] = useState("");
  const [buFilter, setBuFilter] = useState<string>("all");
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [teamFilter, setTeamFilter] = useState<string>("all");
  const [showArchived, setShowArchived] = useState(false);
  const [openBu, setOpenBu] = useState<Set<string>>(() => new Set(businessUnits.map((b) => b.id)));
  const [openDept, setOpenDept] = useState<Set<string>>(() => new Set(departments.map((d) => d.id)));
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const model = useMemo(
    () =>
      deriveHrWorkforceModel({
        roles,
        businessUnits,
        departments,
        teams,
        hrGlobalSettings,
        ohManualByBusinessUnitId,
      }),
    [roles, businessUnits, departments, teams, hrGlobalSettings, ohManualByBusinessUnitId]
  );

  const currency = hrGlobalSettings.defaultCurrency;
  const useTeamLevel = hrGlobalSettings.useTeamLevel !== false;

  useEffect(() => {
    if (!useTeamLevel) setTeamFilter("all");
  }, [useTeamLevel]);

  const filtered = useMemo(() => {
    return roles.filter((r) => {
      if (!showArchived && r.archived) return false;
      if (buFilter !== "all" && r.businessUnitId !== buFilter) return false;
      if (deptFilter !== "all" && r.departmentId !== deptFilter) return false;
      if (useTeamLevel) {
        if (teamFilter === "__none__" && r.teamId) return false;
        if (teamFilter !== "all" && teamFilter !== "__none__" && r.teamId !== teamFilter) return false;
      }
      if (q.trim() && !r.name.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [roles, buFilter, deptFilter, teamFilter, showArchived, q, useTeamLevel]);

  const summary = useMemo(() => {
    const active = roles.filter((r) => !r.archived);
    const headcount = active.reduce((s, r) => s + Math.max(0, r.employeeCount), 0);
    const deliveryHc = active
      .filter((r) => effectiveOperationalRoleType(r) === "delivery")
      .reduce((s, r) => s + Math.max(0, r.employeeCount), 0);
    const indirectHc = Math.max(0, headcount - deliveryHc);
    return {
      roles: active.length,
      headcount,
      deliveryHc,
      indirectHc,
      activeDepts: departments.filter((d) => d.isActive).length,
      activeTeams: teams.filter((tm) => tm.isActive).length,
    };
  }, [roles, departments, teams]);

  const groups = useMemo(() => {
    const map = new Map<
      string,
      { buId: string; deptId: string; teamId: string | null; roles: JobRole[]; headcount: number }
    >();
    for (const r of filtered) {
      const key = useTeamLevel
        ? `${r.businessUnitId}::${r.departmentId}::${r.teamId ?? "__none__"}`
        : `${r.businessUnitId}::${r.departmentId}`;
      const g = map.get(key) ?? {
        buId: r.businessUnitId,
        deptId: r.departmentId,
        teamId: useTeamLevel ? r.teamId ?? null : null,
        roles: [],
        headcount: 0,
      };
      g.roles.push(r);
      g.headcount += Math.max(0, r.employeeCount);
      map.set(key, g);
    }
    return [...map.values()].sort((a, b) => {
      const buA = businessUnits.find((x) => x.id === a.buId)?.name ?? "";
      const buB = businessUnits.find((x) => x.id === b.buId)?.name ?? "";
      if (buA !== buB) return buA.localeCompare(buB);
      const dA = departments.find((x) => x.id === a.deptId)?.name ?? "";
      const dB = departments.find((x) => x.id === b.deptId)?.name ?? "";
      if (dA !== dB) return dA.localeCompare(dB);
      if (!useTeamLevel) return 0;
      const tA = a.teamId ? teams.find((x) => x.id === a.teamId)?.name ?? "" : "";
      const tB = b.teamId ? teams.find((x) => x.id === b.teamId)?.name ?? "" : "";
      return tA.localeCompare(tB);
    });
  }, [filtered, businessUnits, departments, teams, useTeamLevel]);

  const deptOptions = useMemo(() => {
    if (buFilter === "all") return departments;
    return departments.filter((d) => d.businessUnitId === buFilter);
  }, [departments, buFilter]);

  const teamOptions = useMemo(() => {
    if (deptFilter === "all") return teams;
    return teams.filter((tm) => tm.departmentId === deptFilter);
  }, [teams, deptFilter]);

  const addRolePlacement = useMemo(() => {
    const teamIdFromFilter = (): string | undefined => {
      if (!useTeamLevel) return undefined;
      if (teamFilter === "all" || teamFilter === "__none__") return undefined;
      return teamFilter;
    };

    if (deptFilter !== "all") {
      const d = departments.find((x) => x.id === deptFilter);
      if (!d) return null;
      let tid = teamIdFromFilter();
      if (tid && !teams.some((t) => t.id === tid && t.departmentId === d.id)) tid = undefined;
      return { departmentId: d.id, businessUnitId: d.businessUnitId, teamId: tid };
    }

    if (useTeamLevel && teamFilter !== "all" && teamFilter !== "__none__") {
      const tm = teams.find((t) => t.id === teamFilter);
      if (tm) {
        const d = departments.find((x) => x.id === tm.departmentId);
        if (d) return { departmentId: d.id, businessUnitId: d.businessUnitId, teamId: tm.id };
      }
    }

    if (buFilter !== "all") {
      const list = departments.filter((x) => x.businessUnitId === buFilter);
      const d = list[0];
      if (!d) return null;
      let tid = teamIdFromFilter();
      if (tid && !teams.some((t) => t.id === tid && t.departmentId === d.id)) tid = undefined;
      return { departmentId: d.id, businessUnitId: d.businessUnitId, teamId: tid };
    }

    const d = departments[0];
    if (!d) return null;
    let tid = teamIdFromFilter();
    if (tid && !teams.some((t) => t.id === tid && t.departmentId === d.id)) tid = undefined;
    return { departmentId: d.id, businessUnitId: d.businessUnitId, teamId: tid };
  }, [buFilter, deptFilter, teamFilter, departments, teams, useTeamLevel]);

  const toggleBu = (id: string) => {
    setOpenBu((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleDept = (id: string) => {
    setOpenDept((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };

  const [openCostRoleId, setOpenCostRoleId] = useState<string | null>(null);
  const costEditRole = openCostRoleId ? roles.find((r) => r.id === openCostRoleId) ?? null : null;

  useEffect(() => {
    if (openCostRoleId && !roles.some((r) => r.id === openCostRoleId)) setOpenCostRoleId(null);
  }, [roles, openCostRoleId]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
      <aside className="w-full shrink-0 space-y-3 lg:w-72">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            {t("treeTitle")}
          </h2>
          <InsightBulb label={t("bulbTreeTitle")} description={useTeamLevel ? t("bulbTreeBody") : t("bulbTreeBodyFlat")} />
        </div>
        <Card className="border-border/60 bg-card/50">
          <CardContent className="max-h-[70vh] space-y-1 overflow-y-auto p-2 text-sm">
            {businessUnits.map((bu) => {
              const depts = departments.filter((d) => d.businessUnitId === bu.id);
              const buOpen = openBu.has(bu.id);
              const buHc = roles
                .filter((r) => r.businessUnitId === bu.id && !r.archived)
                .reduce((s, r) => s + r.employeeCount, 0);
              const buRc = roles.filter((r) => r.businessUnitId === bu.id && !r.archived).length;
              return (
                <div key={bu.id} className="rounded-md border border-border/40">
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-1 px-2 py-1.5 text-start font-medium rounded-t-md",
                      !bu.isActive && "text-muted-foreground line-through opacity-70",
                      buFilter === bu.id && "bg-primary/5 ring-1 ring-inset ring-primary/20"
                    )}
                    onClick={() => toggleBu(bu.id)}
                  >
                    {buOpen ? (
                      <ChevronDown className="h-4 w-4 shrink-0" />
                    ) : (
                      <ChevronRight className="h-4 w-4 shrink-0 rtl:rotate-180" />
                    )}
                    <span className="flex-1 truncate">{bu.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                      {buHc}·{buRc}
                    </span>
                  </button>
                  {buOpen &&
                    depts.map((d) => {
                      const tms = teams.filter((x) => x.departmentId === d.id);
                      const dOpen = openDept.has(d.id);
                      const dHc = roles
                        .filter((r) => r.departmentId === d.id && !r.archived)
                        .reduce((s, r) => s + r.employeeCount, 0);
                      const dRc = roles.filter((r) => r.departmentId === d.id && !r.archived).length;
                      return (
                        <div key={d.id} className="ms-2 border-s border-border/50 ps-2">
                          <button
                            type="button"
                            className={cn(
                              "flex w-full items-center gap-1 py-1 text-start rounded-sm",
                              !d.isActive && "text-muted-foreground line-through opacity-70",
                              deptFilter === d.id && buFilter === bu.id && "bg-primary/5 ring-1 ring-inset ring-primary/15"
                            )}
                            onClick={() => toggleDept(d.id)}
                          >
                            {dOpen ? (
                              <ChevronDown className="h-3 w-3 shrink-0" />
                            ) : (
                              <ChevronRight className="h-3 w-3 shrink-0 rtl:rotate-180" />
                            )}
                            <span className="flex-1 truncate">{d.name}</span>
                            <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
                              {dHc}·{dRc}
                            </span>
                          </button>
                          {dOpen && (
                            <div className="ms-2 space-y-0.5 border-s border-border/40 ps-2 pb-1">
                              {useTeamLevel ? (
                                <>
                                  <button
                                    type="button"
                                    className="block w-full truncate py-0.5 text-start text-xs text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setBuFilter(bu.id);
                                      setDeptFilter(d.id);
                                      setTeamFilter("__none__");
                                    }}
                                  >
                                    {t("treeRolesNoTeam")}
                                  </button>
                                  {tms.map((tm) => {
                                    const th = roles
                                      .filter((r) => r.teamId === tm.id && !r.archived)
                                      .reduce((s, r) => s + r.employeeCount, 0);
                                    const trc = roles.filter((r) => r.teamId === tm.id && !r.archived).length;
                                    return (
                                      <button
                                        key={tm.id}
                                        type="button"
                                        className={cn(
                                          "block w-full truncate rounded-sm py-0.5 text-start text-xs hover:text-foreground",
                                          !tm.isActive && "text-muted-foreground line-through",
                                          teamFilter === tm.id &&
                                            deptFilter === d.id &&
                                            buFilter === bu.id &&
                                            "bg-primary/5 ring-1 ring-inset ring-primary/15"
                                        )}
                                        onClick={() => {
                                          setBuFilter(bu.id);
                                          setDeptFilter(d.id);
                                          setTeamFilter(tm.id);
                                        }}
                                      >
                                        {tm.name} ({th}·{trc})
                                      </button>
                                    );
                                  })}
                                </>
                              ) : (
                                <button
                                  type="button"
                                  className="block w-full truncate py-0.5 text-start text-xs hover:text-foreground"
                                  onClick={() => {
                                    setBuFilter(bu.id);
                                    setDeptFilter(d.id);
                                    setTeamFilter("all");
                                  }}
                                >
                                  {t("treeDeptRoles")} ({dHc})
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </aside>

      <div className="min-w-0 flex-1 space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">{t("workspaceTitle")}</h1>
              <InsightBulb label={t("bulbWorkspaceTitle")} description={t("bulbWorkspaceBody")} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{t("workspaceSubtitle")}</p>
          </div>
          <Button
            disabled={!addRolePlacement}
            title={!addRolePlacement ? t("addRoleDisabledHint") : undefined}
            onClick={() => {
              const p = addRolePlacement;
              if (!p) return;
              useHrWorkforceStore.getState().addRole({
                departmentId: p.departmentId,
                businessUnitId: p.businessUnitId,
                ...(p.teamId ? { teamId: p.teamId } : {}),
                name: t("newRole"),
              });
            }}
          >
            <Plus className="me-1 h-4 w-4" />
            {t("addRole")}
          </Button>
        </div>

        <Card className="border-border/60 bg-card/40">
          <CardContent className="flex flex-col gap-3 pt-4 md:flex-row md:flex-wrap md:items-end">
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("filterBU")}</span>
              <Select
                value={buFilter}
                onValueChange={(v) => {
                  setBuFilter(v);
                  setDeptFilter("all");
                  setTeamFilter("all");
                }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allUnits")}</SelectItem>
                  {businessUnits.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">{t("filterDept")}</span>
              <Select value={deptFilter} onValueChange={(v) => { setDeptFilter(v); setTeamFilter("all"); }}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allDepts")}</SelectItem>
                  {deptOptions.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {useTeamLevel && (
              <div className="space-y-1">
                <span className="text-xs text-muted-foreground">{t("filterTeam")}</span>
                <Select value={teamFilter} onValueChange={setTeamFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("allTeams")}</SelectItem>
                    <SelectItem value="__none__">{t("noTeam")}</SelectItem>
                    {teamOptions.map((tm) => (
                      <SelectItem key={tm.id} value={tm.id}>
                        {tm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Input placeholder={t("search")} value={q} onChange={(e) => setQ(e.target.value)} className="md:max-w-xs" />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
              {t("showArchived")}
            </label>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            { label: t("sumActiveRoles"), value: summary.roles },
            { label: t("sumHeadcount"), value: summary.headcount },
            { label: t("sumDeliveryHc"), value: summary.deliveryHc },
            { label: t("sumIndirectHc"), value: summary.indirectHc },
            { label: t("sumActiveDepts"), value: summary.activeDepts },
            { label: t("sumActiveTeams"), value: summary.activeTeams, title: t("sumActiveTeamsHint") },
          ].map((x) => (
            <div
              key={x.label}
              title={"title" in x ? x.title : undefined}
              className="rounded-md border border-border/50 bg-card/40 px-2 py-2 text-center shadow-sm"
            >
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{x.label}</div>
              <div className="text-lg font-semibold tabular-nums text-foreground">{x.value}</div>
            </div>
          ))}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap gap-2 rounded-lg border bg-muted/30 p-2 text-sm">
            <span>{t("bulkSelected", { n: selected.size })}</span>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkPatchRoles([...selected], patchOperationalRoleType("delivery"))}
            >
              {t("bulkMarkDelivery")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => bulkPatchRoles([...selected], patchOperationalRoleType("indirect"))}
            >
              {t("bulkMarkIndirect")}
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={() => {
                if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmBulkDeleteRoles", { n: selected.size }))) {
                  bulkDeleteRoles([...selected]);
                  setSelected(new Set());
                }
              }}
            >
              <Trash2 className="me-1 inline h-3.5 w-3.5" />
              {t("bulkDelete")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              {t("bulkClear")}
            </Button>
          </div>
        )}

        <div className="space-y-4">
          {groups.map((g) => {
            const buN = businessUnits.find((x) => x.id === g.buId)?.name ?? g.buId;
            const dN = departments.find((x) => x.id === g.deptId)?.name ?? g.deptId;
            const tN = g.teamId ? teams.find((x) => x.id === g.teamId)?.name ?? "" : t("noTeam");
            return (
              <Card key={`${g.buId}-${g.deptId}-${useTeamLevel ? g.teamId ?? "x" : "flat"}`} className="border-border/60">
                <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-base font-medium">
                    {buN} <span className="text-muted-foreground">/</span> {dN}
                    {useTeamLevel && (
                      <>
                        {" "}
                        <span className="text-muted-foreground">/</span> {tN}
                      </>
                    )}
                  </CardTitle>
                  <Badge variant="secondary">
                    {t("groupHeadcount", { n: g.headcount })}
                  </Badge>
                </CardHeader>
                <CardContent className="overflow-x-auto p-0">
                  <table className="app-data-table min-w-[720px]">
                    <thead>
                      <tr>
                        <th className="w-10">
                          <div className="flex h-8 items-center">
                            <input
                              type="checkbox"
                              checked={g.roles.length > 0 && g.roles.every((r) => selected.has(r.id))}
                              onChange={() => {
                                const ids = g.roles.map((r) => r.id);
                                const all = ids.every((id) => selected.has(id));
                                setSelected((prev) => {
                                  const n = new Set(prev);
                                  if (all) ids.forEach((id) => n.delete(id));
                                  else ids.forEach((id) => n.add(id));
                                  return n;
                                });
                              }}
                            />
                          </div>
                        </th>
                        <th className="min-w-[8rem]">{t("colRole")}</th>
                        <th className="w-32">{t("colType")}</th>
                        <th className="w-20 text-end">{t("colCount")}</th>
                        <th className="min-w-[6rem] text-end tabular-nums">{t("colMonthly")}</th>
                        <th className="min-w-[9rem]">
                          <span className="inline-flex items-center gap-1">
                            {t("colRoleType")}
                            <InsightBulb label={t("bulbRoleTypeTitle")} description={t("bulbRoleTypeBody")} />
                          </span>
                        </th>
                        <th className="text-end">{t("actions")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {g.roles.map((r) => (
                        <tr key={r.id} className={r.archived ? "bg-muted/30 opacity-70" : undefined}>
                          <td>
                            <div className="flex h-8 items-center">
                              <input
                                type="checkbox"
                                checked={selected.has(r.id)}
                                onChange={() =>
                                  setSelected((prev) => {
                                    const n = new Set(prev);
                                    if (n.has(r.id)) n.delete(r.id);
                                    else n.add(r.id);
                                    return n;
                                  })
                                }
                              />
                            </div>
                          </td>
                          <td>
                            <Input
                              className="h-8"
                              dir="auto"
                              value={r.name}
                              onChange={(e) => updateRole(r.id, { name: e.target.value })}
                            />
                          </td>
                          <td className="text-xs text-muted-foreground">{employmentLabel(r.employmentType)}</td>
                          <td className="text-end">
                            <Input
                              type="number"
                              className="ms-auto h-8 w-16"
                              value={r.employeeCount}
                              onChange={(e) =>
                                updateRole(r.id, {
                                  employeeCount: Math.max(0, Math.floor(Number(e.target.value) || 0)),
                                })
                              }
                            />
                          </td>
                          <td className="text-end tabular-nums">
                            {fmtMoney(model.breakdownByRoleId.get(r.id)?.monthlyTotalCost ?? 0, currency)}
                          </td>
                          <td>
                            <Select
                              value={effectiveOperationalRoleType(r)}
                              onValueChange={(v) =>
                                updateRole(r.id, patchOperationalRoleType(v as OperationalRoleType))
                              }
                            >
                              <SelectTrigger className="h-8 w-[128px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="delivery">{t("roleType_delivery")}</SelectItem>
                                <SelectItem value="indirect">{t("roleType_indirect")}</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="text-end">
                            <div className="flex flex-wrap items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setOpenCostRoleId(r.id)}
                              >
                                <Pencil className="me-1 h-3 w-3" />
                                {t("editRoleCosts")}
                              </Button>
                              <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => duplicateRole(r.id)}>
                                {t("duplicate")}
                              </Button>
                              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => archiveRole(r.id, !r.archived)}>
                                {r.archived ? t("restore") : t("archive")}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:text-destructive"
                                title={t("deletePermanently")}
                                onClick={() => {
                                  if (typeof globalThis !== "undefined" && globalThis.confirm?.(t("confirmDeleteRole"))) {
                                    deleteRole(r.id);
                                    setSelected((prev) => {
                                      const n = new Set(prev);
                                      n.delete(r.id);
                                      return n;
                                    });
                                  }
                                }}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            );
          })}
          {groups.length === 0 && (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">{t("emptyRoles")}</p>
          )}
        </div>
      </div>

      <HrRoleCompensationDialog
        open={openCostRoleId !== null && costEditRole !== null}
        role={costEditRole}
        onOpenChange={(o) => {
          if (!o) setOpenCostRoleId(null);
        }}
        onSave={(patch) => {
          if (openCostRoleId) updateRole(openCostRoleId, patch);
        }}
      />
    </div>
  );
}
