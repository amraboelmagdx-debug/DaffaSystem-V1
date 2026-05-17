import { afterEach, describe, expect, it, vi } from "vitest";

describe("hr-hydration-debug", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not attach window global in production", async () => {
    const env = { ...process.env, NODE_ENV: "production" };
    vi.stubGlobal("window", {} as Window);
    vi.resetModules();
    process.env = env;

    const { installHrHydrationDebugGlobal, getHrHydrationDebugSnapshot } = await import(
      "./hr-hydration-debug"
    );
    installHrHydrationDebugGlobal();
    expect(getHrHydrationDebugSnapshot()).toBeNull();
    expect((window as Window & { __EFP_HR_HYDRATION_DEBUG?: unknown }).__EFP_HR_HYDRATION_DEBUG).toBe(
      undefined
    );
  });

  it("exposes debug snapshot on window in development", async () => {
    const env = { ...process.env, NODE_ENV: "development" };
    vi.stubGlobal("window", {} as Window);
    vi.resetModules();
    process.env = env;

    const {
      installHrHydrationDebugGlobal,
      patchHrHydrationDebug,
      recordHrHydrationDebugError,
    } = await import("./hr-hydration-debug");

    installHrHydrationDebugGlobal();
    patchHrHydrationDebug({
      organizationId: "org-1",
      source: "server",
      lastServerHydrationAt: "2026-06-01T00:00:00.000Z",
      lastLocalHydrationAt: "2026-01-01T00:00:00.000Z",
      pendingUplift: false,
    });
    recordHrHydrationDebugError("test error");

    const snap = window.__EFP_HR_HYDRATION_DEBUG?.getSnapshot?.();
    expect(snap?.source).toBe("server");
    expect(snap?.lastServerHydrationAt).toBe("2026-06-01T00:00:00.000Z");
    expect(snap?.hydrationErrors).toContain("test error");
  });
});
