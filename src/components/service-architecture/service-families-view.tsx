"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
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

export function ServiceFamiliesView() {
  const t = useTranslations("serviceArchitecture");
  const serviceFamilies = useServiceArchitectureStore((s) => s.serviceFamilies);
  const serviceTiers = useServiceArchitectureStore((s) => s.serviceTiers);
  const addServiceFamily = useServiceArchitectureStore((s) => s.addServiceFamily);
  const addServiceTier = useServiceArchitectureStore((s) => s.addServiceTier);
  const [familyName, setFamilyName] = useState("");
  const [familyCode, setFamilyCode] = useState("");
  const [tierFamilyId, setTierFamilyId] = useState("");
  const [tierName, setTierName] = useState("");
  const [tierCode, setTierCode] = useState("");
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

      <SampleDataPanel moduleId="service-architecture" />

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
            <Input
              value={tierName}
              onChange={(e) => setTierName(e.target.value)}
              placeholder={t("tierNamePlaceholder")}
            />
            <Input
              value={tierCode}
              onChange={(e) => setTierCode(e.target.value)}
              placeholder={t("tierCodePlaceholder")}
            />
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
