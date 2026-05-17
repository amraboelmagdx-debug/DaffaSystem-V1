import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("purge-legacy-hr-persistence", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env, NEXT_PUBLIC_PERSIST_MODE: "dual_write", NODE_ENV: "development" };
  });

  afterEach(() => {
    process.env = { ...env };
    vi.unstubAllGlobals();
  });

  it("salvages legacy blob into namespaced key when namespaced is empty", async () => {
    const local: Record<string, string> = {};
    const session: Record<string, string> = {};
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
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const orgId = "00000000-0000-4000-8000-0000000000aa";
    local["efp-hr-workforce"] = JSON.stringify({ state: { roles: [{ id: "r1" }] } });

    const { purgeLegacyHrPersistenceRemnants } = await import("./purge-legacy-hr-persistence");
    const { tenantPersistKey, HR_WORKFORCE_BASE_KEY } = await import("./persist-keys");

    const legacyVal = local["efp-hr-workforce"];
    purgeLegacyHrPersistenceRemnants(orgId);

    const namespaced = tenantPersistKey(orgId, HR_WORKFORCE_BASE_KEY);
    expect(local[namespaced]).toBe(legacyVal);
    expect(local["efp-hr-workforce"]).toBeUndefined();
  });

  it("removes legacy HR localStorage key and uplift session flag", async () => {
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

    vi.stubGlobal("window", { localStorage, sessionStorage });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));

    const orgId = "00000000-0000-4000-8000-0000000000aa";
    local["efp-hr-workforce"] = "{}";
    session[`efp-hr-pending-uplift-${orgId}`] = "1";

    const { purgeLegacyHrPersistenceRemnants } = await import("./purge-legacy-hr-persistence");
    purgeLegacyHrPersistenceRemnants(orgId);

    expect(local["efp-hr-workforce"]).toBeUndefined();
    expect(session[`efp-hr-pending-uplift-${orgId}`]).toBeUndefined();
    expect(fetch).toHaveBeenCalledWith("/api/dev/hr-workforce-disk", { method: "DELETE" });
  });
});
