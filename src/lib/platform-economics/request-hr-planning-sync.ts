import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { bootstrapOperationalWorkspaceFromHr } from "@/lib/platform-economics/bootstrap-operational-workspace";
import type { OperationalWorkspaceBootstrapResult } from "@/lib/platform-economics/bootstrap-operational-workspace";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Push latest HR catalog to server, sync active BUs → planning companies, hydrate workspace.
 */
export async function requestHrPlanningSyncNow(): Promise<OperationalWorkspaceBootstrapResult | null> {
  const orgId = getActiveOrganizationId();
  if (!orgId) return null;
  return bootstrapOperationalWorkspaceFromHr(orgId);
}

export function requestHrPlanningSyncDebounced(delayMs = 800): void {
  if (debounceTimer != null) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void requestHrPlanningSyncNow();
  }, delayMs);
}
