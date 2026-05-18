import { describe, expect, it } from "vitest";
import {
  isLegacyIncentivePlanId,
  isValidUuid,
  newIncentiveUuid,
} from "./uuid";

describe("incentive uuid", () => {
  it("generates valid UUIDs", () => {
    const id = newIncentiveUuid();
    expect(isValidUuid(id)).toBe(true);
  });

  it("detects legacy plan ids", () => {
    expect(isLegacyIncentivePlanId("plan-Lotf")).toBe(true);
    expect(isLegacyIncentivePlanId(newIncentiveUuid())).toBe(false);
  });
});
