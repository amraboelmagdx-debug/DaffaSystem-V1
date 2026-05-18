import type { CommercialPricingIntelligenceInput } from "@/lib/commercial-pricing-intelligence/types";
import { resolveCompanyIdForBusinessUnit } from "@/lib/service-economics/resolve-graph";
import { buildServiceEconomicsEvaluateInput } from "@/lib/service-economics/build-evaluate-input";
import { evaluateServiceEconomics } from "@/lib/service-economics/evaluate";
import type { ServiceEconomicsSnapshot } from "@/lib/service-economics/types";
import type { HrWorkforceDerived } from "@/lib/hr-workforce/workspace-projection";
import type {
  ServiceCostAssumptions,
  ServiceCostCatalogSlice,
  ServiceCostScenarioModifiers,
} from "@/lib/service-cost-simulation/types";
import { buildDealEconomicsGraphEdges } from "./build-graph";
import type {
  DealEconomicsInput,
  DealEconomicsLineResult,
  DealEconomicsMeasures,
  DealEconomicsResult,
} from "./types";
import {
  DEAL_ECONOMICS_CONTRACT_VERSION,
  DEAL_ECONOMICS_ENGINE_VERSION,
} from "./types";
import { validateDealEconomicsInput } from "./validate-input";
import {
  validateDealEconomicsIntegrity,
  type StreamBuSlice,
} from "./validate-integrity";
import { marginsFromPriceAndCostTotals } from "@/lib/planning/primitives";
import { defaultServiceEconomicsLineage } from "@/lib/service-economics/types";

export type EvaluateDealEconomicsParams = {
  input: DealEconomicsInput;
  catalog: ServiceCostCatalogSlice;
  workforce: HrWorkforceDerived;
  roles: Array<{ id: string; businessUnitId: string; name: string; archived?: boolean }>;
  businessUnitIds: string[];
  companies: Array<{ id: string; hrBusinessUnitId?: string | null }>;
  assumptions: ServiceCostAssumptions;
  scenario: ServiceCostScenarioModifiers;
  streamsById?: Map<string, StreamBuSlice>;
  commercial?: Omit<CommercialPricingIntelligenceInput, "basis">;
  dealId?: string | null;
  lineage?: {
    serviceCatalogUpdatedAt?: string;
    hrCatalogUpdatedAt?: string;
  };
};

function scaleMeasures(
  snap: ServiceEconomicsSnapshot,
  quantity: number,
  unitCostSar?: number,
  unitPriceSar?: number
): DealEconomicsMeasures {
  const q = Math.max(0, quantity);
  const directCost =
    unitCostSar != null ? unitCostSar * q : snap.measures.directCost * q;
  const loadedCost = snap.measures.loadedCost * q;
  const ohContribution = snap.measures.ohContribution * q;
  const effectiveHours = snap.measures.effectiveHours * q;
  let suggestedPrice = snap.measures.suggestedPrice != null ? snap.measures.suggestedPrice * q : undefined;
  if (unitPriceSar != null) suggestedPrice = unitPriceSar * q;
  let grossMarginPct = snap.measures.grossMarginPct;
  let contributionMarginPct = snap.measures.contributionMarginPct;
  if (suggestedPrice != null && suggestedPrice > 0) {
    const margins = marginsFromPriceAndCostTotals({
      directCost,
      loadedCost,
      ohContribution,
      suggestedPrice,
    });
    grossMarginPct = margins.grossMarginPct;
    contributionMarginPct = margins.contributionMarginPct;
  }
  return {
    totalQuantity: q,
    directCost,
    loadedCost,
    ohContribution,
    effectiveHours,
    minSellPrice: snap.measures.minSellPrice != null ? snap.measures.minSellPrice * q : undefined,
    suggestedPrice,
    grossMarginPct,
    contributionMarginPct,
  };
}

