/**
 * Deal Economics contract (BU-rooted).
 */

import type {
  ServiceEconomicsGraphContext,
  ServiceEconomicsLineage,
  ServiceEconomicsSnapshot,
} from "@/lib/service-economics/types";

export type DealEconomicsLineInput = {
  id: string;
  label: string;
  quantity: number;
  /** Defaults to deal-level serviceTemplateId when omitted. */
  serviceTemplateId?: string;
  /** Defaults to deal-level serviceTierId when omitted. */
  serviceTierId?: string;
  unitCostSar?: number;
  unitPriceSar?: number;
  revenueStreamId?: string | null;
};

export type DealEconomicsInput = {
  organizationId: string;
  hrBusinessUnitId: string;
  /** Planning projection UUID — derived for executive rollup only. */
  companyId?: string;
  revenueStreamId?: string | null;
  serviceTemplateId: string;
  serviceTierId: string;
  serviceFamilyId?: string | null;
  currency: string;
  lines: DealEconomicsLineInput[];
};

export type DealEconomicsGraphEdge =
  | { kind: "tenant"; organizationId: string }
  | { kind: "business_unit"; hrBusinessUnitId: string; companyId?: string }
  | { kind: "revenue_stream"; streamId: string }
  | { kind: "service_template"; templateId: string; tierId: string };

export const DEAL_ECONOMICS_CONTRACT_VERSION = 1;
export const DEAL_ECONOMICS_ENGINE_VERSION = 1;

export type DealEconomicsMeasures = {
  totalQuantity: number;
  directCost: number;
  loadedCost: number;
  ohContribution: number;
  effectiveHours: number;
  minSellPrice?: number;
  suggestedPrice?: number;
  grossMarginPct?: number;
  contributionMarginPct?: number;
};

export type DealEconomicsLineResult = {
  lineId: string;
  label: string;
  quantity: number;
  serviceTemplateId: string;
  serviceTierId: string;
  measures: DealEconomicsMeasures;
};

export type DealEconomicsResultSuccess = {
  ok: true;
  contractVersion: typeof DEAL_ECONOMICS_CONTRACT_VERSION;
  engineVersion: typeof DEAL_ECONOMICS_ENGINE_VERSION;
  graph: ServiceEconomicsGraphContext;
  graphEdges: DealEconomicsGraphEdge[];
  lineage: ServiceEconomicsLineage;
  lineResults: DealEconomicsLineResult[];
  lineSnapshots: ServiceEconomicsSnapshot[];
  rollup: DealEconomicsMeasures;
  warnings: string[];
};

export type DealEconomicsResultFailure = {
  ok: false;
  errors: string[];
  warnings: string[];
};

export type DealEconomicsResult = DealEconomicsResultSuccess | DealEconomicsResultFailure;

/** Persisted run row shape (matches migration 010). */
export type DealEconomicsRunRecord = {
  id: string;
  organizationId: string;
  hrBusinessUnitId: string;
  inputJson: DealEconomicsInput;
  resultJson: DealEconomicsResultSuccess;
  engineVersion: number;
  contractVersion: number;
  createdAt: string;
};
