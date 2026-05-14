import { describe, expect, it } from "vitest";
import {
  blendedMarginFromMixLines,
  blendedMarginFromWorkbookBlocks,
  computeWorkbookTargets,
  pickBlendedMargin,
  type StreamTierGroup,
  type TierLine,
} from "./workbook-engine";

describe("workbook-engine golden (LOTF sample)", () => {
  it("sales target N7 = Fixed / (D16 − NP%)", () => {
    const fixed = 1_550_000;
    const d16 = 0.442075;
    const np = 0.2;
    const { salesTarget } = computeWorkbookTargets({
      fixedCosts: fixed,
      npTargetPct: np,
      blendedContributionMargin: d16,
    });
    expect(salesTarget).toBeCloseTo(6_402_974.284829081, 0);
  });

  it("NP at target O7 = N×D16 − Fixed", () => {
    const fixed = 1_550_000;
    const d16 = 0.442075;
    const n = 6_402_974.284829081;
    const { netProfitAtTarget } = computeWorkbookTargets({
      fixedCosts: fixed,
      npTargetPct: 0.2,
      blendedContributionMargin: d16,
    });
    const direct = n * d16 - fixed;
    expect(netProfitAtTarget).toBeCloseTo(direct, 0);
    expect(netProfitAtTarget).toBeCloseTo(1_280_594.856965816, 0);
  });

  it("ROI M3 ≈ O7 / J7", () => {
    const { roi } = computeWorkbookTargets({
      fixedCosts: 1_550_000,
      npTargetPct: 0.2,
      blendedContributionMargin: 0.442075,
    });
    expect(roi).toBeCloseTo(0.8261902303005265, 5);
  });
});

describe("blended margin modes", () => {
  it("mix-weighted average across flat lines", () => {
    const lines: TierLine[] = [
      { tierKey: "tiny", contributionMarginPct: 0.31, mixPctWithinStream: 0.25 },
      { tierKey: "std", contributionMarginPct: 0.4, mixPctWithinStream: 0.25 },
      { tierKey: "big", contributionMarginPct: 0.32, mixPctWithinStream: 0.25 },
      { tierKey: "mega", contributionMarginPct: 0.3, mixPctWithinStream: 0.25 },
    ];
    expect(blendedMarginFromMixLines(lines)).toBeCloseTo(0.3325, 6);
  });

  it("workbook block mode uses avg×blockWeight per stream group", () => {
    const g1: StreamTierGroup = {
      revenueStreamId: "s1",
      lines: [
        {
          tierKey: "tiny",
          contributionMarginPct: 0.31,
          mixPctWithinStream: 0.25,
          blockWeightPct: 0.15,
          sortOrder: 0,
        },
        {
          tierKey: "std",
          contributionMarginPct: 0.4,
          mixPctWithinStream: 0.25,
          blockWeightPct: 0.15,
          sortOrder: 1,
        },
        {
          tierKey: "big",
          contributionMarginPct: 0.32,
          mixPctWithinStream: 0.25,
          blockWeightPct: 0.15,
          sortOrder: 2,
        },
        {
          tierKey: "mega",
          contributionMarginPct: 0.3,
          mixPctWithinStream: 0.25,
          blockWeightPct: 0.15,
          sortOrder: 3,
        },
      ],
    };
    const blended = blendedMarginFromWorkbookBlocks([g1]);
    const avg = (0.31 + 0.4 + 0.32 + 0.3) / 4;
    expect(blended).toBeCloseTo(avg * 0.15, 6);
  });

  it("pickBlendedMargin chooses block mode when blockWeight present", () => {
    const groups: StreamTierGroup[] = [
      {
        revenueStreamId: "a",
        lines: [
          {
            tierKey: "tiny",
            contributionMarginPct: 0.5,
            mixPctWithinStream: 1,
            blockWeightPct: 0.4,
          },
        ],
      },
    ];
    expect(pickBlendedMargin(groups)).toBeCloseTo(0.5 * 0.4, 6);
  });
});
