import type { IncentiveFactEvent, IncentiveFactEventRecord } from "@/types/incentive-facts";
import { incentiveFactDedupeKey } from "@/types/incentive-facts";

export type IncentiveFactsStore = {
  records: IncentiveFactEventRecord[];
};

export type IngestIncentiveFactsResult = {
  accepted: IncentiveFactEventRecord[];
  duplicates: string[];
  errors: string[];
};

/**
 * Idempotent append of CRM/actuals facts (in-memory; Supabase deferred).
 */
export function ingestIncentiveFacts(
  store: IncentiveFactsStore,
  events: IncentiveFactEvent[]
): IngestIncentiveFactsResult {
  const accepted: IncentiveFactEventRecord[] = [];
  const duplicates: string[] = [];
  const errors: string[] = [];
  const seen = new Set(store.records.map((r) => r.dedupeKey));

  for (const event of events) {
    const dedupeKey = incentiveFactDedupeKey(event.sourceSystem, event.sourceEventId);
    if (seen.has(dedupeKey)) {
      duplicates.push(dedupeKey);
      continue;
    }
    if (!event.tenantId || !event.hrBusinessUnitId) {
      errors.push(`Invalid event ${event.id}: missing tenant or BU`);
      continue;
    }
    const record: IncentiveFactEventRecord = {
      ...event,
      dedupeKey,
      ingestedAt: event.ingestedAt ?? new Date().toISOString(),
    };
    store.records.push(record);
    seen.add(dedupeKey);
    accepted.push(record);
  }

  return { accepted, duplicates, errors };
}

export function createIncentiveFactsStore(): IncentiveFactsStore {
  return { records: [] };
}
