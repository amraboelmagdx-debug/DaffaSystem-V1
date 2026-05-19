"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useScopedServiceTemplates } from "@/hooks/use-scoped-service-templates";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import {
  getJobRolesForTemplateBusinessUnit,
  getRoleAllocationsByPhase,
  getTemplateTierPhasesOrdered,
} from "@/lib/service-architecture/selectors";

export function ServiceRoleAllocationMatrixView() {
  const t = useTranslations("serviceArchitecture");

  const allTemplates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const templates = useScopedServiceTemplates(allTemplates);
  const scopedTemplateIds = useMemo(() => new Set(templates.map((t) => t.id)), [templates]);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const allTemplateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const templateTiers = useMemo(
    () => allTemplateTiers.filter((tt) => scopedTemplateIds.has(tt.serviceTemplateId)),
    [allTemplateTiers, scopedTemplateIds]
  );
  const phases = useServiceArchitectureStore((s) => s.deliveryPhases);
  const templateTierPhases = useServiceArchitectureStore((s) => s.serviceTemplateTierPhases);
  const allocations = useServiceArchitectureStore((s) => s.serviceRoleAllocations);
  const addAllocation = useServiceArchitectureStore((s) => s.addServiceRoleAllocation);
  const updateAllocation = useServiceArchitectureStore((s) => s.updateServiceRoleAllocation);
  const removeAllocation = useServiceArchitectureStore((s) => s.removeServiceRoleAllocation);

  const roles = useHrWorkforceStore((s) => s.roles);

  const [templateId, setTemplateId] = useState("");
  const [tierId, setTierId] = useState("");

  const linkedTierOptions = useMemo(() => {
    if (!templateId) return [];
    const linkedTierIds = new Set(
      templateTiers.filter((tt) => tt.serviceTemplateId === templateId).map((tt) => tt.serviceTierId)
    );
    return tiers.filter((tier) => linkedTierIds.has(tier.id));
  }, [templateId, templateTiers, tiers]);

  const selectedTemplateTierId = useMemo(() => {
    const row = templateTiers.find((tt) => tt.serviceTemplateId === templateId && tt.serviceTierId === tierId);
    return row?.id ?? "";
  }, [templateId, tierId, templateTiers]);

  const orderedPhaseRows = useMemo(() => {
    if (!selectedTemplateTierId) return [];
    return getTemplateTierPhasesOrdered({
      serviceTemplateTierId: selectedTemplateTierId,
      templateTierPhases,
      phases,
    });
  }, [selectedTemplateTierId, templateTierPhases, phases]);

  const rolesForTemplateBu = useMemo(
    () =>
      getJobRolesForTemplateBusinessUnit({
        templateId,
        templates,
        roles,
      }),
    [templateId, templates, roles]
  );

  const roleNameById = useMemo(
    () =>
      new Map(
        rolesForTemplateBu.map((role) => [
          role.id,
          `${role.name}${role.archived ? " (archived)" : ""}`,
        ])
      ),
    [rolesForTemplateBu]
  );

  const allocationsByPhase = useMemo(() => getRoleAllocationsByPhase(allocations), [allocations]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("matrixTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("matrixSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{t("matrixFiltersTitle")}</CardTitle>
              <CardDescription>{t("matrixFiltersHint")}</CardDescription>
            </div>
            <InsightBulb label={t("matrixRoleGateTitle")} description={t("matrixRoleGateBody")} wide />
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2">
          <Select
            value={templateId}
            onValueChange={(value) => {
              setTemplateId(value);
              setTierId("");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("selectTemplate")} />
            </SelectTrigger>
            <SelectContent>
              {templates.map((template) => (
                <SelectItem key={template.id} value={template.id}>
                  {template.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={tierId} onValueChange={setTierId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectTier")} />
            </SelectTrigger>
            <SelectContent>
              {linkedTierOptions.map((tier) => (
                <SelectItem key={tier.id} value={tier.id}>
                  {tier.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("matrixRowsTitle")}</CardTitle>
          <CardDescription>{t("matrixRowsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {orderedPhaseRows.map((phaseRow) => {
            const phaseAllocations = allocationsByPhase[phaseRow.id] ?? [];
            return (
              <div key={phaseRow.id} className="rounded-lg border border-border/60 p-3">
                <div className="mb-3 flex items-center justify-between gap-2 border-b border-border/50 pb-2">
                  <div>
                    <p className="font-medium">
                      {phaseRow.sortOrder}. {phaseRow.phaseName}
                    </p>
                    <p className="text-xs text-muted-foreground">{phaseRow.phaseCode}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const fallbackRoleId = rolesForTemplateBu[0]?.id;
                      if (!fallbackRoleId) return;
                      addAllocation({
                        serviceTemplateTierPhaseId: phaseRow.id,
                        jobRoleId: fallbackRoleId,
                        allocatedHours: 0,
                        notes: "",
                      });
                    }}
                  >
                    {t("addAllocationRow")}
                  </Button>
                </div>
                <div className="space-y-2">
                  {phaseAllocations.map((allocation) => (
                    <div
                      key={allocation.id}
                      className="grid gap-2 rounded-md border border-border/40 p-2 md:grid-cols-[1.4fr_0.7fr_1fr_auto]"
                    >
                      <Select
                        value={allocation.jobRoleId}
                        onValueChange={(value) => updateAllocation(allocation.id, { jobRoleId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {rolesForTemplateBu.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        min={0}
                        value={allocation.allocatedHours}
                        onChange={(e) =>
                          updateAllocation(allocation.id, {
                            allocatedHours: Math.max(0, Number(e.target.value) || 0),
                          })
                        }
                        placeholder={t("hoursPlaceholder")}
                      />
                      <Input
                        value={allocation.notes ?? ""}
                        onChange={(e) => updateAllocation(allocation.id, { notes: e.target.value })}
                        placeholder={t("notesPlaceholder")}
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeAllocation(allocation.id)}>
                        {t("remove")}
                      </Button>
                    </div>
                  ))}
                  {phaseAllocations.length === 0 ? (
                    <p className="text-xs text-muted-foreground">{t("emptyAllocationsForPhase")}</p>
                  ) : null}
                </div>
              </div>
            );
          })}
          {orderedPhaseRows.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("emptyMatrixRows")}</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("allocationSnapshotTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[820px] text-sm">
            <thead>
              <tr>
                <th className="!text-center">{t("colPhase")}</th>
                <th className="!text-center">{t("colRole")}</th>
                <th className="!text-center">{t("colHours")}</th>
                <th className="!text-center">{t("colNotes")}</th>
              </tr>
            </thead>
            <tbody>
              {orderedPhaseRows.flatMap((phaseRow) =>
                (allocationsByPhase[phaseRow.id] ?? []).map((allocation) => (
                  <tr key={allocation.id}>
                    <td className="!text-center">{phaseRow.phaseName}</td>
                    <td className="!text-center">
                      {roleNameById.get(allocation.jobRoleId) ?? allocation.jobRoleId}
                    </td>
                    <td className="!text-center">{allocation.allocatedHours}</td>
                    <td className="!text-center">{allocation.notes || "—"}</td>
                  </tr>
                ))
              )}
              {orderedPhaseRows.length === 0 ||
              orderedPhaseRows.every((row) => (allocationsByPhase[row.id] ?? []).length === 0) ? (
                <tr>
                  <td className="!text-center text-muted-foreground" colSpan={4}>
                    {t("emptyAllocationSnapshot")}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

