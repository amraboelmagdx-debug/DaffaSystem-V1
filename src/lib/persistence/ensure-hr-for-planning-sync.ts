import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { executeHrCatalogPendingUplift } from "@/lib/persistence/execute-hr-catalog-uplift";
import { hasMeaningfulLocalHrCatalog } from "@/lib/persistence/hydrate-hr-catalog";
import { isSupabaseConfigured } from "@/lib/persistence/is-supabase-configured";
import {
  fingerprintHrCatalog,
  partializeHrCatalogFromState,
} from "@/lib/persistence/hr-catalog-payload";
import { putHrCatalog } from "@/lib/persistence/put-hr-catalog";
import { shouldSyncToServer } from "@/lib/persistence/persist-mode";
import { hrHydrationDebugLog } from "@/lib/persistence/hr-hydration-debug";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export type EnsureHrForPlanningSyncResult = {
  ok: boolean;
  attempted: boolean;
  error?: string;
};

/**
 * Ensures the server HR catalog row matches local before `syncHrCatalogToPlanningWorkspace`.
 * Planning sync reads Supabase only — local-only ZAN must be uplifted first.
 */
export async function ensureHrCatalogOnServerForSync(
  organizationId: string
): Promise<EnsureHrForPlanningSyncResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, attempted: false };
  }

  const state = useHrWorkforceStore.getState();
  const hasActiveBu = state.businessUnits.some((b) => b.isActive);
  if (!hasMeaningfulLocalHrCatalog(state) || !hasActiveBu) {
    return { ok: true, attempted: false };
  }

  if (shouldSyncToServer()) {
    await executeHrCatalogPendingUplift(organizationId);
    try {
      await flushHrCatalogSync(organizationId, { skipExpectedUpdatedAt: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      hrHydrationDebugLog("ensureHr flush failed", { organizationId, message });
      return { ok: false, attempted: true, error: message };
    }
    return { ok: true, attempted: true };
  }

  const catalog = partializeHrCatalogFromState(state);
  const result = await putHrCatalog({ catalog });
  if (result.kind !== "ok") {
    const message =
      result.kind === "validation" || result.kind === "error"
        ? result.message
        : result.kind === "conflict"
          ? result.message
          : "HR catalog upload failed";
    return { ok: false, attempted: true, error: message };
  }

  hrHydrationDebugLog("ensureHr direct put", {
    organizationId,
    fingerprint: fingerprintHrCatalog(catalog),
  });
  return { ok: true, attempted: true };
}