function rollupLineMeasures(lines: DealEconomicsLineResult[]): DealEconomicsMeasures {
  const rollup: DealEconomicsMeasures = {
    totalQuantity: 0,
    directCost: 0,
    loadedCost: 0,
    ohContribution: 0,
    effectiveHours: 0,
  };
  let priceSum = 0;
  let hasPrice = false;
  for (const line of lines) {
    rollup.totalQuantity += line.measures.totalQuantity;
    rollup.directCost += line.measures.directCost;
    rollup.loadedCost += line.measures.loadedCost;
    rollup.ohContribution += line.measures.ohContribution;
    rollup.effectiveHours += line.measures.effectiveHours;
    if (line.measures.suggestedPrice != null) {
      priceSum += line.measures.suggestedPrice;
      hasPrice = true;
    }
  }
  if (hasPrice && priceSum > 0) {
    rollup.suggestedPrice = priceSum;
    const margins = marginsFromPriceAndCostTotals({
      directCost: rollup.directCost,
      loadedCost: rollup.loadedCost,
      ohContribution: rollup.ohContribution,
      suggestedPrice: priceSum,
    });
    rollup.grossMarginPct = margins.grossMarginPct;
    rollup.contributionMarginPct = margins.contributionMarginPct;
  }
  return rollup;
}

export function evaluateDealEconomics(params: EvaluateDealEconomicsParams): DealEconomicsResult {
  const { input } = params;
  const warnings: string[] = [];

  const struct = validateDealEconomicsInput(input);
  if (!struct.ok) {
    return { ok: false, errors: struct.errors, warnings };
  }

  const integrityErrors = validateDealEconomicsIntegrity(
    input,
    params.catalog,
    params.streamsById ?? new Map()
  );
  if (integrityErrors.length) {
    return { ok: false, errors: integrityErrors, warnings };
  }

  const companyId =
    input.companyId ??
    resolveCompanyIdForBusinessUnit(input.hrBusinessUnitId, params.companies);

  const economicsBase = {
    catalog: params.catalog,
    workforce: params.workforce,
    roles: params.roles,
    businessUnitIds: params.businessUnitIds,
    companies: params.companies,
    currency: input.currency,
    assumptions: params.assumptions,
    scenario: params.scenario,
  };

  const lineSnapshots: ServiceEconomicsSnapshot[] = [];
  const lineResults: DealEconomicsLineResult[] = [];

  for (const line of input.lines) {
    const serviceTemplateId = line.serviceTemplateId ?? input.serviceTemplateId;
    const serviceTierId = line.serviceTierId ?? input.serviceTierId;

    const result = evaluateServiceEconomics({
      ...buildServiceEconomicsEvaluateInput(
        economicsBase,
        serviceTemplateId,
        serviceTierId,
        params.commercial
      ),
      organizationId: input.organizationId,
      lineage: params.lineage,
    });

    if (!result.ok) {
      return {
        ok: false,
        errors: result.errors.map((e) => `Line ${line.id}: ${e}`),
        warnings: [...result.warnings, ...warnings],
      };
    }

    warnings.push(...result.warnings);
    lineSnapshots.push(result);

    const measures = scaleMeasures(
      result,
      line.quantity,
      line.unitCostSar,
      line.unitPriceSar
    );
    lineResults.push({
      lineId: line.id,
      label: line.label,
      quantity: line.quantity,
      serviceTemplateId,
      serviceTierId,
      measures,
    });
  }

  const primary = lineSnapshots[0]!;
  const graph = {
    ...primary.graph,
    organizationId: input.organizationId,
    companyId: companyId ?? primary.graph.companyId,
    hrBusinessUnitId: input.hrBusinessUnitId,
    revenueStreamId: input.revenueStreamId ?? null,
    dealId: params.dealId ?? null,
    templateId: input.serviceTemplateId,
    tierId: input.serviceTierId,
    currency: input.currency,
  };

  const lineage = {
    ...defaultServiceEconomicsLineage(),
    ...params.lineage,
  };

  return {
    ok: true,
    contractVersion: DEAL_ECONOMICS_CONTRACT_VERSION,
    engineVersion: DEAL_ECONOMICS_ENGINE_VERSION,
    graph,
    graphEdges: buildDealEconomicsGraphEdges(input, graph),
    lineage,
    lineResults,
    lineSnapshots,
    rollup: rollupLineMeasures(lineResults),
    warnings,
  };
}
