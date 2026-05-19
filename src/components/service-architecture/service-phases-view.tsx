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
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useScopedServiceTemplates } from "@/hooks/use-scoped-service-templates";
import { getTemplateTierPhasesOrdered } from "@/lib/service-architecture/selectors";

export function ServicePhasesView() {
  const t = useTranslations("serviceArchitecture");

  const phases = useServiceArchitectureStore((s) => s.deliveryPhases);
  const allTemplates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const templates = useScopedServiceTemplates(allTemplates);
  const scopedTemplateIds = useMemo(() => new Set(templates.map((t) => t.id)), [templates]);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const allTemplateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const templateTiers = useMemo(
    () => allTemplateTiers.filter((tt) => scopedTemplateIds.has(tt.serviceTemplateId)),
    [allTemplateTiers, scopedTemplateIds]
  );
  const templateTierPhases = useServiceArchitectureStore((s) => s.serviceTemplateTierPhases);
  const addDeliveryPhase = useServiceArchitectureStore((s) => s.addDeliveryPhase);
  const addServiceTemplateTierPhase = useServiceArchitectureStore((s) => s.addServiceTemplateTierPhase);

  const [phaseName, setPhaseName] = useState("");
  const [phaseCode, setPhaseCode] = useState("");
  const [selectedTemplateTierId, setSelectedTemplateTierId] = useState("");
  const [selectedPhaseId, setSelectedPhaseId] = useState("");
  const [sortOrder, setSortOrder] = useState("1");

  const templateTierOptions = useMemo(
    () =>
      templateTiers.map((tt) => {
        const template = templates.find((it) => it.id === tt.serviceTemplateId);
        const tier = tiers.find((it) => it.id === tt.serviceTierId);
        return {
          id: tt.id,
          label: `${template?.name ?? "Template"} → ${tier?.name ?? "Tier"}`,
        };
      }),
    [templateTiers, templates, tiers]
  );

  const orderedRows = useMemo(() => {
    if (!selectedTemplateTierId) return [];
    return getTemplateTierPhasesOrdered({
      serviceTemplateTierId: selectedTemplateTierId,
      templateTierPhases,
      phases,
    });
  }, [selectedTemplateTierId, templateTierPhases, phases]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("phasesTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("phasesSubtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("newGlobalPhase")}</CardTitle>
            <CardDescription>{t("globalPhaseHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input value={phaseName} onChange={(e) => setPhaseName(e.target.value)} placeholder={t("phaseNamePlaceholder")} />
            <Input value={phaseCode} onChange={(e) => setPhaseCode(e.target.value)} placeholder={t("phaseCodePlaceholder")} />
            <Button
              onClick={() => {
                if (!phaseName.trim() || !phaseCode.trim()) return;
                addDeliveryPhase({ name: phaseName, code: phaseCode });
                setPhaseName("");
                setPhaseCode("");
              }}
            >
              {t("addPhase")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("assignPhaseTitle")}</CardTitle>
            <CardDescription>{t("assignPhaseHint")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedTemplateTierId} onValueChange={setSelectedTemplateTierId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectTemplateTier")} />
              </SelectTrigger>
              <SelectContent>
                {templateTierOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedPhaseId} onValueChange={setSelectedPhaseId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectPhase")} />
              </SelectTrigger>
              <SelectContent>
                {phases.map((phase) => (
                  <SelectItem key={phase.id} value={phase.id}>
                    {phase.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="number"
              min={0}
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              placeholder={t("sortOrderPlaceholder")}
            />
            <Button
              onClick={() => {
                if (!selectedTemplateTierId || !selectedPhaseId) return;
                addServiceTemplateTierPhase({
                  serviceTemplateTierId: selectedTemplateTierId,
                  deliveryPhaseId: selectedPhaseId,
                  sortOrder: Number(sortOrder) || 0,
                });
              }}
            >
              {t("assignPhaseButton")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("orderedPhasesTitle")}</CardTitle>
          <CardDescription>{t("orderedPhasesHint")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="!text-center">{t("colSortOrder")}</th>
                <th className="!text-center">{t("colPhase")}</th>
                <th className="!text-center">{t("colPhaseCode")}</th>
              </tr>
            </thead>
            <tbody>
              {orderedRows.map((row) => (
                <tr key={row.id}>
                  <td className="!text-center">{row.sortOrder}</td>
                  <td className="!text-center">{row.phaseName}</td>
                  <td className="!text-center">{row.phaseCode}</td>
                </tr>
              ))}
              {orderedRows.length === 0 ? (
                <tr>
                  <td className="!text-center text-muted-foreground" colSpan={3}>
                    {t("emptyOrderedPhases")}
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

