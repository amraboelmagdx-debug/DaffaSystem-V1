"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { IncentivePlan, OpportunityTierProfile } from "@/types/incentives";
import type { OpportunityTierDefinition, OpportunityTierKey } from "@/types/sales-plan";
import type { ServiceTemplate } from "@/types/service-architecture";
import { mergeOpportunityTiersWithDefaults } from "@/data/opportunity-tiers-defaults";
import { rollupOpportunityTiers } from "@/lib/planning/rollup-opportunity-tiers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import type { DemoCompany } from "@/types/domain";

const TIER_KEYS: OpportunityTierKey[] = ["tiny", "standard", "big", "mega"];

export function DesignTierProfilesPanel({
  plan,
  company,
  products,
  wizardCells,
  serviceTemplates,
  onChange,
  onCompanyTiersChange,
}: {
  plan: IncentivePlan;
  company: DemoCompany;
  products: { id: string; name: string; serviceTemplateId?: string | null }[];
  wizardCells: Record<string, { avgDealValueSar: number; exists?: boolean }>;
  serviceTemplates: ServiceTemplate[];
  onChange: (patch: Partial<IncentivePlan>) => void;
  onCompanyTiersChange?: (tiers: OpportunityTierDefinition[]) => void;
}) {
  const t = useTranslations("incentives");
  const [refreshKey, setRefreshKey] = useState(0);
  const buTiers = mergeOpportunityTiersWithDefaults(company.opportunityTiers ?? []);
  const hrBuId = company.hrBusinessUnitId ?? plan.hrBusinessUnitId;

  const rollup = useMemo(
    () =>
      rollupOpportunityTiers({
        templates: serviceTemplates,
        hrBusinessUnitId: hrBuId,
        products,
        wizardCells,
      }),
    [serviceTemplates, hrBuId, products, wizardCells, refreshKey]
  );

  const buProfile = (plan.tierProfiles ?? []).find(
    (p) => p.scope === "bu" && p.hrBusinessUnitId === hrBuId
  );
  const planActiveByTier = useMemo(() => {
    const activeKeys = new Set((buProfile?.tiers ?? buTiers).map((t) => t.key));
    const m = new Map<OpportunityTierKey, boolean>();
    for (const tk of TIER_KEYS) {
      m.set(tk, activeKeys.has(tk));
    }
    return m;
  }, [buProfile, buTiers]);

  const setPlanActive = (tierKey: OpportunityTierKey, active: boolean) => {
    const current = buProfile?.tiers ?? buTiers;
    const tiers = active
      ? [...current.filter((t) => t.key !== tierKey), buTiers.find((t) => t.key === tierKey)!].filter(
          Boolean
        )
      : current.filter((t) => t.key !== tierKey);
    const rest = (plan.tierProfiles ?? []).filter(
      (p) => !(p.scope === "bu" && p.hrBusinessUnitId === hrBuId)
    );
    onChange({
      tierProfiles: [
        ...rest,
        {
          scope: "bu",
          hrBusinessUnitId: hrBuId,
          tiers,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        },
      ],
    });
  };

  const setForced = (
    tierKey: OpportunityTierKey,
    field: "minValueSar" | "maxValueSar",
    value: number
  ) => {
    const tiers = buTiers.map((tier) =>
      tier.key === tierKey ? { ...tier, [field]: value } : tier
    );
    onCompanyTiersChange?.(tiers);
    const rest = (plan.tierProfiles ?? []).filter(
      (p) => !(p.scope === "bu" && p.hrBusinessUnitId === hrBuId)
    );
    onChange({
      tierProfiles: [
        ...rest,
        {
          scope: "bu",
          hrBusinessUnitId: hrBuId,
          tiers,
          effectiveFrom: new Date().toISOString().slice(0, 10),
        } satisfies OpportunityTierProfile,
      ],
    });
  };

  return (
    <Card className="border-border/60">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
        <CardTitle className="text-base">{t("designTierTable")}</CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={() => setRefreshKey((k) => k + 1)}
        >
          {t("refreshFromCatalog")}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">{t("designTierTableHint")}</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border/40 text-left text-muted-foreground">
                <th className="py-1 pr-2">{t("tier")}</th>
                <th className="py-1 pr-2">{t("tiers.planActive")}</th>
                <th className="py-1 pr-2">{t("tierMedian")}</th>
                <th className="py-1 pr-2">{t("tierMean")}</th>
                <th className="py-1 pr-2">{t("tiers.minComputed")}</th>
                <th className="py-1 pr-2">{t("tiers.maxComputed")}</th>
                <th className="py-1 pr-2">{t("tiers.forcedMin")}</th>
                <th className="py-1">{t("tiers.forcedMax")}</th>
              </tr>
            </thead>
            <tbody>
              {rollup.map((row) => {
                const tierDef = buTiers.find((x) => x.key === row.tierKey);
                const planActive = planActiveByTier.get(row.tierKey) ?? row.activeInCatalog;
                return (
                  <tr key={row.tierKey} className="border-b border-border/20">
                    <td className="py-2 pr-2 capitalize">{row.tierKey}</td>
                    <td className="py-2 pr-2">
                      <input
                        type="checkbox"
                        checked={planActive}
                        onChange={(e) => setPlanActive(row.tierKey, e.target.checked)}
                      />
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.median > 0 ? row.median.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.mean > 0 ? row.mean.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.minComputed > 0 ? row.minComputed.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-2 tabular-nums">
                      {row.maxComputed > 0 ? row.maxComputed.toLocaleString() : "—"}
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-input bg-background px-1 py-0.5"
                        placeholder={String(tierDef?.minValueSar ?? "")}
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v >= 0) setForced(row.tierKey, "minValueSar", v);
                        }}
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        className="w-24 rounded border border-input bg-background px-1 py-0.5"
                        placeholder={
                          tierDef?.maxValueSar != null ? String(tierDef.maxValueSar) : "∞"
                        }
                        onBlur={(e) => {
                          const v = Number(e.target.value);
                          if (v > 0) setForced(row.tierKey, "maxValueSar", v);
                        }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Label className="text-[10px] text-muted-foreground">
          {t("tiers.catalogSamples", {
            count: rollup.reduce((s, r) => s + r.sampleCount, 0),
          })}
        </Label>
      </CardContent>
    </Card>
  );
}
