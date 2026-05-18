import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { IncentivePlan, IncentiveRunRecord } from "@/types/incentives";

vi.mock("@/server/hr/resolve-hr-catalog-supabase", () => ({
  resolveHrCatalogSupabaseClient: vi.fn(),
}));

vi.mock("@/lib/persistence/persist-mode", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/persistence/persist-mode")>();
  return {
    ...actual,
    isSupabaseConfigured: vi.fn(() => false),
  };
});

describe("incentive-store persistence backend", () => {
  beforeEach(() => {
    vi.resetModules();
    delete process.env.INCENTIVE_ALLOW_MEMORY_FALLBACK;
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns unavailable when no supabase and no memory flag", async () => {
    const { saveIncentiveRun } = await import("./incentive-store");
    const record = {
      id: "run-1",
      planId: "plan-1",
      planVersion: 1,
      mode: "simulation" as const,
      periodYear: 2026,
      inputHash: "abc",
      snapshot: { totals: { poolSar: 0, retainedSar: 0, paidSar: 0 }, byLayer: {}, byParticipant: {}, explain: [] },
    } as IncentiveRunRecord;

    const result = await saveIncentiveRun("org-1", record, "bu-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.code).toBe("PERSISTENCE_UNAVAILABLE");
    }
  });

  it("uses memory when INCENTIVE_ALLOW_MEMORY_FALLBACK is set", async () => {
    vi.stubEnv("INCENTIVE_ALLOW_MEMORY_FALLBACK", "true");
    const { upsertIncentivePlan, listIncentivePlans } = await import("./incentive-store");
    const plan = {
      id: "plan-mem",
      organizationId: "org-mem",
      hrBusinessUnitId: "bu-mem",
      companyId: "co-1",
      version: 1,
      status: "draft" as const,
      layers: [],
      rules: [],
      scorecard: { components: [], weights: {} },
      payoutDrivers: [],
    } as IncentivePlan;

    const saved = await upsertIncentivePlan("org-mem", plan);
    expect(saved.ok).toBe(true);
    const listed = await listIncentivePlans("org-mem");
    expect(listed.some((p) => p.id === "plan-mem")).toBe(true);
  });
});
