import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORG = "00000000-0000-4000-8000-0000000000a1";

vi.mock("@/lib/persistence/fetch-hr-catalog", () => ({
  fetchHrCatalog: vi.fn(),
}));

vi.mock("@/lib/persistence/hr-catalog-local-persist", () => ({
  writeHrCatalogLocalPersistSnapshot: vi.fn(),
}));

vi.mock("@/stores/use-hr-workforce-store", () => ({
  useHrWorkforceStore: {
    getState: vi.fn(),
  },
  mergeHrPersistedCatalogIntoState: vi.fn(),
}));

describe("hydrate-hr-catalog", () => {
  const env = { ...process.env };
  let localStore: Record<string, string>;
  let sessionStore: Record<string, string>;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...env, NEXT_PUBLIC_HR_SERVER_HYDRATE: "true" };
    localStore = {};
    sessionStore = {};
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => sessionStore[k] ?? null,
        setItem: (k: string, v: string) => {
          sessionStore[k] = v;
        },
        removeItem: (k: string) => {
          delete sessionStore[k];
        },
      },
      localStorage: {
        getItem: (k: string) => localStore[k] ?? null,
        setItem: (k: string, v: string) => {
          localStore[k] = v;
        },
        removeItem: (k: string) => {
          delete localStore[k];
        },
      },
    });
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("applies server catalog when server updatedAt is newer", async () => {
    const { fetchHrCatalog } = await import("@/lib/persistence/fetch-hr-catalog");
    const { useHrWorkforceStore, mergeHrPersistedCatalogIntoState } = await import(
      "@/stores/use-hr-workforce-store"
    );
    const { touchHrCatalogLocalMeta, parseLocalSavedAtMs } = await import(
      "@/lib/persistence/hr-catalog-local-meta"
    );

    vi.mocked(useHrWorkforceStore.getState).mockReturnValue({
      businessUnits: [{ id: "bu_1" }],
      roles: [],
    } as ReturnType<typeof useHrWorkforceStore.getState>);

    touchHrCatalogLocalMeta(ORG, "2026-01-01T00:00:00.000Z");

    vi.mocked(fetchHrCatalog).mockResolvedValue({
      kind: "ok",
      catalog: { businessUnits: [{ id: "bu_server" }] },
      meta: {
        organizationId: ORG,
        engineVersion: "1",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    });

    const { hydrateHrCatalogFromServer } = await import("./hydrate-hr-catalog");
    const result = await hydrateHrCatalogFromServer(ORG);

    expect(result.status).toBe("success");
    expect(result.source).toBe("server");
    expect(mergeHrPersistedCatalogIntoState).toHaveBeenCalled();
    expect(parseLocalSavedAtMs(ORG)).toBe(Date.parse("2026-01-01T00:00:00.000Z"));
  });

  it("prefers server when localSavedAt is ahead but no pending uplift (poisoned meta)", async () => {
    const { fetchHrCatalog } = await import("@/lib/persistence/fetch-hr-catalog");
    const { useHrWorkforceStore, mergeHrPersistedCatalogIntoState } = await import(
      "@/stores/use-hr-workforce-store"
    );
    const { touchHrCatalogLocalMeta } = await import("@/lib/persistence/hr-catalog-local-meta");

    vi.mocked(useHrWorkforceStore.getState).mockReturnValue({
      businessUnits: [{ id: "bu_stale" }],
      roles: [],
    } as ReturnType<typeof useHrWorkforceStore.getState>);

    touchHrCatalogLocalMeta(ORG, "2026-12-01T00:00:00.000Z");

    vi.mocked(fetchHrCatalog).mockResolvedValue({
      kind: "ok",
      catalog: { businessUnits: [{ id: "bu_server" }] },
      meta: {
        organizationId: ORG,
        engineVersion: "1",
        updatedAt: "2026-06-01T00:00:00.000Z",
      },
    });

    const { hydrateHrCatalogFromServer } = await import("./hydrate-hr-catalog");
    const result = await hydrateHrCatalogFromServer(ORG);

    expect(result.source).toBe("server");
    expect(result.pendingUplift).toBe(false);
    expect(mergeHrPersistedCatalogIntoState).toHaveBeenCalled();
  });

  it("keeps local and marks uplift when local is newer", async () => {
    const { fetchHrCatalog } = await import("@/lib/persistence/fetch-hr-catalog");
    const { useHrWorkforceStore, mergeHrPersistedCatalogIntoState } = await import(
      "@/stores/use-hr-workforce-store"
    );
    const { touchHrCatalogLocalMeta } = await import("@/lib/persistence/hr-catalog-local-meta");
    const { isHrCatalogPendingServerUplift } = await import("@/lib/persistence/hr-catalog-uplift");

    vi.mocked(useHrWorkforceStore.getState).mockReturnValue({
      businessUnits: [{ id: "bu_local" }],
      roles: [{ id: "role_1" }],
    } as ReturnType<typeof useHrWorkforceStore.getState>);

    touchHrCatalogLocalMeta(ORG, "2026-12-01T00:00:00.000Z");
    const { markHrCatalogPendingServerUplift } = await import("@/lib/persistence/hr-catalog-uplift");
    markHrCatalogPendingServerUplift(ORG);

    vi.mocked(fetchHrCatalog).mockResolvedValue({
      kind: "ok",
      catalog: { businessUnits: [] },
      meta: {
        organizationId: ORG,
        engineVersion: null,
        updatedAt: "2026-01-01T00:00:00.000Z",
      },
    });

    const { hydrateHrCatalogFromServer } = await import("./hydrate-hr-catalog");
    const result = await hydrateHrCatalogFromServer(ORG);

    expect(result.source).toBe("local");
    expect(result.pendingUplift).toBe(true);
    expect(mergeHrPersistedCatalogIntoState).not.toHaveBeenCalled();
    expect(isHrCatalogPendingServerUplift(ORG)).toBe(true);
  });

  it("falls back to local on fetch error", async () => {
    const { fetchHrCatalog } = await import("@/lib/persistence/fetch-hr-catalog");
    const { useHrWorkforceStore } = await import("@/stores/use-hr-workforce-store");

    vi.mocked(useHrWorkforceStore.getState).mockReturnValue({
      businessUnits: [],
      roles: [],
    } as ReturnType<typeof useHrWorkforceStore.getState>);

    vi.mocked(fetchHrCatalog).mockResolvedValue({
      kind: "error",
      status: 500,
      message: "Server error",
    });

    const { hydrateHrCatalogFromServer } = await import("./hydrate-hr-catalog");
    const result = await hydrateHrCatalogFromServer(ORG);

    expect(result.status).toBe("error");
    expect(result.source).toBe("local");
  });

  it("skips fetch when HR_SERVER_HYDRATE is false", async () => {
    vi.resetModules();
    process.env.NEXT_PUBLIC_HR_SERVER_HYDRATE = "false";
    const { fetchHrCatalog } = await import("@/lib/persistence/fetch-hr-catalog");
    const { hydrateHrCatalogFromServer } = await import("./hydrate-hr-catalog");

    const result = await hydrateHrCatalogFromServer(ORG);
    expect(result.status).toBe("skipped");
    expect(fetchHrCatalog).not.toHaveBeenCalled();
  });
});
