/**
 * CRM / actuals fact events for incentive recalculation (Wave 7 contract).
 * Append-only; idempotent on (sourceSystem, sourceEventId).
 */

import type { OpportunityTierKey } from "@/types/sales-plan";
import type { IncentiveProposalComplexity } from "@/types/incentives";

export type IncentiveFactEventType =
  | "opportunity_created"
  | "stage_advanced"
  | "order_signed"
  | "cash_received"
  | "delivery_milestone"
  | "collection_received";

export type IncentiveFactEventBase = {
  id: string;
  tenantId: string;
  organizationId: string;
  hrBusinessUnitId: string;
  sourceSystem: string;
  sourceEventId: string;
  occurredAt: string;
  ingestedAt: string;
};

export type OpportunityCreatedFact = IncentiveFactEventBase & {
  type: "opportunity_created";
  payload: {
    opportunityId: string;
    tierKey: OpportunityTierKey;
    dealValueSar: number;
    referral: boolean;
    clientType: "new_client" | "existing_client";
    complexity: Exclude<IncentiveProposalComplexity, "any">;
  };
};

export type StageAdvancedFact = IncentiveFactEventBase & {
  type: "stage_advanced";
  payload: {
    opportunityId: string;
    stage: string;
    at: string;
  };
};

export type OrderSignedFact = IncentiveFactEventBase & {
  type: "order_signed";
  payload: {
    dealId: string;
    opportunityId?: string;
    valueSar: number;
    marginSar?: number;
    at: string;
  };
};

export type CashReceivedFact = IncentiveFactEventBase & {
  type: "cash_received";
  payload: {
    dealId: string;
    amountSar: number;
    at: string;
  };
};

export type DeliveryMilestoneFact = IncentiveFactEventBase & {
  type: "delivery_milestone";
  payload: {
    dealId: string;
    milestoneId: string;
    at: string;
  };
};

export type CollectionReceivedFact = IncentiveFactEventBase & {
  type: "collection_received";
  payload: {
    invoiceId: string;
    dealId?: string;
    amountSar: number;
    at: string;
  };
};

export type IncentiveFactEvent =
  | OpportunityCreatedFact
  | StageAdvancedFact
  | OrderSignedFact
  | CashReceivedFact
  | DeliveryMilestoneFact
  | CollectionReceivedFact;

/** Persisted row shape (logical; Supabase migration deferred). */
export type IncentiveFactEventRecord = IncentiveFactEvent & {
  dedupeKey: string;
};

export function incentiveFactDedupeKey(
  sourceSystem: string,
  sourceEventId: string
): string {
  return `${sourceSystem}::${sourceEventId}`;
}
