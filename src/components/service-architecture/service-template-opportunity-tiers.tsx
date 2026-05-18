"use client";

import { useTranslations } from "next-intl";
import type { ServiceOpportunityTierBand, ServiceTemplate } from "@/types/service-architecture";
import { defaultOpportunityTierBandsForTemplate } from "@/lib/planning/default-opportunity-tier-bands";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const TIER_KEYS = ["tiny", "standard", "big", "mega"] as const;

export function ServiceTemplateOpportunityTiers({
  template,
}: {
  template: ServiceTemplate;
}) {
  const t = useTranslations("serviceArchitecture");
  const updateServiceTemplate = useServiceArchitectureStore((s) => s.updateServiceTemplate);
  const bands = template.opportunityTierBands ?? defaultOpportunityTierBandsForTemplate();

  const patchBands = (next: ServiceOpportunityTierBand[]) => {
    updateServiceTemplate(template.id, { opportunityTierBands: next });
  };

  const updateBand = (tierKey: (typeof TIER_KEYS)[number], patch: Partial<ServiceOpportunityTierBand>) => {
    const next = bands.map((b) => (b.tierKey === tierKey ? { ...b, ...patch } : b));
    patchBands(next);
  };

  const resetBands = () => {
    patchBands(defaultOpportunityTierBandsForTemplate());
  };

  return (
    <div className="mt-4 space-y-2 rounded-lg border border-border/50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-medium">{t("opportunityTierBandsTitle")}</Label>
        <Button type="button" size="sm" variant="ghost" onClick={resetBands}>
          {t("opportunityTierBandsReset")}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{t("opportunityTierBandsHint")}</p>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-border/40 text-muted-foreground">
            <th className="py-1 text-start">{t("tierColumn")}</th>
            <th className="py-1 text-center">{t("activeColumn")}</th>
            <th className="py-1 text-end">{t("minSarColumn")}</th>
            <th className="py-1 text-end">{t("maxSarColumn")}</th>
            <th className="py-1 text-end">{t("avgDealColumn")}</th>
          </tr>
        </thead>
        <tbody>
          {TIER_KEYS.map((tierKey) => {
            const band = bands.find((b) => b.tierKey === tierKey) ?? {
              tierKey,
              active: false,
            };
            return (
              <tr key={tierKey} className="border-b border-border/20">
                <td className="py-1 capitalize">{tierKey}</td>
                <td className="py-1 text-center">
                  <input
                    type="checkbox"
                    checked={band.active}
                    onChange={(e) => updateBand(tierKey, { active: e.target.checked })}
                  />
                </td>
                <td className="py-1 text-end">
                  <input
                    type="number"
                    className="w-24 rounded border border-input px-1 py-0.5 text-end"
                    value={band.minValueSar ?? ""}
                    disabled={!band.active}
                    onChange={(e) =>
                      updateBand(tierKey, { minValueSar: Number(e.target.value) || 0 })
                    }
                  />
                </td>
                <td className="py-1 text-end">
                  <input
                    type="number"
                    className="w-24 rounded border border-input px-1 py-0.5 text-end"
                    value={band.maxValueSar ?? ""}
                    disabled={!band.active}
                    onChange={(e) =>
                      updateBand(tierKey, {
                        maxValueSar: e.target.value ? Number(e.target.value) : null,
                      })
                    }
                  />
                </td>
                <td className="py-1 text-end">
                  <input
                    type="number"
                    className="w-24 rounded border border-input px-1 py-0.5 text-end"
                    value={band.avgDealValueSar ?? ""}
                    disabled={!band.active}
                    onChange={(e) =>
                      updateBand(tierKey, { avgDealValueSar: Number(e.target.value) || 0 })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
