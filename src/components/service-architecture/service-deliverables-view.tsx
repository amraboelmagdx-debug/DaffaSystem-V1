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

export function ServiceDeliverablesView() {
  const t = useTranslations("serviceArchitecture");
  const templates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const templateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const phases = useServiceArchitectureStore((s) => s.deliveryPhases);
  const templateTierPhases = useServiceArchitectureStore((s) => s.serviceTemplateTierPhases);
  const deliverables = useServiceArchitectureStore((s) => s.serviceDeliverables);
  const addServiceDeliverable = useServiceArchitectureStore((s) => s.addServiceDeliverable);

  const [selectedTemplateTierPhaseId, setSelectedTemplateTierPhaseId] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");

  const phaseOptions = useMemo(
    () =>
      templateTierPhases.map((ttp) => {
        const tt = templateTiers.find((it) => it.id === ttp.serviceTemplateTierId);
        const template = templates.find((it) => it.id === tt?.serviceTemplateId);
        const tier = tiers.find((it) => it.id === tt?.serviceTierId);
        const phase = phases.find((it) => it.id === ttp.deliveryPhaseId);
        return {
          id: ttp.id,
          label: `${template?.name ?? "Template"} · ${tier?.name ?? "Tier"} · ${phase?.name ?? "Phase"}`,
        };
      }),
    [templateTierPhases, templateTiers, templates, tiers, phases]
  );

  const rows = useMemo(
    () =>
      deliverables.map((deliverable) => {
        const ttp = templateTierPhases.find((it) => it.id === deliverable.serviceTemplateTierPhaseId);
        const tt = templateTiers.find((it) => it.id === ttp?.serviceTemplateTierId);
        const template = templates.find((it) => it.id === tt?.serviceTemplateId);
        const tier = tiers.find((it) => it.id === tt?.serviceTierId);
        const phase = phases.find((it) => it.id === ttp?.deliveryPhaseId);
        return {
          ...deliverable,
          templateName: template?.name ?? "—",
          tierName: tier?.name ?? "—",
          phaseName: phase?.name ?? "—",
        };
      }),
    [deliverables, templateTierPhases, templateTiers, templates, tiers, phases]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("deliverablesTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("deliverablesSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("newDeliverable")}</CardTitle>
          <CardDescription>{t("deliverableLinkHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select value={selectedTemplateTierPhaseId} onValueChange={setSelectedTemplateTierPhaseId}>
            <SelectTrigger>
              <SelectValue placeholder={t("selectTemplateTierPhase")} />
            </SelectTrigger>
            <SelectContent>
              {phaseOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("deliverableNamePlaceholder")} />
          <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("deliverableCodePlaceholder")} />
          <Button
            onClick={() => {
              if (!selectedTemplateTierPhaseId || !name.trim() || !code.trim()) return;
              addServiceDeliverable({
                serviceTemplateTierPhaseId: selectedTemplateTierPhaseId,
                name,
                code,
              });
              setName("");
              setCode("");
            }}
          >
            {t("addDeliverable")}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t("deliverablesTableTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[900px] text-sm">
            <thead>
              <tr>
                <th className="!text-center">{t("colDeliverable")}</th>
                <th className="!text-center">{t("colCode")}</th>
                <th className="!text-center">{t("colTemplate")}</th>
                <th className="!text-center">{t("colTier")}</th>
                <th className="!text-center">{t("colPhase")}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="!text-center">{row.name}</td>
                  <td className="!text-center">{row.code}</td>
                  <td className="!text-center">{row.templateName}</td>
                  <td className="!text-center">{row.tierName}</td>
                  <td className="!text-center">{row.phaseName}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td className="!text-center text-muted-foreground" colSpan={5}>
                    {t("emptyDeliverables")}
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

