import { describe, it, expect, beforeEach, vi } from "vitest";
import { DEMO_ORG_ID } from "@/data/demo-seed";
import {
  emitWave0DevWarnings,
  resetWave0DevWarningsForTests,
} from "@/lib/platform-simplification/wave0-dev-warnings";
import type { DemoCompany } from "@/types/domain";

describe("emitWave0DevWarnings", () => {
  beforeEach(() => {
    resetWave0DevWarningsForTests();
    vi.stubEnv("NODE_ENV", "development");
  });

  it("warns about orphan companies", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const companies: DemoCompany[] = [
      {
        id: "c1",
        name: "Orphan",
        organizationId: "org-1",
        fixedCostsMonthly: 0,
        growthTargetPct: 0,
        marginTargetPct: 0,
        npTargetPct: 0,
        revenueMonthly: 0,
        contributionMarginPct: 0.4,
        marketSegments: [],
      },
    ];
    emitWave0DevWarnings({
      routeContext: "test",
      companies,
      organizationId: "org-1",
    });
    expect(warn).toHaveBeenCalled();
    const msg = String(warn.mock.calls[0]?.[0]);
    expect(msg).toContain("Orphan");
    warn.mockRestore();
  });

  it("does not warn in production", () => {
    vi.stubEnv("NODE_ENV", "production");
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    emitWave0DevWarnings({
      routeContext: "test",
      companies: [
        {
          id: "c1",
          name: "Orphan",
          organizationId: "org-1",
          fixedCostsMonthly: 0,
          growthTargetPct: 0,
          marginTargetPct: 0,
          npTargetPct: 0,
          revenueMonthly: 0,
          contributionMarginPct: 0.4,
          marketSegments: [],
        },
      ],
      organizationId: "org-1",
    });
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });

  it("warns on demo org mix with real tenant", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    emitWave0DevWarnings({
      routeContext: "test",
      companies: [
        {
          id: "co-northwind",
          name: "Northwind",
          organizationId: DEMO_ORG_ID,
          fixedCostsMonthly: 0,
          growthTargetPct: 0,
          marginTargetPct: 0,
          npTargetPct: 0,
          revenueMonthly: 0,
          contributionMarginPct: 0.4,
          marketSegments: [],
        },
      ],
      organizationId: "real-tenant-uuid",
    });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
