import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { putHrCatalog } from "./put-hr-catalog";

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

describe("putHrCatalog", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("maps 200 to ok with meta", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        meta: {
          organizationId: "org-a",
          engineVersion: "1",
          updatedAt: "2026-05-17T12:00:00.000Z",
        },
      }),
    });

    const result = await putHrCatalog({ catalog: minimalCatalog });
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.meta.organizationId).toBe("org-a");
    }
  });

  it("maps 409 to conflict", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 409,
      json: async () => ({ error: "conflict" }),
    });

    const result = await putHrCatalog({ catalog: minimalCatalog });
    expect(result).toEqual({ kind: "conflict", message: "conflict" });
  });

  it("marks 503 as retryable error", async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 503,
      statusText: "Service Unavailable",
      text: async () => "",
    });

    const result = await putHrCatalog({ catalog: minimalCatalog });
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.retryable).toBe(true);
    }
  });
});
