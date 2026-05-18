import { describe, expect, it } from "vitest";
import { DEFAULT_OPPORTUNITY_TIERS } from "@/data/opportunity-tiers-defaults";
import {
  resolveOpportunityTierKey,
  workbookDisplayTiersFromDefinitions,
} from "./opportunity-tier-display";

describe("opportunity-tier-display", () => {
  it("resolves tier from SAR value", () => {
    expect(resolveOpportunityTierKey(400_000, DEFAULT_OPPORTUNITY_TIERS)).toBe("tiny");
    expect(resolveOpportunityTierKey(1_000_000, DEFAULT_OPPORTUNITY_TIERS)).toBe("standard");
    expect(resolveOpportunityTierKey(8_000_000, DEFAULT_OPPORTUNITY_TIERS)).toBe("mega");
  });

  it("maps definitions to workbook display with SAR mins", () => {
    const rows = workbookDisplayTiersFromDefinitions(DEFAULT_OPPORTUNITY_TIERS);
    expect(rows[0].min).toBe(0);
    expect(rows.find((r) => r.key === "mega")?.max).toBeNull();
  });
});
