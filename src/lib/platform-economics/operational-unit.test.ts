import { describe, expect, it } from "vitest";
import {
  activeOperationalUnits,
  isLinkedOperationalUnit,
  partitionOperationalUnits,
} from "./operational-unit";
import type { DemoCompany } from "@/types/domain";

const linked: DemoCompany = {
  id: "co-1",
  name: "ZAN",
  organizationId: "org-1",
  hrBusinessUnitId: "bu-zan",
  fixedCostsMonthly: 0,
  growthTargetPct: 0,
  marginTargetPct: 0,
  npTargetPct: 0,
  revenueMonthly: 0,
  contributionMarginPct: 0.4,
  marketSegments: [],
};

const orphan: DemoCompany = {
  ...linked,
  id: "co-orphan",
  name: "Legacy",
  hrBusinessUnitId: undefined,
};

describe("operational-unit", () => {
  it("partitions linked vs orphan companies", () => {
    const { linked: l, orphans } = partitionOperationalUnits([linked, orphan]);
    expect(l).toHaveLength(1);
    expect(orphans).toHaveLength(1);
    expect(isLinkedOperationalUnit(linked)).toBe(true);
    expect(activeOperationalUnits([linked, orphan])).toEqual([linked]);
  });
});
