"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { InsightBulb } from "@/components/planning/insight-bulb";
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
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export function ServiceFamiliesView() {
  const t = useTranslations("serviceArchitecture");
  const serviceFamilies = useServiceArchitectureStore((s) => s.serviceFamilies);
  const serviceTiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const addServiceFamily = useServiceArchitectureStore((s) => s.addServiceFamily);
  const addServiceTier = useServiceArchitectureStore((s) => s.addServiceTier);
  const seedDemoCatalog = useServiceArchitectureStore((s) => s.seedDemoCatalog);
  const resetServiceArchitecture = useServiceArchitectureStore((s) => s.resetServiceArchitecture);

  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);
  const roles = useHrWorkforceStore((s) => s.roles);

  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [tierFamilyId, setTierFamilyId] = useState("");
  const [tierName, setTierName] = useState("");
  const [tierCode, setTierCode] = useState("");
  const [seedMessage, setSeedMessage] = useState("");

  const tiersByFamily = useMemo(
    () =>
      serviceFamilies.map((family) => ({
        family,
        tiers: serviceTiers.filter((tier) => tier.serviceFamilyId === family.id),
      })),
    [serviceFamilies, serviceTiers]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("familiesTitle")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("familiesSubtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-2">
            <div>
              <CardTitle>{t("seedTitle")}</CardTitle>
              <CardDescription>{t("seedDescription")}</CardDescription>
            </div>
            <InsightBulb label={t("seedTitle")} description={t("seedHelp")} />
          </div>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            onClick={() => {
              const buId = businessUnits[0]?.id ?? "";
              const roleIds = roles.filter((r) => !r.archived).map((r) => r.id);
              const res = seedDemoCatalog({ businessUnitId: buId, roleIds });
              setSeedMessage(res.ok ? t("seedApplied") : res.reason || t("seedBlocked"));
            }}
          >
            {t("seedButton")}
          </Button>
          <Button
            variant="outline"
            className="border-destructive/40 text-destructive hover:bg-destructive/10"
            onClick={() => {
              if (!window.confirm(t("resetCatalogConfirm"))) return;
              resetServiceArchitecture();
              setSeedMessage(t("resetCatalogDone"));
            }}
          >
            {t("resetCatalogButton")}
          </Button>
          {seedMessage ? <span className="text-xs text-muted-foreground">{seedMessage}</span> : null}
          <p className="w-full text-xs text-muted-foreground">{t("resetCatalogHint")}</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("newFamily")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={familyName}
              onChange={(e) => setFamilyName(e.target.value)}
              placeholder={t("familyNamePlaceholder")}
            />
            <Input
              value={familyCode}
              onChange={(e) => setFamilyCode(e.target.value)}
              placeholder={t("familyCodePlaceholder")}
            />
            <Button
              onClick={() => {
                if (!familyName.trim() || !familyCode.trim()) return;
                addServiceFamily({ name: familyName, code: familyCode });
                setFamilyName("");
                setFamilyCode("");
              }}
            >
              {t("addFamily")}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{t("newTier")}</CardTitle>
            <CardDescription>{t("tierScopedToFamily")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Select value={tierFamilyId} onValueChange={setTierFamilyId}>
              <SelectTrigger>
                <SelectValue placeholder={t("selectFamily")} />
              </SelectTrigger>
              <SelectContent>
                {serviceFamilies.map((f) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input value={tierName} onChange={(e) => setTierName(e.target.value)} placeholder={t("tierNamePlaceholder")} />
            <Input value={tierCode} onChange={(e) => setTierCode(e.target.value)} placeholder={t("tierCodePlaceholder")} />
            <Button
              onClick={() => {
                if (!tierFamilyId || !tierName.trim() || !tierCode.trim()) return;
                addServiceTier({ serviceFamilyId: tierFamilyId, name: tierName, code: tierCode });
                setTierName("");
                setTierCode("");
              }}
            >
              {t("addTier")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("familiesTableTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table min-w-[720px] text-sm">
            <thead>
              <tr>
                <th className="!text-center">{t("colFamily")}</th>
                <th className="!text-center">{t("colCode")}</th>
                <th className="!text-center">{t("colLifecycle")}</th>
                <th className="!text-center">{t("colVersion")}</th>
                <th className="!text-center">{t("colTiers")}</th>
              </tr>
            </thead>
            <tbody>
              {tiersByFamily.map(({ family, tiers }) => (
                <tr key={family.id}>
                  <td className="!text-center font-medium">{family.name}</td>
                  <td className="!text-center">{family.code}</td>
                  <td className="!text-center">{family.lifecycle}</td>
                  <td className="!text-center">{family.version}</td>
                  <td className="!text-center">
                    {tiers.map((tier) => `${tier.name} (${tier.code})`).join(", ") || "—"}
                  </td>
                </tr>
              ))}
              {tiersByFamily.length === 0 ? (
                <tr>
                  <td className="!text-center text-muted-foreground" colSpan={5}>
                    {t("emptyFamilies")}
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

