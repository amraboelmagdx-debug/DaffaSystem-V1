import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockEq = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelect = vi.fn(() => ({ eq: mockEq }));
const mockFrom = vi.fn(() => ({ select: mockSelect }));

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteSupabaseClient: vi.fn().mockResolvedValue({
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

describe("loadHrWorkforceCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("queries hr_workforce_catalog scoped to organization_id", async () => {
    const orgA = "00000000-0000-4000-8000-000000000001";
    mockMaybeSingle.mockResolvedValue({
      data: {
        organization_id: orgA,
        payload: { businessUnits: [] },
        engine_version: "1",
        updated_at: "2026-01-01T00:00:00Z",
      },
      error: null,
    });

    const { loadHrWorkforceCatalog } = await import("./load-hr-catalog");
    const row = await loadHrWorkforceCatalog(orgA);

    expect(mockFrom).toHaveBeenCalledWith("hr_workforce_catalog");
    expect(mockEq).toHaveBeenCalledWith("organization_id", orgA);
    expect(row?.organizationId).toBe(orgA);
    expect(row?.payload).toEqual({ businessUnits: [] });
  });

  it("returns null when no row (cross-tenant denial at RLS / empty result)", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { loadHrWorkforceCatalog } = await import("./load-hr-catalog");
    const row = await loadHrWorkforceCatalog(
      "00000000-0000-4000-8000-000000000099"
    );

    expect(row).toBeNull();
    expect(mockEq).toHaveBeenCalledWith(
      "organization_id",
      "00000000-0000-4000-8000-000000000099"
    );
  });

  it("never uses a different org id than requested in the query", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const { loadHrWorkforceCatalog } = await import("./load-hr-catalog");
    await loadHrWorkforceCatalog("org-a");
    await loadHrWorkforceCatalog("org-b");

    expect(mockEq).toHaveBeenNthCalledWith(1, "organization_id", "org-a");
    expect(mockEq).toHaveBeenNthCalledWith(2, "organization_id", "org-b");
  });
});

describe("assertOrganizationMembership (cross-tenant)", () => {
  it("forbids switching to org not in memberships", async () => {
    const { assertOrganizationMembership } = await import("@/server/tenant/context");
    const { TenantForbiddenError } = await import("@/server/tenant/errors");

    expect(() =>
      assertOrganizationMembership(
        {
          userId: "user-1",
          organizationId: "org-a",
          organizationName: "A",
          role: "admin",
          memberships: [
            {
              organizationId: "org-a",
              organizationName: "A",
              role: "admin",
            },
          ],
        },
        "org-b"
      )
    ).toThrow(TenantForbiddenError);
  });
});
