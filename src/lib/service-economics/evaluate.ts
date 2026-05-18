import { runCommercialPricingIntelligence } from "@/lib/commercial-pricing-intelligence/engine";
import type { CommercialPricingIntelligenceInput } from "@/lib/commercial-pricing-intelligence/types";
import { operationalPricingBasisFromSimulation } from "@/lib/commercial-pricing-intelligence/operational-basis";
import { buildServiceCostSimulationInput } from "@/lib/service-cost-simulation/hr-input";
import { simulateServiceDeliveryCost } from "@/lib/service-cost-simulation/engine";
import type { ServiceCostCatalogSlice, ServiceCostScenarioModifiers } from "@/lib/service-cost-simulation/types";
import type { ServiceCostAssumptions } from "@/lib/service-cost-simulation/types";
import type { HrWorkforceDerived } from "@/lib/hr-workforce/workspace-projection";
import {
  defaultServiceEconomicsLineage,
  SERVICE_ECONOMICS_MEASURE_KEYS,
  type ServiceEconomicsAllocationLine,
  type ServiceEconomicsResult,
  type ServiceEconomicsSnapshot,
} from "@/lib/service-economics/types";
import { resolveCompanyIdForBusinessUnit } from "@/lib/service-economics/resolve-graph";
import { validateServiceEconomicsRefs } from "@/lib/service-economics/validate-refs";

export type EvaluateServiceEconomicsInput = {
  organizationId?: string;
  catalog: ServiceCostCatalogSlice;
  workforce: HrWorkforceDerived;
  roles: Array<{ id: string; businessUnitId: string; name: string; archived?: boolean }>;
  businessUnitIds: string[];
  serviceTemplateId: string;
  serviceTierId: string;
  currency: string;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostScenarioModifiers;
  companies?: Array<{ id: string; hrBusinessUnitId?: string | null }>;
  commercial?: Omit<CommercialPricingIntelligenceInput, "basis">;
  lineage?: {
    serviceCatalogUpdatedAt?: string;
    hrCatalogUpdatedAt?: string;
  };
};

function allocationLinesFromCost(
  cost: ServiceEconomicsSnapshot["cost"]
): ServiceEconomicsAllocationLine[] {
  const lines: ServiceEconomicsAllocationLine[] = [];
  for (const phase of cost.phases) {
    for (const line of phase.lines) {
      lines.push({
        allocationId: line.allocationId,
        jobRoleId: line.jobRoleId,
        roleName: line.roleName,
        effectiveHours: line.effectiveHours,
        directCost: line.directCost,
        loadedCost: line.loadedCost,
        ohContribution: line.ohContribution,
      });
    }
  }
  return lines;
}

function minSellPriceFromCommercial(
  commercial: Omit<CommercialPricingIntelligenceInput, "model">
): number | undefined {
  const costPlus = runCommercialPricingIntelligence({
    ...commercial,
    model: { modelId: "cost_plus", markupPct: 0 },
  });
  if (!costPlus.ok) return undefined;
  return costPlus.suggestedCommercialPrice;
}

export function evaluateServiceEconomics(
  input: EvaluateServiceEconomicsInput
): ServiceEconomicsResult {
  const refIssues = validateServiceEconomicsRefs({
    catalog: input.catalog,
    businessUnitIds: new Set(input.businessUnitIds),
    jobRoleIds: new Set(input.roles.map((r) => r.id)),
    serviceTemplateId: input.serviceTemplateId,
    serviceTierId: input.serviceTierId,
  });
  if (refIssues.length > 0) {
    return {
      ok: false,
      errors: refIssues.map((i) => i.message),
      warnings: [],
    };
  }

  const costResult = simulateServiceDeliveryCost(
    buildServiceCostSimulationInput({
      catalog: input.catalog,
      workforce: input.workforce,
      roles: input.roles as Parameters<typeof buildServiceCostSimulationInput>[0]["roles"],
      serviceTemplateId: input.serviceTemplateId,
      serviceTierId: input.serviceTierId,
      assumptions: input.assumptions,
      scenario: input.scenario,
    })
  );

  if (!costResult.ok) {
    return { ok: false, errors: costResult.errors, warnings: [] };
  }

  const template = input.catalog.serviceTemplates.find((t) => t.id === costResult.templateId);
  const companyId = resolveCompanyIdForBusinessUnit(
    costResult.businessUnitId,
    input.companies ?? []
  );

  const basis = operationalPricingBasisFromSimulation(costResult, input.currency);
  let commercial: ServiceEconomicsSnapshot["commercial"];
  let minSellPrice: number | undefined;
  let suggestedPrice: number | undefined;
  let grossMarginPct: number | undefined;
  let contributionMarginPct: number | undefined;

  if (input.commercial) {
    const commercialResult = runCommercialPricingIntelligence({
      basis,
      model: input.commercial.model,
      activeRiskIds: input.commercial.activeRiskIds,
      scenario: input.commercial.scenario,
      thresholds: input.commercial.thresholds,
    });
    if (commercialResult.ok) {
      commercial = commercialResult;
      suggestedPrice = commercialResult.suggestedCommercialPrice;
      grossMarginPct = commercialResult.margins.grossMarginPct;
      contributionMarginPct = commercialResult.margins.contributionMarginPct;
      minSellPrice = minSellPriceFromCommercial({
        basis,
        activeRiskIds: input.commercial.activeRiskIds,
        scenario: input.commercial.scenario,
        thresholds: input.commercial.thresholds,
      });
    }
  } else {
    minSellPrice = basis.totalLoadedCost;
  }

  const lineage = {
    ...defaultServiceEconomicsLineage(),
    ...input.lineage,
  };

  const measures = {
    directCost: costResult.totals.totalDirectCost,
    loadedCost: costResult.totals.totalLoadedCost,
    ohContribution: costResult.totals.totalOhContribution,
    effectiveHours: costResult.totals.totalEffectiveHours,
    minSellPrice,
    suggestedPrice,
    grossMarginPct,
    contributionMarginPct,
  };

  void SERVICE_ECONOMICS_MEASURE_KEYS;

  return {
    ok: true,
    graph: {
      organizationId: input.organizationId,
      companyId,
      hrBusinessUnitId: costResult.businessUnitId,
      serviceFamilyId: template?.serviceFamilyId,
      templateId: costResult.templateId,
      tierId: costResult.tierId,
      currency: input.currency,
    },
    lineage,
    measures,
    warnings: [...costResult.warnings],
    allocationLines: allocationLinesFromCost(costResult),
    cost: costResult,
    commercial,
  };
}
