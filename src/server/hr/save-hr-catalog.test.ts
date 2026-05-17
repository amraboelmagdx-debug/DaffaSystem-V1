import { beforeEach, describe, expect, it, vi } from "vitest";

const mockMaybeSingle = vi.fn();
const mockEqSelect = vi.fn(() => ({ maybeSingle: mockMaybeSingle }));
const mockSelectConflict = vi.fn(() => ({ eq: mockEqSelect }));
const mockSingle = vi.fn();
const mockSelectUpsert = vi.fn(() => ({ single: mockSingle }));
const mockUpsert = vi.fn(() => ({ select: mockSelectUpsert }));
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/route-handler", () => ({
  createRouteSupabaseClient: vi.fn().mockResolvedValue({
    from: mockFrom,
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

const minimalCatalog = {
  businessUnits: [],
  departments: [],
  teams: [],
  roles: [],
  hrGlobalSettings: {
    workingDaysPerWeek: 5,
    workingHoursPerDay: 8,
    weeksPerYear: 52,
    offDaysPerYear: 0,
    defaultCurrency: "USD",
  },
  ohManualByBusinessUnitId: {},
};

describe("saveHrWorkforceCatalog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFrom.mockImplementation((table: string) => {
      if (table !== "hr_workforce_catalog") throw new Error(`unexpected table ${table}`);
      return {
        select: (cols: string) => {
          if (cols === "updated_at") return { eq: mockEqSelect };
          return { single: mockSingle };
        },
        upsert: mockUpsert,
      };
    });
  });

  it("upserts catalog scoped to organization_id", async () => {
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({
      data: {
        organization_id: "org-a",
        engine_version: "1",
        updated_at: "2026-05-17T12:00:00.000Z",
      },
      error: null,
    });

    const { saveHrWorkforceCatalog } = await import("./save-hr-catalog");
    const result = await saveHrWorkforceCatalog({
      organizationId: "org-a",
      userId: "user-1",
      catalog: minimalCatalog,
      engineVersion: "1",
    });

    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        organization_id: "org-a",
        payload: minimalCatalog,
        engine_version: "1",
        updated_by: "user-1",
      }),
      { onConflict: "organization_id" }
    );
    expect(result.organizationId).toBe("org-a");
  });

  it("throws TenantConflictError when expectedUpdatedAt mismatches", async () => {
    mockMaybeSingle.mockResolvedValue({
      data: { updated_at: "2026-05-17T12:00:00.000Z" },
      error: null,
    });

    const { saveHrWorkforceCatalog } = await import("./save-hr-catalog");
    const { TenantConflictError } = await import("@/server/tenant/errors");

    await expect(
      saveHrWorkforceCatalog({
        organizationId: "org-a",
        userId: "user-1",
        catalog: minimalCatalog,
        engineVersion: "1",
        expectedUpdatedAt: "2026-05-16T00:00:00.000Z",
      })
    ).rejects.toBeInstanceOf(TenantConflictError);

    expect(mockUpsert).not.toHaveBeenCalled();
  });
});
