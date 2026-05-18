import type { IncentiveFactEvent, OrderSignedFact, CashReceivedFact, CollectionReceivedFact, OpportunityCreatedFact } from "@/types/incentive-facts";
import type { IncentiveDealInput } from "@/types/incentives";
import { resolveDealTierKey } from "@/lib/planning/resolve-opportunity-tier-profile";
import type { DemoCompany } from "@/types/domain";

const dealShells = new Map<string, Partial<IncentiveDealInput>>();

export function projectFactToDealShell(event: IncentiveFactEvent): void {
  if (event.type === "opportunity_created") {
    const p = (event as OpportunityCreatedFact).payload;
    dealShells.set(p.opportunityId, {
      id: p.opportunityId,
      label: p.opportunityId,
      tierKey: p.tierKey,
      dealValueSar: p.dealValueSar,
      referral: p.referral,
      clientType: p.clientType,
      complexity: p.complexity,
      accrualMonth: event.occurredAt.slice(0, 7),
    });
  }
  if (event.type === "order_signed") {
    const p = (event as OrderSignedFact).payload;
    const id = p.opportunityId ?? p.dealId;
    const existing = dealShells.get(id) ?? { id };
    dealShells.set(id, {
      ...existing,
      id,
      label: id,
      dealValueSar: p.valueSar,
      marginSar: p.marginSar,
      accrualMonth: p.at.slice(0, 7),
    });
  }
}

export function dealsFromFactBatch(
  events: IncentiveFactEvent[],
  company?: Pick<DemoCompany, "opportunityTiers" | "hrBusinessUnitId"> | null
): IncentiveDealInput[] {
  dealShells.clear();
  for (const e of events) {
    projectFactToDealShell(e);
  }
  return [...dealShells.values()]
    .filter((d): d is IncentiveDealInput => Boolean(d.id && d.dealValueSar))
    .map((d) => ({
      id: d.id!,
      label: d.label ?? d.id!,
      tierKey: d.tierKey ?? resolveDealTierKey(d.dealValueSar!, company),
      dealValueSar: d.dealValueSar!,
      marginSar: d.marginSar,
      referral: d.referral ?? false,
      clientType: d.clientType ?? "existing_client",
      complexity: d.complexity ?? "normal",
      accrualMonth: d.accrualMonth ?? new Date().toISOString().slice(0, 7),
    }));
}

export function applyCashEventsToDeals(
  deals: IncentiveDealInput[],
  events: IncentiveFactEvent[]
): IncentiveDealInput[] {
  const byId = new Map(deals.map((d) => [d.id, { ...d }]));
  for (const e of events) {
    if (e.type === "cash_received") {
      const p = (e as CashReceivedFact).payload;
      const d = byId.get(p.dealId);
      if (d) d.marginSar = (d.marginSar ?? 0) + p.amountSar * 0.1;
    }
    if (e.type === "collection_received") {
      const p = (e as CollectionReceivedFact).payload;
      if (p.dealId) {
        const d = byId.get(p.dealId);
        if (d) d.accrualMonth = e.occurredAt.slice(0, 7);
      }
    }
  }
  return [...byId.values()];
}

/** Read-only: estimate collections impact on payout recognition (CRM hook stub). */
export function collectionsImpactOnPayout(
  lines: { dealId: string; payoutMonth: string; amountSar: number }[],
  events: IncentiveFactEvent[]
): { dealId: string; shiftedPayoutMonth: string; deltaSar: number }[] {
  const impacts: { dealId: string; shiftedPayoutMonth: string; deltaSar: number }[] = [];
  for (const e of events) {
    if (e.type !== "collection_received") continue;
    const p = (e as CollectionReceivedFact).payload;
    if (!p.dealId) continue;
    const line = lines.find((l) => l.dealId === p.dealId);
    if (!line) continue;
    impacts.push({
      dealId: p.dealId,
      shiftedPayoutMonth: e.occurredAt.slice(0, 7),
      deltaSar: p.amountSar * 0.05,
    });
  }
  return impacts;
}
