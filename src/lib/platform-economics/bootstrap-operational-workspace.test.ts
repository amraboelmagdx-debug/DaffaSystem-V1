import { beforeEach, describe, expect, it, vi } from "vitest";

const callOrder: string[] = [];

const ensureHr = vi.fn(async () => {
  callOrder.push("ensure");
  return { ok: true, attempted: true };
});

vi.mock("@/lib/persistence/ensure-hr-for-planning-sync", () => ({
  ensureHrCatalogOnServerForSync: (...args: unknown[]) => ensureHr(...args),
}));

vi.mock("@/stores/use-workspace-store", () => ({
  rehydrateWorkspaceStore: async () => {
    callOrder.push("rehydrate");
  },
  useWorkspaceStore: {
    getState: () => ({
      companies: [{ id: "co-1", name: "ZAN", hrBusinessUnitId: "bu-zan" }],
      tierLineOverrides: {},
    }),
    setState: vi.fn(),
  },
}));

vi.mock("@/stores/use-hr-workforce-store", () => ({
  useHrWorkforceStore: {
    getState: () => ({
      businessUnits: [{ id: "bu-zan", name: "ZAN", isActive: true }],
    }),
  },
}));

vi.mock("@/lib/persistence/persist-mode", () => ({
  shouldHydrateWorkspaceFromServer: () => true,
}));

vi.mock("./workspace-bootstrap-state", () => ({
  useWorkspaceBootstrapStore: {
    getState: () => ({
      setLoading: vi.fn(),
      setResult: vi.fn(),
    }),
  },
}));

describe("bootstrapOperationalWorkspaceFromHr", () => {
  beforeEach(() => {
    callOrder.length = 0;
    vi.clearAllMocks();
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/economics/sync")) {
          callOrder.push("sync");
          return {
            ok: true,
            json: async () => ({
              ok: true,
              organizationId: "org-1",
              companiesUpserted: 1,
              linksUpserted: 1,
              streamsCreated: 1,
              streamsUpdated: 0,
              scenariosCreated: 1,
              companiesRetired: 0,
              errors: [],
            }),
          };
        }
        callOrder.push("workspace");
        return {
          ok: true,
          json: async () => ({
            source: "supabase",
            organization: { id: "org-1", name: "Org" },
            companies: [
              {
                id: "co-1",
                name: "ZAN",
                organization_id: "org-1",
                fixed_costs_monthly: 0,
                baseline_revenue_monthly: 0,
                growth_target_pct: 0.15,
                margin_target_pct: 0.38,
                np_target_pct: 0.12,
                market_segments: [],
                metadata: { hrBusinessUnitId: "bu-zan" },
              },
            ],
            company_hr_links: [{ company_id: "co-1", hr_business_unit_id: "bu-zan" }],
            revenue_streams: [],
            scenarios: [],
            opportunities: [],
          }),
        };
      })
    );
  });

  it("handles 401 sync without throwing and sets authRequired", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (String(url).includes("/economics/sync")) {
          return {
            ok: false,
            status: 401,
            statusText: "Unauthorized",
            json: async () => ({
              error: "Sign in required for planning projection sync (RLS uses your session).",
            }),
          };
        }
        return { ok: false, json: async () => ({ source: "none" }) };
      })
    );

    const { bootstrapOperationalWorkspaceFromHr } = await import(
      "./bootstrap-operational-workspace"
    );
    const result = await bootstrapOperationalWorkspaceFromHr("org-1");

    expect(result.authRequired).toBe(true);
    expect(result.errors.some((e) => e.includes("Sign in"))).toBe(true);
    expect(result.errors.some((e) => e.includes("not iterable"))).toBe(false);
  });

  it("runs uplift before planning sync and workspace GET", async () => {
    const { bootstrapOperationalWorkspaceFromHr } = await import(
      "./bootstrap-operational-workspace"
    );

    const result = await bootstrapOperationalWorkspaceFromHr("org-1");

    expect(callOrder.indexOf("ensure")).toBeLessThan(callOrder.indexOf("sync"));
    expect(callOrder).toContain("workspace");
    expect(result.linkedUnitCount).toBeGreaterThanOrEqual(1);
    expect(ensureHr).toHaveBeenCalledWith("org-1");
  });
});
