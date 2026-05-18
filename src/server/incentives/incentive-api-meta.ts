import type { IncentiveApiMeta } from "@/lib/incentives/api-meta";
import {
  resolveIncentivePersistenceBackend,
} from "@/server/incentives/persistence-backend";

export type { IncentiveApiMeta };

let cachedMeta: IncentiveApiMeta | null = null;
let cachedAt = 0;
const CACHE_MS = 2000;

export async function getIncentiveApiMeta(): Promise<IncentiveApiMeta> {
  const now = Date.now();
  if (cachedMeta && now - cachedAt < CACHE_MS) return cachedMeta;
  const resolved = await resolveIncentivePersistenceBackend();
  cachedMeta = {
    persistenceBackend: resolved.backend,
    fallbackActive: resolved.fallbackActive,
  };
  cachedAt = now;
  return cachedMeta;
}

export function withIncentiveMeta<T extends Record<string, unknown>>(
  payload: T,
  meta: IncentiveApiMeta
): T & { meta: IncentiveApiMeta } {
  return { ...payload, meta };
}

export async function incentiveJson<T extends Record<string, unknown>>(
  payload: T,
  init?: ResponseInit
): Promise<Response> {
  const { NextResponse } = await import("next/server");
  const meta = await getIncentiveApiMeta();
  return NextResponse.json(withIncentiveMeta(payload, meta), init);
}
