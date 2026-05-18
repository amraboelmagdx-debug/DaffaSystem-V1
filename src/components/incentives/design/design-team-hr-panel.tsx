"use client";

import { useTranslations } from "next-intl";
import type { HrHierarchyEntry, IncentivePlan, IncentiveParticipantAssignment } from "@/types/incentives";
import type { JobRole } from "@/types/hr-workforce";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

const EMPTY_ROLE = "__none__";

export function DesignTeamHrPanel({
  plan,
  roles,
  hrBuId,
  onChange,
}: {
  plan: IncentivePlan;
  roles: JobRole[];
  hrBuId: string;
  onChange: (patch: Partial<IncentivePlan>) => void;
}) {
  const t = useTranslations("incentives");
  const indirect = roles.filter(
    (r) => !r.archived && r.businessUnitId === hrBuId && r.operationalRoleType === "indirect"
  );
  const assignments = plan.participantAssignments ?? [];
  const hierarchy = plan.hrHierarchy ?? [];
  const defaultLayerId = plan.layers.find((l) => l.key === "closer")?.id ?? plan.layers[0]?.id ?? "";

  const assignedIds = new Set(
    assignments.map((a) => a.jobRoleId).filter((id) => id.trim().length > 0)
  );

  const rolesForSlot = (currentRoleId: string) =>
    indirect.filter((r) => r.id === currentRoleId || !assignedIds.has(r.id));

  const patchAssignments = (next: IncentiveParticipantAssignment[]) => {
    onChange({ participantAssignments: next });
  };

  const updateSlot = (index: number, patch: Partial<IncentiveParticipantAssignment>) => {
    const next = assignments.map((a, i) => (i === index ? { ...a, ...patch } : a));
    patchAssignments(next);
  };

  const removeSlot = (index: number) => {
    const removed = assignments[index];
    const next = assignments.filter((_, i) => i !== index);
    if (removed?.jobRoleId) {
      onChange({
        participantAssignments: next,
        hrHierarchy: hierarchy.filter((h) => h.jobRoleId !== removed.jobRoleId),
      });
    } else {
      patchAssignments(next);
    }
  };

  const addSlot = () => {
    patchAssignments([
      ...assignments,
      { jobRoleId: "", layerId: defaultLayerId, weight: 1 },
    ]);
  };

  const setSeniority = (
    jobRoleId: string,
    seniority: HrHierarchyEntry["seniority"]
  ) => {
    if (!jobRoleId) return;
    const rest = hierarchy.filter((h) => h.jobRoleId !== jobRoleId);
    const existing = hierarchy.find((h) => h.jobRoleId === jobRoleId);
    onChange({
      hrHierarchy: [
        ...rest,
        {
          jobRoleId,
          mgmtTier: existing?.mgmtTier ?? 1,
          reportsTo: existing?.reportsTo,
          layerId: existing?.layerId,
          seniority,
        },
      ],
    });
  };

  const setMgmtTier = (jobRoleId: string, mgmtTier: number) => {
    if (!jobRoleId) return;
    const rest = hierarchy.filter((h) => h.jobRoleId !== jobRoleId);
    const existing = hierarchy.find((h) => h.jobRoleId === jobRoleId);
    onChange({
      hrHierarchy: [
        ...rest,
        {
          jobRoleId,
          mgmtTier,
          reportsTo: existing?.reportsTo,
          layerId: existing?.layerId,
          seniority: existing?.seniority,
        },
      ],
    });
  };

  const addAllIndirect = () => {
    const next = assignments.filter((a) => a.jobRoleId.trim().length > 0);
    for (const r of indirect) {
      if (next.some((a) => a.jobRoleId === r.id)) continue;
      const layerId =
        r.name.toLowerCase().includes("director") ||
        r.name.toLowerCase().includes("manager")
          ? "layer-mgr"
          : "layer-close";
      next.push({ jobRoleId: r.id, layerId, weight: 1 });
    }
    patchAssignments(next);
  };

  const roleName = (jobRoleId: string) =>
    indirect.find((r) => r.id === jobRoleId)?.name ?? jobRoleId;

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t("designTeamHr")}</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" onClick={addSlot}>
            {t("addParticipant")}
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={addAllIndirect}>
            {t("addAllIndirect")}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("designTeamHrHint")}</p>
        {indirect.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noIndirectRoles")}</p>
        ) : assignments.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("noSlotsYet")}</p>
        ) : (
          <div className="space-y-3">
            {assignments.map((slot, index) => {
              const jobRoleId = slot.jobRoleId?.trim() ?? "";
              const hier = jobRoleId ? hierarchy.find((h) => h.jobRoleId === jobRoleId) : undefined;
              const options = rolesForSlot(jobRoleId);
              return (
                <div
                  key={`${index}-${jobRoleId || "empty"}`}
                  className="grid gap-2 rounded-md border border-border/50 p-3 sm:grid-cols-[1fr_auto] lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]"
                >
                  <div className="space-y-1 sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs">{t("selectRole")}</Label>
                    <Select
                      value={jobRoleId || EMPTY_ROLE}
                      onValueChange={(v) => {
                        const id = v === EMPTY_ROLE ? "" : v;
                        updateSlot(index, { jobRoleId: id, layerId: slot.layerId || defaultLayerId });
                      }}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={t("selectRole")} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={EMPTY_ROLE}>{t("selectRolePlaceholder")}</SelectItem>
                        {options.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {jobRoleId ? (
                      <Badge variant="outline" className="mt-1 text-[10px]">
                        {roleName(jobRoleId)}
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("assignLayer")}</Label>
                    <Select
                      value={slot.layerId || defaultLayerId}
                      onValueChange={(v) => updateSlot(index, { layerId: v })}
                      disabled={!jobRoleId}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue placeholder={t("assignLayer")} />
                      </SelectTrigger>
                      <SelectContent>
                        {plan.layers.map((l) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("seniority")}</Label>
                    <Select
                      value={hier?.seniority ?? "mid"}
                      onValueChange={(v) =>
                        setSeniority(jobRoleId, v as HrHierarchyEntry["seniority"])
                      }
                      disabled={!jobRoleId}
                    >
                      <SelectTrigger className="h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">{t("seniorityJunior")}</SelectItem>
                        <SelectItem value="mid">{t("seniorityMid")}</SelectItem>
                        <SelectItem value="senior">{t("senioritySenior")}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">{t("mgmtTier")}</Label>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      disabled={!jobRoleId}
                      className="h-8 w-full rounded-md border border-input bg-background px-2 text-sm disabled:opacity-50"
                      value={hier?.mgmtTier ?? 1}
                      onChange={(e) =>
                        setMgmtTier(jobRoleId, Math.max(1, Number(e.target.value) || 1))
                      }
                    />
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      aria-label={t("removeSlot")}
                      onClick={() => removeSlot(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
