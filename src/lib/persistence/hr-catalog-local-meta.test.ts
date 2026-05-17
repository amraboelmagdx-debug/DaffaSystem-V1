import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function mockBrowserStorage() {
  const local: Record<string, string> = {};
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => local[k] ?? null,
      setItem: (k: string, v: string) => {
        local[k] = v;
      },
      removeItem: (k: string) => {
        delete local[k];
      },
    },
  });
  return local;
}

describe("hr-catalog-local-meta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reads and writes localSavedAt sidecar", async () => {
    const local = mockBrowserStorage();
    const orgId = "00000000-0000-4000-8000-0000000000a1";
    const { touchHrCatalogLocalMeta, readHrCatalogLocalMeta, parseLocalSavedAtMs } = await import(
      "./hr-catalog-local-meta"
    );

    touchHrCatalogLocalMeta(orgId, "2026-05-17T12:00:00.000Z");
    const meta = readHrCatalogLocalMeta(orgId);
    expect(meta?.localSavedAt).toBe("2026-05-17T12:00:00.000Z");
    expect(parseLocalSavedAtMs(orgId)).toBe(Date.parse("2026-05-17T12:00:00.000Z"));
    expect(Object.keys(local).some((k) => k.includes("hr-workforce-meta"))).toBe(true);
  });
});
