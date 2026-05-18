import { describe, expect, it } from "vitest";
import { DEFAULT_OPPORTUNITY_TIERS } from "@/data/opportunity-tiers-defaults";
import { resolveDealTierKey, resolveDealTierContext } from "./resolve-opportunity-tier-profile";
import type { OpportunityTierProfile } from "@/types/incentives";

describe("resolveOpportunityTierProfile with plan profiles", () => {
  const tightServiceProfile: OpportunityTierProfile[] = [
    {
      scope: "service",
      serviceId: "svc-a",
      hrBusinessUnitId: "bu-1",
      effectiveFrom: "2026-01-01",
      tiers: DEFAULT_OPPORTUNITY_TIERS.map((t) =>
        t.key === "standard"
          ? { ...t, minValueSar: 1_000_000, maxValueSar: 5_000_000 }
          : t
      ),
    },
  ];

  it("uses service profile over company defaults", () => {
    const ctx = resolveDealTierContext(3_000_000, {
      company: { hrBusinessUnitId: "bu-1", opportunityTiers: DEFAULT_OPPORTUNITY_TIERS },
      serviceId: "svc-a",
      profiles: tightServiceProfile,
    });
    expect(ctx.scope).toBe("service");
    expect(ctx.tierKey).toBe("standard");
  });

  it("resolveDealTierKey respects profiles", () => {
    const key = resolveDealTierKey(
      3_000_000,
      { hrBusinessUnitId: "bu-1", opportunityTiers: DEFAULT_OPPORTUNITY_TIERS },
      tightServiceProfile,
      "svc-a"
    );
    expect(key).toBe("standard");
  });

  it("without profile, 1.5M is standard on default tiers", () => {
    expect(resolveDealTierKey(1_500_000, null)).toBe("standard");
  });
});
