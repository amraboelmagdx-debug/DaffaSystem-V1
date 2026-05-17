import { afterEach, describe, expect, it, vi } from "vitest";

describe("hr-catalog-uplift", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("marks and clears pending uplift per org", async () => {
    const session: Record<string, string> = {};
    vi.stubGlobal("window", {
      sessionStorage: {
        getItem: (k: string) => session[k] ?? null,
        setItem: (k: string, v: string) => {
          session[k] = v;
        },
        removeItem: (k: string) => {
          delete session[k];
        },
      },
    });

    const orgId = "00000000-0000-4000-8000-0000000000a1";
    const {
      markHrCatalogPendingServerUplift,
      isHrCatalogPendingServerUplift,
      clearHrCatalogPendingServerUplift,
    } = await import("./hr-catalog-uplift");

    expect(isHrCatalogPendingServerUplift(orgId)).toBe(false);
    markHrCatalogPendingServerUplift(orgId);
    expect(isHrCatalogPendingServerUplift(orgId)).toBe(true);
    clearHrCatalogPendingServerUplift(orgId);
    expect(isHrCatalogPendingServerUplift(orgId)).toBe(false);
  });
});
