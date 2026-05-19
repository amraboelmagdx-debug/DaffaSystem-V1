"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Link } from "@/i18n/navigation";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { useActiveHrBusinessUnits } from "@/hooks/use-active-hr-business-units";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import { useUnitScope } from "@/hooks/use-unit-scope";
import { ServiceTemplateOpportunityTiers } from "@/components/service-architecture/service-template-opportunity-tiers";

export function ServiceTemplatesView() {
  const t = useTranslations("serviceArchitecture");
  const { buildHref } = useUnitRouteContext();
  const { isUnitScoped, hrBusinessUnitId, unitLabel } = useUnitScope();
  const hrWorkforceHref = buildHref("/hr-workforce");
  const families = useServiceArchitectureStore((s) => s.serviceFamilies);
  const tiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const templates = useServiceArchitectureStore((s) => s.serviceTemplates);
  const templateTiers = useServiceArchitectureStore((s) => s.serviceTemplateTiers);
  const addServiceTemplate = useServiceArchitectureStore((s) => s.addServiceTemplate);
  const addServiceTemplateTier = useServiceArchitectureStore((s) => s.addServiceTemplateTier);

  const businessUnits = useActiveHrBusinessUnits();
  const { selectedUnit } = useOperationalWorkspace();
  const workspaceBuId =
    (isUnitScoped && hrBusinessUnitId) ||
    selectedUnit?.hrBusinessUnitId ||
    businessUnits[0]?.id ||
    "";

  const scopedTemplates = useMemo(() => {
    if (!workspaceBuId) return templates;
    return templates.filter((t) => t.businessUnitId === workspaceBuId);
  }, [templates, workspaceBuId]);

  const [familyId, setFamilyId] = useState("");
  const [businessUnitId, setBusinessUnitId] = useState(workspaceBuId);

  useEffect(() => {
    if (workspaceBuId) setBusinessUnitId(workspaceBuId);
  }, [workspaceBuId]);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [selectedTierId, setSelectedTierId] = useState("");
  const [linkMessage, setLinkMessage] = useState("");

  const linkedTiersByTemplate = useMemo(
    () =>
      scopedTemplates.map((template) => {
        const linkedTierIds = new Set(
          templateTiers
            .filter((it) => it.serviceTemplateId === template.id)
            .map((it) => it.serviceTierId)
        );
        const linkedTiers = tiers.filter((tier) => linkedTierIds.has(tier.id));
        return { template, linkedTiers };
      }),
    [scopedTemplates, templateTiers, tiers]
  );

  const availableTiersForTemplate = useMemo(() => {
    const template = templates.find((it) => it.id === selectedTemplateId);
    if (!template) return [];
    return tiers.filter((tier) => tier.serviceFamilyId === template.serviceFamilyId);
  }, [selectedTemplateId, templates, tiers]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("templatesTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("templatesSubtitle")}</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("newTemplate")}</CardTitle>
            <CardDescription>{t("templateSingleBu")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {businessUnits.length === 0 ? (
              <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
                {t("buEmptyFromHrHint")}{" "}
                <Link
                  href={hrWorkforceHref}
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  {t("buOpenHrWorkforce")}
                </Link>
                .
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">{t("buListFromHrHint")}</p>
            )}
            <Select value={familyId} onValueChange={setFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectFamily")} />
              </SelectTrigger>
              <SelectContent>
                {families.map((family) => (
                  <SelectItem key={family.id} value={family.id}>
                    {family.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">{t("buSelectLabel")}</p>
              {isUnitScoped ? (
                <p className="rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-sm font-medium">
                  {unitLabel ||
                    businessUnits.find((b) => b.id === businessUnitId)?.name ||
                    "—"}
                </p>
              ) : (
                <Select
                  value={businessUnitId}
                  onValueChange={setBusinessUnitId}
                  disabled={businessUnits.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("selectBusinessUnit")} />
                  </SelectTrigger>
                  <SelectContent>
                    {businessUnits.map((bu) => (
                      <SelectItem key={bu.id} value={bu.id}>
                        {bu.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("templateNamePlaceholder")} />
            <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder={t("templateCodePlaceholder")} />
            <Button
              disabled={!workspaceBuId}
              onClick={() => {
                if (!familyId || !businessUnitId || !name.trim() || !code.trim()) return;
                addServiceTemplate({
                  serviceFamilyId: familyId,
                  businessUnitId,
                  name,
                  code,
                });
                setName("");
                setCode("");
              }}
            >
              {t("addTemplate")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("linkTierTitle")}</CardTitle>
            <CardDescription>{t("linkTierFamilyGuard")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={selectedTemplateId} onValueChange={setSelectedTemplateId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectTemplate")} />
              </SelectTrigger>
              <SelectContent>
                {scopedTemplates.map((template) => (
                  <SelectItem key={template.id} value={template.id}>
                    {template.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={selectedTierId} onValueChange={setSelectedTierId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectTier")} />
              </SelectTrigger>
              <SelectContent>
                {availableTiersForTemplate.map((tier) => (
                  <SelectItem key={tier.id} value={tier.id}>
                    {tier.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={() => {
                const result = addServiceTemplateTier({
                  serviceTemplateId: selectedTemplateId,
                  serviceTierId: selectedTierId,
                });
                setLinkMessage(result.ok ? t("linkTierSuccess") : result.reason || t("linkTierFailed"));
              }}
            >
              {t("linkTierButton")}
            </Button>
            {linkMessage ? <p className="text-xs text-muted-foreground">{linkMessage}</p> : null}
            {selectedTemplateId &&
            templates.find((tpl) => tpl.id === selectedTemplateId) ? (
              <ServiceTemplateOpportunityTiers
                template={templates.find((tpl) => tpl.id === selectedTemplateId)!}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("templatesTableTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[820px] text-sm">
            <thead>
              <tr>
                <th className="!text-center">{t("colTemplate")}</th>
                <th className="!text-center">{t("colFamily")}</th>
                <th className="!text-center">{t("colBusinessUnit")}</th>
                <th className="!text-center">{t("colLinkedTiers")}</th>
              </tr>
            </thead>
            <tbody>
              {linkedTiersByTemplate.map(({ template, linkedTiers }) => (
                <tr key={template.id}>
                  <td className="!text-center font-medium">
                    {template.name} ({template.code})
                  </td>
                  <td className="!text-center">
                    {families.find((f) => f.id === template.serviceFamilyId)?.name ?? "—"}
                  </td>
                  <td className="!text-center">
                    {businessUnits.find((bu) => bu.id === template.businessUnitId)?.name ?? template.businessUnitId}
                  </td>
                  <td className="!text-center">
                    {linkedTiers.map((tier) => `${tier.name} (${tier.code})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {linkedTiersByTemplate.length === 0 ? (
                <tr>
                  <td className="!text-center text-muted-foreground" colSpan={4}>
                    {t("emptyTemplates")}
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

