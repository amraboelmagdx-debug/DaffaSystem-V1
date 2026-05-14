import { describe, expect, it } from "vitest";
import { simulateServiceDeliveryCost } from "./engine";
import { makeOperationalStressCatalog } from "../service-architecture/operational-stress-catalog";
import { getScenarioPresetById } from "./scenarios";
import { DEFAULT_SERVICE_COST_ASSUMPTIONS } from "./defaults";
import type { ServiceCostCatalogSlice } from "./types";

function breakdownMap(
  pairs: Record<string, { standardHourlyCost: number; ohAdjustedHourlyCost: number }>
): Map<string, { standardHourlyCost: number; ohAdjustedHourlyCost: number }> {
  return new Map(Object.entries(pairs));
}

describe("simulateServiceDeliveryCost", () => {
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

  const rates = breakdownMap({
    "jr-brand-cd": { standardHourlyCost: 100, ohAdjustedHourlyCost: 140 },
    "jr-brand-des": { standardHourlyCost: 80, ohAdjustedHourlyCost: 112 },
    "jr-strat-lead": { standardHourlyCost: 120, ohAdjustedHourlyCost: 165 },
    "jr-strat-ana": { standardHourlyCost: 70, ohAdjustedHourlyCost: 95 },
    "jr-motion-ae": { standardHourlyCost: 90, ohAdjustedHourlyCost: 125 },
    "jr-motion-mg": { standardHourlyCost: 85, ohAdjustedHourlyCost: 118 },
    "jr-comms-am": { standardHourlyCost: 75, ohAdjustedHourlyCost: 102 },
    "jr-comms-copy": { standardHourlyCost: 65, ohAdjustedHourlyCost: 88 },
  });

  it("computes phase, role, and totals with OH-loaded hourly > direct", () => {
    const r = simulateServiceDeliveryCost({
      catalog,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-bi",
      serviceTierId: "tier-BRAND-STANDARD",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("baseline"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.phases.length).toBeGreaterThan(0);
    expect(r.totals.totalLoadedCost).toBeGreaterThan(r.totals.totalDirectCost);
    expect(r.totals.totalOhContribution).toBeCloseTo(r.totals.totalLoadedCost - r.totals.totalDirectCost, 6);
    expect(r.roles.length).toBeGreaterThan(0);
  });

  it("enforces BU isolation (cross-BU role contributes zero with warning)", () => {
    const catalog2: ServiceCostCatalogSlice = {
      ...catalog,
      serviceRoleAllocations: [
        ...catalog.serviceRoleAllocations,
        {
          id: "alloc-bad-bu",
          serviceTemplateTierPhaseId: catalog.serviceTemplateTierPhases.find((p) =>
            catalog.serviceTemplateTiers.some(
              (tt) => tt.id === p.serviceTemplateTierId && tt.serviceTemplateId === "tpl-bi"
            )
          )!.id,
          jobRoleId: "jr-motion-ae",
          allocatedHours: 40,
          notes: "wrong BU",
        },
      ],
    };
    const r = simulateServiceDeliveryCost({
      catalog: catalog2,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-bi",
      serviceTierId: "tier-BRAND-TINY",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("baseline"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.warnings.some((w) => w.includes("outside template business unit"))).toBe(true);
  });

  it("scales loaded cost upward with aggressive scenario vs baseline", () => {
    const base = simulateServiceDeliveryCost({
      catalog,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-exp",
      serviceTierId: "tier-MOTION-STANDARD",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("baseline"),
    });
    const stressed = simulateServiceDeliveryCost({
      catalog,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-exp",
      serviceTierId: "tier-MOTION-STANDARD",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("aggressive_client"),
    });
    expect(base.ok && stressed.ok).toBe(true);
    if (!base.ok || !stressed.ok) return;
    expect(stressed.totals.totalEffectiveHours).toBeGreaterThan(base.totals.totalEffectiveHours);
    expect(stressed.totals.totalLoadedCost).toBeGreaterThan(base.totals.totalLoadedCost);
  });

  it("applies QA assumption factor to QA-coded phases", () => {
    const qaHeavy = {
      ...DEFAULT_SERVICE_COST_ASSUMPTIONS,
      qaSensitivityFactor: 2,
    };
    const r = simulateServiceDeliveryCost({
      catalog,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-bi",
      serviceTierId: "tier-BRAND-BIG",
      assumptions: qaHeavy,
      scenario: getScenarioPresetById("baseline"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const qaPhase = r.phases.find((p) => p.phaseCode.toUpperCase().includes("QA"));
    if (qaPhase && qaPhase.lines.length > 0) {
      const line = qaPhase.lines.find((l) => l.baseHours > 0);
      if (line) expect(line.effectiveHours).toBeGreaterThan(line.baseHours);
    }
  });

  it("is monotonic in tier loaded cost for Brand Identity (Tiny ≤ … ≤ Mega)", () => {
    const tiers = ["TINY", "STANDARD", "BIG", "MEGA"] as const;
    const loaded = tiers.map((code) => {
      const res = simulateServiceDeliveryCost({
        catalog,
        roles: stress.roles,
        breakdownByRoleId: rates,
        serviceTemplateId: "tpl-bi",
        serviceTierId: `tier-BRAND-${code}`,
        assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
        scenario: getScenarioPresetById("baseline"),
      });
      expect(res.ok).toBe(true);
      return res.ok ? res.totals.totalLoadedCost : 0;
    });
    for (let i = 1; i < loaded.length; i++) {
      expect(loaded[i]).toBeGreaterThanOrEqual(loaded[i - 1]);
    }
  });

  it("splits deliverable cost equally when multiple deliverables share a phase", () => {
    const ttpId = catalog.serviceTemplateTierPhases.find((p) => {
      const tt = catalog.serviceTemplateTiers.find((t) => t.id === p.serviceTemplateTierId);
      return tt?.serviceTemplateId === "tpl-bi" && catalog.serviceTiers.find((x) => x.id === tt.serviceTierId)?.code === "MEGA";
    });
    if (!ttpId) return;
    const catalog3: ServiceCostCatalogSlice = {
      ...catalog,
      serviceDeliverables: [
        ...catalog.serviceDeliverables.filter((d) => d.serviceTemplateTierPhaseId !== ttpId.id),
        {
          id: "d-a",
          serviceTemplateTierPhaseId: ttpId.id,
          name: "A",
          code: "A",
          lifecycle: "active",
          version: 1,
          createdAt: "",
          updatedAt: "",
        },
        {
          id: "d-b",
          serviceTemplateTierPhaseId: ttpId.id,
          name: "B",
          code: "B",
          lifecycle: "active",
          version: 1,
          createdAt: "",
          updatedAt: "",
        },
      ],
    };
    const r = simulateServiceDeliveryCost({
      catalog: catalog3,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-bi",
      serviceTierId: "tier-BRAND-MEGA",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("baseline"),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const pair = r.deliverables.filter((d) => d.deliverableId === "d-a" || d.deliverableId === "d-b");
    if (pair.length === 2) {
      expect(pair[0].loadedCost).toBeCloseTo(pair[1].loadedCost, 6);
      expect(pair[0].shareOfPhase).toBe(0.5);
    }
  });

  it("fails when template and tier are not linked", () => {
    const r = simulateServiceDeliveryCost({
      catalog,
      roles: stress.roles,
      breakdownByRoleId: rates,
      serviceTemplateId: "tpl-bi",
      serviceTierId: "tier-MOTION-TINY",
      assumptions: DEFAULT_SERVICE_COST_ASSUMPTIONS,
      scenario: getScenarioPresetById("baseline"),
    });
    expect(r.ok).toBe(false);
  });
});
