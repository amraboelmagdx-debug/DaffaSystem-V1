import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBrowserMocks() {
  const local: Record<string, string> = {};
  const session: Record<string, string> = {};
  const localStorage = {
    getItem: (k: string) => local[k] ?? null,
    setItem: (k: string, v: string) => {
      local[k] = v;
    },
    removeItem: (k: string) => {
      delete local[k];
    },
  };
  const sessionStorage = {
    getItem: (k: string) => session[k] ?? null,
    setItem: (k: string, v: string) => {
      session[k] = v;
    },
    removeItem: (k: string) => {
      delete session[k];
    },
  };
  return { local, session, localStorage, sessionStorage };
}

describe("legacy-persist-migrate", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env, NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST: "true" };
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("copies SA legacy global to namespaced once per org (not HR)", async () => {
    const { local, session, localStorage, sessionStorage } = createBrowserMocks();
    vi.stubGlobal("window", { localStorage, sessionStorage });

    const orgId = "00000000-0000-4000-8000-0000000000a1";
    local["efp-service-architecture-v1"] = JSON.stringify({ serviceFamilies: [] });
    local["efp-hr-workforce"] = JSON.stringify({ businessUnits: [{ id: "stale" }] });

    const { migrateLegacyPersistForOrganization } = await import("./legacy-persist-migrate");
    const {
      tenantPersistKey,
      HR_WORKFORCE_BASE_KEY,
      SERVICE_ARCHITECTURE_BASE_KEY,
      legacyMigratedSessionKey,
    } = await import("./persist-keys");

    migrateLegacyPersistForOrganization(orgId);

    const saNamespaced = tenantPersistKey(orgId, SERVICE_ARCHITECTURE_BASE_KEY);
    const hrNamespaced = tenantPersistKey(orgId, HR_WORKFORCE_BASE_KEY);

    expect(local[saNamespaced]).toBe(local["efp-service-architecture-v1"]);
    expect(local[hrNamespaced]).toBeUndefined();
    expect(session[legacyMigratedSessionKey(orgId)]).toBe("1");
  });
});
