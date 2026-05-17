import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence/persist-mode", () => ({
  shouldSyncToServer: vi.fn(() => true),
}));

vi.mock("@/lib/persistence/hr-catalog-dual-write", () => ({
  flushHrCatalogSync: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/persistence/hr-catalog-uplift", () => ({
  isHrCatalogPendingServerUplift: vi.fn(),
  clearHrCatalogPendingServerUplift: vi.fn(),
}));

vi.mock("@/lib/persistence/hydrate-hr-catalog", () => ({
  hasMeaningfulLocalHrCatalog: vi.fn(() => true),
}));

vi.mock("@/stores/use-hr-workforce-store", () => ({
  useHrWorkforceStore: {
    getState: () => ({
      businessUnits: [{ id: "bu_1" }],
      roles: [],
    }),
  },
}));

describe("executeHrCatalogPendingUplift", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("does not flush when uplift is not pending", async () => {
    const uplift = await import("./hr-catalog-uplift");
    const dualWrite = await import("./hr-catalog-dual-write");
    vi.mocked(uplift.isHrCatalogPendingServerUplift).mockReturnValue(false);

    const { executeHrCatalogPendingUplift } = await import("./execute-hr-catalog-uplift");
    const result = await executeHrCatalogPendingUplift("org-a");

    expect(dualWrite.flushHrCatalogSync).not.toHaveBeenCalled();
    expect(result.reason).toBe("no_pending_uplift");
  });

  it("flushes with skipExpectedUpdatedAt when pending uplift", async () => {
    const uplift = await import("./hr-catalog-uplift");
    const dualWrite = await import("./hr-catalog-dual-write");
    vi.mocked(uplift.isHrCatalogPendingServerUplift)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);

    const { executeHrCatalogPendingUplift } = await import("./execute-hr-catalog-uplift");
    const result = await executeHrCatalogPendingUplift("org-a");

    expect(dualWrite.flushHrCatalogSync).toHaveBeenCalledWith("org-a", {
      skipExpectedUpdatedAt: true,
    });
    expect(result.success).toBe(true);
  });
});
