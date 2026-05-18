import { describe, expect, it } from "vitest";
import { createDefaultIncentivePlan } from "./default-plan";
import {
  buildDefaultLayerMatrix,
  layerPctFromMatrix,
  sumLayerMatrixForTier,
} from "./plan-matrix";
import { managerTeamMultiplier } from "./manager-team-adjust";

describe("plan-matrix", () => {
  const plan = createDefaultIncentivePlan({
    organizationId: "o1",
    hrBusinessUnitId: "bu1",
  });

  it("builds matrix entries for all layers and tiers", () => {
    const matrix = buildDefaultLayerMatrix(plan);
    expect(matrix.length).toBeGreaterThan(0);
    plan.layerMatrix = matrix;
    const sum = sumLayerMatrixForTier(plan, "standard");
    expect(sum).toBeGreaterThan(0);
  });

  it("resolves layer pct from matrix", () => {
    plan.layerMatrix = buildDefaultLayerMatrix(plan);
    const pct = layerPctFromMatrix(plan, "layer-close", "standard");
    expect(pct).toBeGreaterThan(0);
  });
});

describe("managerTeamMultiplier", () => {
  const rule = {
    teamAchievedMinPct: 0.8,
    teamOverPct: 1,
    managerFullMultiplier: 1,
    managerUnderTeamMultiplier: 0.85,
    managerOverTeamBonusPct: 0.1,
  };

  it("applies under-team multiplier", () => {
    expect(managerTeamMultiplier(rule, 0.5).mult).toBe(0.85);
  });

  it("applies over-team bonus", () => {
    expect(managerTeamMultiplier(rule, 1.2).mult).toBeCloseTo(1.1);
  });
});
