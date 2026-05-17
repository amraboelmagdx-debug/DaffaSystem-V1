import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { writeHrCatalogLocalPersistSnapshot } from "@/lib/persistence/hr-catalog-local-persist";
import { syncEconomicsGraphFromHr } from "@/lib/platform-economics/client-sync";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import type { SampleDataResult } from "../types";
import { SAMPLE_PACK_ID } from "../types";

function ok(action: SampleDataResult["action"], message?: string): SampleDataResult {
  return { ok: true, moduleId: "hr-workforce", action, message };
}

function fail(action: SampleDataResult["action"], reason: string): SampleDataResult {
  return { ok: false, moduleId: "hr-workforce", action, reason };
}

async function syncCatalogToServer(): Promise<void> {
  const orgId = getActiveOrganizationId();
  if (!orgId) return;
  writeHrCatalogLocalPersistSnapshot(orgId, new Date().toISOString());
  await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
}

export async function clearHrWorkforceSample(): Promise<SampleDataResult> {
  useHrWorkforceStore.getState().resetModule();
  try {
    await syncCatalogToServer();
    return ok("clear", "HR catalog cleared");
  } catch (e) {
    return fail("clear", e instanceof Error ? e.message : "sync_failed");
  }
}

export async function loadHrWorkforceSample(): Promise<SampleDataResult> {
  const store = useHrWorkforceStore.getState();
  store.resetModule();
  const seeded = store.seedDemoWorkforce();
  if (!seeded.ok) {
    return fail("load", seeded.reason ?? "seed_failed");
  }
  try {
    await syncCatalogToServer();
    try {
      await syncEconomicsGraphFromHr();
    } catch {
      /* executive layer refreshes on next page load */
    }
    return ok("load", `${SAMPLE_PACK_ID}: demo workforce loaded`);
  } catch (e) {
    return fail("load", e instanceof Error ? e.message : "sync_failed");
  }
}

export async function resetHrWorkforceSample(): Promise<SampleDataResult> {
  return loadHrWorkforceSample();
}
