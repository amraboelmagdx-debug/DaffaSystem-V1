import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("persist-mode", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults to local_only when env unset", async () => {
    process.env = { ...env };
    delete process.env.NEXT_PUBLIC_PERSIST_MODE;
    delete process.env.NEXT_PUBLIC_HR_SERVER_HYDRATE;
    const { getPersistMode, shouldHydrateHrCatalogFromServer, shouldSyncToServer } = await import(
      "./persist-mode"
    );
    expect(getPersistMode()).toBe("local_only");
    expect(shouldHydrateHrCatalogFromServer()).toBe(true);
    expect(shouldSyncToServer()).toBe(false);
  });

  it("enables server sync when dual_write", async () => {
    process.env = { ...env, NEXT_PUBLIC_PERSIST_MODE: "dual_write" };
    const { shouldHydrateHrCatalogFromServer, shouldSyncToServer } = await import("./persist-mode");
    expect(shouldHydrateHrCatalogFromServer()).toBe(true);
    expect(shouldSyncToServer()).toBe(true);
  });

  it("disables HR hydrate when NEXT_PUBLIC_HR_SERVER_HYDRATE=false", async () => {
    process.env = { ...env, NEXT_PUBLIC_HR_SERVER_HYDRATE: "false" };
    const { shouldHydrateHrCatalogFromServer } = await import("./persist-mode");
    expect(shouldHydrateHrCatalogFromServer()).toBe(false);
  });

  it("disables namespacing when flag is false", async () => {
    process.env = { ...env, NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST: "false" };
    const { isTenantNamespacedPersistEnabled } = await import("./persist-mode");
    expect(isTenantNamespacedPersistEnabled()).toBe(false);
  });
});
