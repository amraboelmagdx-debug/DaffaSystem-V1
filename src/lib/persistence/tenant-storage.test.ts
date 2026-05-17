import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { StateStorage } from "zustand/middleware";

function createMemoryStorage(): StateStorage & { dump: () => Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    getItem: (name) => data[name] ?? null,
    setItem: (name, value) => {
      data[name] = value;
    },
    removeItem: (name) => {
      delete data[name];
    },
    dump: () => ({ ...data }),
  };
}

describe("tenant-storage", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env, NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST: "true" };
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("uses distinct keys per organization", async () => {
    const { setActiveOrganizationId } = await import("./active-tenant");
    const { createTenantScopedStorage } = await import("./tenant-storage");
    const { HR_WORKFORCE_BASE_KEY } = await import("./persist-keys");

    const orgA = "00000000-0000-4000-8000-0000000000a1";
    const orgB = "00000000-0000-4000-8000-0000000000b2";
    const inner = createMemoryStorage();

    setActiveOrganizationId(orgA);
    const storageA = createTenantScopedStorage(HR_WORKFORCE_BASE_KEY, inner);
    await storageA.setItem("efp-hr-workforce", JSON.stringify({ org: "A" }));

    setActiveOrganizationId(orgB);
    const storageB = createTenantScopedStorage(HR_WORKFORCE_BASE_KEY, inner);
    await storageB.setItem("efp-hr-workforce", JSON.stringify({ org: "B" }));

    setActiveOrganizationId(orgA);
    const readA = await storageA.getItem("efp-hr-workforce");
    expect(JSON.parse(readA!)).toEqual({ org: "A" });

    setActiveOrganizationId(orgB);
    const readB = await storageB.getItem("efp-hr-workforce");
    expect(JSON.parse(readB!)).toEqual({ org: "B" });

    const keys = Object.keys(inner.dump());
    expect(keys).toContain(`efp-${orgA}-hr-workforce`);
    expect(keys).toContain(`efp-${orgB}-hr-workforce`);
    expect(keys).not.toContain("efp-hr-workforce");
  });

  it("returns null HR key when org unset under dual_write (no legacy fallback)", async () => {
    vi.stubEnv("NEXT_PUBLIC_PERSIST_MODE", "dual_write");
    const { setActiveOrganizationId } = await import("./active-tenant");
    const { resolvePersistStorageKey } = await import("./tenant-storage");
    const { HR_WORKFORCE_BASE_KEY } = await import("./persist-keys");

    setActiveOrganizationId(null);
    expect(resolvePersistStorageKey(HR_WORKFORCE_BASE_KEY)).toBeNull();
  });

  it("falls back to legacy key when active org is unset and local_only", async () => {
    vi.stubEnv("NEXT_PUBLIC_PERSIST_MODE", "local_only");
    const { setActiveOrganizationId } = await import("./active-tenant");
    const { createTenantScopedStorage, resolvePersistStorageKey } = await import("./tenant-storage");
    const { HR_WORKFORCE_BASE_KEY, legacyPersistKeyForBase } = await import("./persist-keys");

    setActiveOrganizationId(null);
    expect(resolvePersistStorageKey(HR_WORKFORCE_BASE_KEY)).toBe(
      legacyPersistKeyForBase(HR_WORKFORCE_BASE_KEY)
    );

    const inner = createMemoryStorage();
    const storage = createTenantScopedStorage(HR_WORKFORCE_BASE_KEY, inner);
    await storage.setItem("efp-hr-workforce", JSON.stringify({ legacy: true }));
    expect(inner.dump()[legacyPersistKeyForBase(HR_WORKFORCE_BASE_KEY)]).toBeDefined();
  });
});
