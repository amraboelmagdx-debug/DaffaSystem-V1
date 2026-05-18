import {
  buildPersistenceStatusSnapshot,
  isIncentiveMemoryFallbackAllowed,
  type IncentivePersistenceBackend,
} from "@/lib/persistence/persistence-status";
import { isSupabaseConfigured } from "@/lib/persistence/persist-mode";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";

export type ResolvedIncentiveBackend = {
  backend: IncentivePersistenceBackend;
  fallbackActive: boolean;
  clientAvailable: boolean;
};

export async function resolveIncentivePersistenceBackend(): Promise<ResolvedIncentiveBackend> {
  const snapshot = buildPersistenceStatusSnapshot();
  const client = await resolveHrCatalogSupabaseClient();
  const clientAvailable = Boolean(client);

  if (isSupabaseConfigured()) {
    if (clientAvailable) {
      return { backend: "supabase", fallbackActive: false, clientAvailable: true };
    }
    if (isIncentiveMemoryFallbackAllowed()) {
      return { backend: "memory", fallbackActive: true, clientAvailable: false };
    }
    return { backend: "unavailable", fallbackActive: false, clientAvailable: false };
  }

  if (isIncentiveMemoryFallbackAllowed()) {
    return { backend: "memory", fallbackActive: false, clientAvailable: false };
  }

  return { backend: "unavailable", fallbackActive: false, clientAvailable: false };
}

export async function probeIncentiveMigration013(): Promise<boolean> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return false;
  const { error } = await supabase.from("incentive_plans").select("id").limit(1);
  return !error;
}
