import { describe, expect, it } from "vitest";
import { simulateServiceDeliveryCost } from "@/lib/service-cost-simulation/engine";
import { makeOperationalStressCatalog } from "@/lib/service-architecture/operational-stress-catalog";
import type { ServiceCostCatalogSlice } from "@/lib/service-cost-simulation/types";
import { operationalPricingBasisFromSimulation } from "./operational-basis";
import { runCommercialPricingIntelligence } from "./engine";
import { getCommercialPricingScenarioById } from "./commercial-pricing-scenarios";
import { DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS } from "./defaults";

describe("commercial pricing tier monotonicity (on operational simulation)", () => {
  const stress = makeOperationalStressCatalog();
  const catalog: ServiceCostCatalogSlice = {
    serviceTemplates: stress.serviceTemplates,
    serviceTiers: stress.serviceTiers,
    serviceTemplateTiers: stress.serviceTemplateTiers,
    deliveryPhases: stress.deliveryPhases,
    serviceTemplateTierPhases: stress.serviceTemplateTierPhases,
    serviceDeliverables: stress.serviceDeliverables,
    serviceRoleAllocations: stress.serviceRoleAllocations,
  };
  const rates = new Map(
    Object.entries({
      "jr-brand-cd": { standardHourlyCost: 100, ohAdjustedHourlyCost: 140 },
      "jr-brand-des": { standardHourlyCost: 80, ohAdjustedHourlyCost: 112 },
      "jr-strat-lead": { standardHourlyCost: 120, ohAdjustedHourlyCost: 165 },
      "jr-strat-ana": { standardHourlyCost: 70, ohAdjustedHourlyCost: 95 },
      "jr-motion-ae": { standardHourlyCost: 90, ohAdjustedHourlyCost: 125 },
      "jr-motion-mg": { standardHourlyCost: 85, ohAdjustedHourlyCost: 118 },
      "jr-comms-am": { standardHourlyCost: 75, ohAdjustedHourlyCost: 102 },
      "jr-comms-copy": { standardHourlyCost: 65, ohAdjustedHourlyCost: 88 },
    })
  );

  it("suggested commercial price is non-decreasing Tiny → Mega for same template under cost-plus", () => {
    const tiers = ["TINY", "STANDARD", "BIG", "MEGA"] as const;
    const prices = tiers.map((code) => {
      const cost = simulateServiceDeliveryCost({
        catalog,
        roles: stress.roles,
        breakdownByRoleId: rates,
        serviceTemplateId: "tpl-bi",
        serviceTierId: `tier-BRAND-${code}`,
        assumptions: {
          deliveryInefficiencyFactor: 1,
          qaSensitivityFactor: 1,
          designRevisionIntensityFactor: 1,
          coordinationLoadFactor: 1,
          managementLoadFactor: 1,
          clientReviewLagFactor: 1,
          implicitWrapLoadedCostFraction: 0,
        },
        scenario: {
          id: "baseline",
          label: "Baseline",
          description: "",
          hoursMultiplier: 1,
          effortMultiplier: 1,
          coordinationMultiplier: 1,
          managementMultiplier: 1,
        },
      });
      expect(cost.ok).toBe(true);
      if (!cost.ok) return 0;
      const basis = operationalPricingBasisFromSimulation(cost, "SAR");
      const c = runCommercialPricingIntelligence({
        basis,
        model: { modelId: "cost_plus", markupPct: 30 },
        activeRiskIds: [],
        scenario: getCommercialPricingScenarioById("neutral"),
        thresholds: DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS,
      });
      expect(c.ok).toBe(true);
      return c.ok ? c.suggestedCommercialPrice : 0;
    });
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i]).toBeGreaterThanOrEqual(prices[i - 1]);
    }
  });
});
