import type { IncentivePersistenceBackend } from "@/lib/persistence/persistence-status";

export type IncentiveApiMeta = {
  persistenceBackend: IncentivePersistenceBackend;
  fallbackActive: boolean;
};
