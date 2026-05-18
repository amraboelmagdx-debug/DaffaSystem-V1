import { describe, expect, it } from "vitest";
import { createDefaultIncentivePlan } from "./default-plan";
import { evaluateIncentiveRun } from "./evaluate-incentive-run";
import { ingestIncentiveFacts, createIncentiveFactsStore } from "./incentive-facts-ingest";
import { V2_EVALUATE_INCENTIVE_RUN_OPTIONS } from "@/types/incentives";
import { dealsFromFactBatch } from "./fact-to-deal-projector";
import { resolveDealTierKey } from "@/lib/planning/resolve-opportunity-tier-profile";

describe("evaluateIncentiveRun", () => {
  const plan = createDefaultIncentivePlan({
    organizationId: "org-1",
    hrBusinessUnitId: "bu-1",
    companyId: "co-1",
  });

  const standardDeal = {
    id: "d1",
    label: "Acme SAR 1.2M",
    tierKey: "standard" as const,
    dealValueSar: 1_200_000,
    marginSar: 400_000,
    referral: false,
    clientType: "existing_client" as const,
    complexity: "normal" as const,
    accrualMonth: "2026-03",
  };

  it("produces snapshot lines for a standard deal", () => {
    const result = evaluateIncentiveRun({
      plan,
      periodYear: 2026,
      mode: "simulation",
      scorecardMultiplier: 1,
      participants: [
        {
          jobRoleId: "role-1",
          layerId: "layer-close",
          displayName: "Closer A",
          employeeCount: 1,
        },
      ],
      deals: [standardDeal],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.companyTotalSar).toBeGreaterThan(0);
    expect(result.snapshot.lines.length).toBeGreaterThan(0);
    expect(result.snapshot.explainLines.some((e) => e.formulaId === "deal_pool")).toBe(true);
    expect(result.snapshot.engineVersion).toBe(1);
  });

  it("v1 parity: default options match engine version 1 and no retained", () => {
    const result = evaluateIncentiveRun({
      plan,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [standardDeal],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.engineVersion).toBe(1);
    expect(result.snapshot.companyRetainedSar).toBe(0);
    expect(result.snapshot.optionsUsed?.applyReserve).toBeFalsy();
  });

  it("matches tiny tier rule without warning", () => {
    const result = evaluateIncentiveRun({
      plan,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [
        {
          ...standardDeal,
          id: "d-tiny",
          tierKey: "tiny",
          dealValueSar: 80_000,
          marginSar: 24_000,
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.warnings.some((w) => w.includes("No matching rule"))).toBe(false);
    expect(result.snapshot.companyTotalSar).toBeGreaterThan(0);
  });

  it("v2 applies reserve when options enabled", () => {
    const result = evaluateIncentiveRun({
      plan,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [standardDeal],
      options: V2_EVALUATE_INCENTIVE_RUN_OPTIONS,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.snapshot.engineVersion).toBe(2);
    expect(result.snapshot.companyRetainedSar).toBeGreaterThan(0);
    expect(
      result.snapshot.explainLines.some((e) => e.formulaId === "company_reserve")
    ).toBe(true);
  });

  it("applies referralRateByTier bonus when v2 referral flag on", () => {
    const p = {
      ...createDefaultIncentivePlan({
        organizationId: "org-1",
        hrBusinessUnitId: "bu-1",
      }),
      referrerShareOfCommission: 0,
    };
    const base = evaluateIncentiveRun({
      plan: p,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [{ ...standardDeal, referral: false }],
      options: {
        ...V2_EVALUATE_INCENTIVE_RUN_OPTIONS,
        useReferrerShare: false,
        useReferralRateByTier: true,
        usePlanStackingRules: false,
        applyReserve: false,
        useLayerMatrix: false,
        usePayoutDrivers: false,
      },
    });
    const ref = evaluateIncentiveRun({
      plan: p,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [{ ...standardDeal, id: "d-ref2", referral: true }],
      options: {
        ...V2_EVALUATE_INCENTIVE_RUN_OPTIONS,
        useReferrerShare: false,
        useReferralRateByTier: true,
        usePlanStackingRules: false,
        applyReserve: false,
        useLayerMatrix: false,
        usePayoutDrivers: false,
      },
    });
    expect(base.ok && ref.ok).toBe(true);
    if (!base.ok || !ref.ok) return;
    expect(ref.snapshot.companyTotalSar).toBeGreaterThan(base.snapshot.companyTotalSar);
    expect(
      ref.snapshot.explainLines.some((e) => e.formulaId === "referral_tier_rate")
    ).toBe(true);
  });

  it("applies manager team rule on manager layer", () => {
    const p = createDefaultIncentivePlan({
      organizationId: "org-1",
      hrBusinessUnitId: "bu-1",
    });
    const full = evaluateIncentiveRun({
      plan: p,
      periodYear: 2026,
      mode: "simulation",
      participants: [
        {
          jobRoleId: "mgr",
          layerId: "layer-mgr",
          displayName: "Mgr",
          employeeCount: 1,
        },
      ],
      deals: [standardDeal],
      managerTeamAttainment: 1.1,
      options: {
        ...V2_EVALUATE_INCENTIVE_RUN_OPTIONS,
        applyManagerTeamRule: true,
        applyReserve: false,
        useLayerMatrix: false,
        usePayoutDrivers: false,
      },
    });
    const under = evaluateIncentiveRun({
      plan: p,
      periodYear: 2026,
      mode: "simulation",
      participants: [
        {
          jobRoleId: "mgr",
          layerId: "layer-mgr",
          displayName: "Mgr",
          employeeCount: 1,
        },
      ],
      deals: [standardDeal],
      managerTeamAttainment: 0.5,
      options: {
        ...V2_EVALUATE_INCENTIVE_RUN_OPTIONS,
        applyManagerTeamRule: true,
        applyReserve: false,
        useLayerMatrix: false,
        usePayoutDrivers: false,
      },
    });
    expect(full.ok && under.ok).toBe(true);
    if (!full.ok || !under.ok) return;
    expect(full.snapshot.byLayer["layer-mgr"] ?? 0).toBeGreaterThan(
      under.snapshot.byLayer["layer-mgr"] ?? 0
    );
  });

  it("applies referral layer only when referral deal", () => {
    const withRef = evaluateIncentiveRun({
      plan,
      periodYear: 2026,
      mode: "simulation",
      participants: [],
      deals: [
        {
          id: "d-ref",
          label: "Referral mega",
          tierKey: "big",
          dealValueSar: 3_000_000,
          marginSar: 900_000,
          referral: true,
          clientType: "new_client",
          complexity: "normal",
          accrualMonth: "2026-04",
        },
      ],
    });
    expect(withRef.ok).toBe(true);
    if (!withRef.ok) return;
    expect(withRef.snapshot.byLayer["layer-ref"] ?? 0).toBeGreaterThan(0);
  });
});

describe("resolveDealTierKey", () => {
  it("resolves tier from deal value", () => {
    expect(resolveDealTierKey(50_000, null)).toBe("tiny");
    expect(resolveDealTierKey(1_500_000, null)).toBe("standard");
  });
});

describe("dealsFromFactBatch", () => {
  it("projects order_signed into deals", () => {
    const deals = dealsFromFactBatch([
      {
        id: "e1",
        tenantId: "t1",
        organizationId: "o1",
        hrBusinessUnitId: "bu1",
        sourceSystem: "crm-demo",
        sourceEventId: "evt-1",
        occurredAt: "2026-02-01T00:00:00Z",
        ingestedAt: "2026-02-02T00:00:00Z",
        type: "order_signed",
        payload: {
          dealId: "d1",
          valueSar: 500_000,
          marginSar: 150_000,
          at: "2026-02-01T00:00:00Z",
        },
      },
    ]);
    expect(deals).toHaveLength(1);
    expect(deals[0].dealValueSar).toBe(500_000);
  });
});

describe("ingestIncentiveFacts", () => {
  it("dedupes by source id", () => {
    const store = createIncentiveFactsStore();
    const event = {
      id: "e1",
      tenantId: "t1",
      organizationId: "o1",
      hrBusinessUnitId: "bu1",
      sourceSystem: "crm-demo",
      sourceEventId: "evt-1",
      occurredAt: "2026-01-01T00:00:00Z",
      ingestedAt: "2026-01-02T00:00:00Z",
      type: "order_signed" as const,
      payload: {
        dealId: "d1",
        valueSar: 100_000,
        at: "2026-01-01T00:00:00Z",
      },
    };
    const r1 = ingestIncentiveFacts(store, [event]);
    const r2 = ingestIncentiveFacts(store, [event]);
    expect(r1.accepted).toHaveLength(1);
    expect(r2.duplicates).toHaveLength(1);
    expect(store.records).toHaveLength(1);
  });
});
