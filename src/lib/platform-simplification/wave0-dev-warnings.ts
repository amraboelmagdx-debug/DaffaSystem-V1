import { DEMO_ORG_ID } from "@/data/demo-seed";
import { isTenantNamespacedPersistEnabled } from "@/lib/persistence/persist-mode";
import { isOrphanOperationalUnit } from "@/lib/platform-economics/operational-unit";
import type { DemoCompany } from "@/types/domain";

/** Global Zustand persist names — not org-scoped (Wave 0 visibility). */
export const GLOBAL_NON_TENANT_PERSIST_KEYS = [
  "efp-sales-plan-wizard",
  "efp-service-cost-simulation-prefs-v1",
  "efp-commercial-pricing-prefs-v1",
] as const;

const emitted = new Set<string>();

function warnOnce(key: string, message: string, detail?: unknown): void {
  if (process.env.NODE_ENV === "production") return;
  if (emitted.has(key)) return;
  emitted.add(key);
  if (detail !== undefined) {
    console.warn(`[EFP Wave0] ${message}`, detail);
  } else {
    console.warn(`[EFP Wave0] ${message}`);
  }
}

export type Wave0DevWarningInput = {
  routeContext: string;
  companies: DemoCompany[];
  organizationId: string | null;
  selectedCompanyId?: string;
};

export function emitWave0DevWarnings(input: Wave0DevWarningInput): void {
  const { routeContext, companies, organizationId, selectedCompanyId } = input;

  const orphans = companies.filter((c) => isOrphanOperationalUnit(c));
  if (orphans.length > 0) {
    warnOnce(
      `orphans:${routeContext}`,
      `Orphan planning projection row(s) without hrBusinessUnitId (${orphans.length}). Prefer HR-linked units only.`,
      orphans.map((c) => ({ id: c.id, name: c.name }))
    );
  }

  const demoOrgCompanies = companies.filter(
    (c) =>
      c.organizationId === DEMO_ORG_ID ||
      c.id.startsWith("co-northwind") ||
      c.id.startsWith("co-aurora")
  );
  if (demoOrgCompanies.length > 0 && organizationId && organizationId !== DEMO_ORG_ID) {
    warnOnce(
      `demo-org-mix:${routeContext}`,
      "Workspace contains demo-seed style companies while active tenant is not org-demo-001. Avoid sample-data load on real tenants.",
      demoOrgCompanies.map((c) => c.id)
    );
  }

  if (selectedCompanyId) {
    const selected = companies.find((c) => c.id === selectedCompanyId);
    if (selected && isOrphanOperationalUnit(selected)) {
      warnOnce(
        `orphan-selected:${routeContext}:${selectedCompanyId}`,
        `Selected company "${selected.name}" is not HR-linked. Legacy planning-company assumption — sync from HR Workforce.`,
        { companyId: selected.id }
      );
    }
  }

  if (
    typeof window !== "undefined" &&
    isTenantNamespacedPersistEnabled() &&
    organizationId
  ) {
    for (const key of GLOBAL_NON_TENANT_PERSIST_KEYS) {
      try {
        const raw = localStorage.getItem(key);
        if (raw && raw.length > 2) {
          warnOnce(
            `global-persist:${key}`,
            `Non-tenant-scoped localStorage key "${key}" has data while tenant namespacing is enabled. Wave 2 will migrate to efp-{orgId}-*.`,
            { organizationId, bytes: raw.length }
          );
        }
      } catch {
        /* ignore storage access errors */
      }
    }
  }
}

/** Reset emitted keys (tests only). */
export function resetWave0DevWarningsForTests(): void {
  emitted.clear();
}
