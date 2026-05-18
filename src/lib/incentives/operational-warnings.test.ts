import { describe, expect, it } from "vitest";
import { createDefaultIncentivePlan } from "./default-plan";
import { evaluateOperationalWarnings } from "./operational-warnings";
import { evaluateIncentiveRun } from "./evaluate-incentive-run";

describe("evaluateOperationalWarnings", () => {
  const plan = createDefaultIncentivePlan({
    organizationId: "o1",
    hrBusinessUnitId: "bu1",
    companyId: "c1",
  });

  it("flags mega concentration when pool is tier-heavy", () => {
    const deal = {
      id: "mega-1",
      label: "Mega",
      tierKey: "mega" as const,
      dealValueSar: 5_000_000,
      marginSar: 1_500_000,
      referral: false,
      clientType: "existing_client" as const,
      complexity: "normal" as const,
      accrualMonth: "2026-01",
    };
    const result = evaluateIncentiveRun({
      plan,
      deals: [deal],
      participants: [],
      periodYear: 2026,
      mode: "simulation",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const warnings = evaluateOperationalWarnings(plan, result.snapshot, {
      deals: [deal],
      projectedRevenueSar: 10_000_000,
      npTargetPct: 0.2,
    });
    expect(warnings.some((w) => w.code === "MEGA_CONCENTRATION")).toBe(true);
  });

  it("assigns unique codes for multiple engine warnings", () => {
    const deal = {
      id: "d1",
      label: "Deal",
      tierKey: "standard" as const,
      dealValueSar: 100_000,
      marginSar: 30_000,
      referral: false,
      clientType: "existing_client" as const,
      complexity: "normal" as const,
      accrualMonth: "2026-01",
    };
    const result = evaluateIncentiveRun({
      plan,
      deals: [deal],
      participants: [],
      periodYear: 2026,
      mode: "simulation",
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const withEngine = {
      ...result.snapshot,
      warnings: ["First engine note", "Second engine note"],
    };
    const warnings = evaluateOperationalWarnings(plan, withEngine, { deals: [deal] });
    const engineCodes = warnings
      .map((w) => w.code)
      .filter((c) => c.startsWith("ENGINE_WARNING"));
    expect(engineCodes).toEqual(["ENGINE_WARNING_0", "ENGINE_WARNING_1"]);
    expect(new Set(engineCodes).size).toBe(engineCodes.length);
  });
});
