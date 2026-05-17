import { beforeEach, describe, expect, it, vi } from "vitest";

describe("active-tenant", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("notifies subscribers on org change", async () => {
    const { setActiveOrganizationId, subscribeActiveOrganizationId, getActiveOrganizationId } =
      await import("./active-tenant");

    const seen: Array<string | null> = [];
    const unsub = subscribeActiveOrganizationId((id) => seen.push(id));

    setActiveOrganizationId("org-1");
    setActiveOrganizationId("org-2");
    unsub();

    expect(getActiveOrganizationId()).toBe("org-2");
    expect(seen).toEqual(["org-1", "org-2"]);
  });

  it("requireActiveOrganizationId throws when unset", async () => {
    const { setActiveOrganizationId, requireActiveOrganizationId } = await import("./active-tenant");
    setActiveOrganizationId(null);
    expect(() => requireActiveOrganizationId()).toThrow(/not set/);
  });
});
