import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/persistence/persist-mode", () => ({
  shouldSyncToServer: vi.fn(() => true),
}));

const putHrCatalog = vi.fn();
vi.mock("@/lib/persistence/put-hr-catalog", () => ({
  putHrCatalog,
}));

vi.mock("@/lib/persistence/hr-catalog-uplift", () => ({
  clearHrCatalogPendingServerUplift: vi.fn(),
}));

const writeHrCatalogLocalPersistSnapshot = vi.fn();
vi.mock("@/lib/persistence/hr-catalog-local-persist", () => ({
  writeHrCatalogLocalPersistSnapshot,
}));
vi.mock("@/lib/persistence/hr-catalog-local-meta", () => ({
  readHrCatalogLocalMeta: vi.fn(() => ({ localSavedAt: "2026-05-17T10:00:00.000Z" })),
}));
vi.mock("@/lib/persistence/fetch-hr-catalog", () => ({
  fetchHrCatalog: vi.fn(),
}));

vi.mock("@/lib/persistence/active-tenant", () => ({
  getActiveOrganizationId: vi.fn(() => "org-a"),
}));

const storeState = {
  businessUnits: [{ id: "bu_1", name: "A", isActive: true, createdAt: "", updatedAt: "" }],
  departments: [] as { id: string }[],
  teams: [],
  roles: [] as { id: string; name: string }[],
  hrGlobalSettings: {
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    weeksPerYear: 52,
    offDaysPerYear: 0,
    defaultCurrency: "USD",
  },
  ohManualByBusinessUnitId: {},
  importLogs: [],
  snapshots: [],
};

vi.mock("@/stores/use-hr-workforce-store", () => ({
  useHrWorkforceStore: {
    getState: () => storeState,
    subscribe: vi.fn(() => () => {}),
  },
}));

describe("hr-catalog-dual-write", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    putHrCatalog.mockReset();
    writeHrCatalogLocalPersistSnapshot.mockReset();
    storeState.roles = [];
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("flushHrCatalogSync calls putHrCatalog when sync enabled", async () => {
    putHrCatalog.mockResolvedValue({
      kind: "ok",
      meta: {
        organizationId: "org-a",
        engineVersion: "1",
        updatedAt: "2026-05-17T12:00:00.000Z",
      },
    });

    const { flushHrCatalogSync, setHrCatalogSyncPaused } = await import("./hr-catalog-dual-write");
    const { getHrCatalogSyncState } = await import("./hr-catalog-sync-state");

    setHrCatalogSyncPaused(false);
    await flushHrCatalogSync("org-a", { skipExpectedUpdatedAt: true });

    expect(putHrCatalog).toHaveBeenCalled();
    expect(getHrCatalogSyncState().syncStatus).toBe("synced");
    expect(writeHrCatalogLocalPersistSnapshot).toHaveBeenCalledWith(
      "org-a",
      "2026-05-17T12:00:00.000Z"
    );
  });

  it("sends latest store state at flush time, not a stale debounced snapshot", async () => {
    putHrCatalog.mockResolvedValue({
      kind: "ok",
      meta: {
        organizationId: "org-a",
        engineVersion: "1",
        updatedAt: "2026-05-17T12:00:00.000Z",
      },
    });

    const { flushHrCatalogSync, setHrCatalogSyncPaused } = await import("./hr-catalog-dual-write");

    setHrCatalogSyncPaused(false);
    await flushHrCatalogSync("org-a", { skipExpectedUpdatedAt: true });

    storeState.roles = [{ id: "role_1", name: "Updated Role" } as never];

    await flushHrCatalogSync("org-a", { skipExpectedUpdatedAt: true });

    expect(putHrCatalog).toHaveBeenCalledTimes(2);
    const lastCall = putHrCatalog.mock.calls.at(-1)?.[0];
    expect(lastCall?.catalog.roles).toHaveLength(1);
    expect(lastCall?.catalog.roles[0]?.name).toBe("Updated Role");
  });

  it("serializes concurrent flushes so PUT order matches flush order", async () => {
    vi.useRealTimers();
    const putOrder: string[] = [];
    putHrCatalog.mockImplementation(async (opts: { catalog: { roles: { name: string }[] } }) => {
      const label = opts.catalog.roles[0]?.name ?? "empty";
      putOrder.push(`start-${label}`);
      await new Promise((r) => setTimeout(r, label === "First" ? 30 : 5));
      putOrder.push(`end-${label}`);
      return {
        kind: "ok",
        meta: {
          organizationId: "org-a",
          engineVersion: "1",
          updatedAt: "2026-05-17T12:00:00.000Z",
        },
      };
    });

    const { flushHrCatalogSync, setHrCatalogSyncPaused } = await import("./hr-catalog-dual-write");

    setHrCatalogSyncPaused(false);
    storeState.roles = [{ id: "role_1", name: "First" } as never];

    const first = flushHrCatalogSync("org-a", { skipExpectedUpdatedAt: true });
    storeState.roles = [{ id: "role_1", name: "Second" } as never];
    const second = flushHrCatalogSync("org-a", { skipExpectedUpdatedAt: true });

    await Promise.all([first, second]);

    expect(putOrder.indexOf("end-First")).toBeLessThan(putOrder.indexOf("start-Second"));
    const lastCall = putHrCatalog.mock.calls.at(-1)?.[0];
    expect(lastCall?.catalog.roles[0]?.name).toBe("Second");
    vi.useFakeTimers();
  });
});
