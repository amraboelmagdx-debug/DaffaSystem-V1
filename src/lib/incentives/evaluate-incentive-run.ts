import {
  DEFAULT_EVALUATE_INCENTIVE_RUN_OPTIONS,
  INCENTIVE_CONTRACT_VERSION,
  INCENTIVE_ENGINE_VERSION,
  type EvaluateIncentiveRunOptions,
  type IncentiveExplainLine,
  type IncentivePeriodRollup,
  type IncentivePayoutDriver,
  type IncentiveRunInput,
  type IncentiveRunResult,
  type IncentiveSnapshot,
  type IncentiveSnapshotLine,
  type SalesPhaseWeights,
} from "@/types/incentives";
import { splitAmongParticipants, resolvePhaseWeightForLayer } from "./allocate-participants";
import { matchIncentiveRule } from "./match-rule";
import { applyStackingMultipliers } from "./stacking";
import { validateIncentivePlan } from "./validate-plan";
import {
  layerPctFromMatrix,
  MATRIX_DRIVERS,
  resolveLayerSplitPct,
} from "./plan-matrix";
import type { IncentivePayoutDriverType } from "@/types/incentives";
import { applyManagerTeamAdjustment } from "./manager-team-adjust";
import type { IncentivePlan } from "@/types/incentives";

function mergeOptions(input: IncentiveRunInput): EvaluateIncentiveRunOptions {
  return { ...DEFAULT_EVALUATE_INCENTIVE_RUN_OPTIONS, ...input.options };
}

function hashInput(input: IncentiveRunInput): string {
  const opts = mergeOptions(input);
  const payload = JSON.stringify({
    planId: input.plan.id,
    planVersion: input.plan.version,
    dealIds: input.deals.map((d) => d.id).sort(),
    periodYear: input.periodYear,
    mode: input.mode,
    options: opts,
  });
  let h = 0;
  for (let i = 0; i < payload.length; i++) {
    h = (h * 31 + payload.charCodeAt(i)) | 0;
  }
  return `ih-${Math.abs(h).toString(36)}`;
}

function addMonths(ym: string, months: number): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m ?? 1) - 1 + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function computeDealPool(
  deal: IncentiveRunInput["deals"][0],
  rule: NonNullable<ReturnType<typeof matchIncentiveRule>>,
  multiplier: number
): { pool: number; basisLabel: string } {
  let base = deal.dealValueSar;
  let basisLabel = "deal_value";
  if (rule.rateType === "percent_of_margin") {
    base = deal.marginSar ?? deal.dealValueSar * 0.35;
    basisLabel = "margin";
  } else if (rule.rateType === "flat_sar") {
    return { pool: rule.rateValue * multiplier, basisLabel: "flat" };
  }
  let pool = base * rule.rateValue * multiplier;
  if (rule.maxPayoutPctOfMargin != null && deal.marginSar != null) {
    pool = Math.min(pool, deal.marginSar * rule.maxPayoutPctOfMargin);
  }
  if (rule.maxPayoutPctOfDeal != null) {
    pool = Math.min(pool, deal.dealValueSar * rule.maxPayoutPctOfDeal);
  }
  return { pool, basisLabel };
}

function stackingMultipliersFromPlan(
  deal: IncentiveRunInput["deals"][0],
  rule: NonNullable<ReturnType<typeof matchIncentiveRule>>,
  plan: IncentiveRunInput["plan"],
  usePlanRules: boolean
): number[] {
  if (usePlanRules && plan.stackingRules) {
    const r = plan.stackingRules;
    const m: number[] = [1];
    if (deal.referral && r.referralMultiplier) m.push(r.referralMultiplier);
    if (deal.clientType === "new_client" && r.newClientMultiplier) m.push(r.newClientMultiplier);
    if (deal.complexity === "internal_plus_vendors" && r.internalPlusVendorsMultiplier) {
      m.push(r.internalPlusVendorsMultiplier);
    } else if (deal.complexity === "known_budget" && r.knownBudgetMultiplier) {
      m.push(r.knownBudgetMultiplier);
    }
    if (rule.tierKey === "mega" && r.megaTierMultiplier) m.push(r.megaTierMultiplier);
    return m;
  }
  const m: number[] = [1];
  if (deal.referral) m.push(1.1);
  if (deal.clientType === "new_client") m.push(1.05);
  if (deal.complexity === "internal_plus_vendors") m.push(1.08);
  else if (deal.complexity === "known_budget") m.push(1.03);
  if (rule.tierKey === "mega") m.push(1.05);
  return m;
}

function participantsForLayer(
  input: IncentiveRunInput,
  layerId: string
): IncentiveRunInput["participants"] {
  const assigned = input.plan.participantAssignments?.filter((a) => a.layerId === layerId);
  if (assigned?.length) {
    const byRole = new Map(input.participants.map((p) => [p.jobRoleId, p]));
    return assigned
      .map((a) => byRole.get(a.jobRoleId))
      .filter((p): p is IncentiveRunInput["participants"][0] => Boolean(p));
  }
  return input.participants.filter((p) => p.layerId === layerId);
}

function phaseWeightsForDeal(
  deal: IncentiveRunInput["deals"][0],
  rule: NonNullable<ReturnType<typeof matchIncentiveRule>>,
  plan: IncentivePlan
): SalesPhaseWeights {
  const base = deal.salesPhaseAttribution ?? rule.phaseWeights;
  const policy = plan.bdPhasePolicy;
  if (!policy) return base;
  const merged = { ...policy.defaultPhaseWeights, ...base };
  let mult = 1;
  if (deal.complexity === "known_budget") {
    mult *= policy.leadTypeMultipliers?.known_budget ?? 1;
  } else {
    mult *= policy.leadTypeMultipliers?.normal ?? 1;
  }
  if (deal.complexity === "internal_plus_vendors") {
    mult *= policy.proposalTypeMultipliers?.internal_plus_vendors ?? 1;
  } else if (deal.complexity === "internal_team") {
    mult *= policy.proposalTypeMultipliers?.internal_team ?? 1;
  }
  if (mult === 1) return merged;
  const sum =
    merged.lead_gen + merged.technical + merged.financial + merged.closing;
  if (sum <= 0) return merged;
  return {
    lead_gen: (merged.lead_gen / sum) * mult,
    technical: (merged.technical / sum) * mult,
    financial: (merged.financial / sum) * mult,
    closing: (merged.closing / sum) * mult,
  };
}

function emitPayoutLines(
  deal: IncentiveRunInput["deals"][0],
  layerId: string,
  participantId: string,
  jobRoleId: string,
  amountSar: number,
  drivers: IncentivePayoutDriver[],
  useDrivers: boolean,
  defaultLag: number,
  phaseKey?: IncentiveSnapshotLine["phaseKey"],
  driverFilter?: IncentivePayoutDriverType
): IncentiveSnapshotLine[] {
  const activeDrivers = driverFilter
    ? drivers.filter((d) => d.type === driverFilter)
    : drivers;
  if (!useDrivers || activeDrivers.length === 0) {
    return [
      {
        dealId: deal.id,
        layerId,
        participantId: jobRoleId,
        jobRoleId,
        accrualMonth: deal.accrualMonth,
        payoutMonth: addMonths(deal.accrualMonth, defaultLag),
        amountSar,
        phaseKey,
        lifecycleState: "accrued",
      },
    ];
  }
  const lines: IncentiveSnapshotLine[] = [];
  const recognitionTotal = activeDrivers.reduce((s, d) => s + d.recognitionPct, 0);
  for (const driver of activeDrivers) {
    const portion =
      recognitionTotal > 0 && recognitionTotal !== 1
        ? amountSar * (driver.recognitionPct / recognitionTotal)
        : amountSar * driver.recognitionPct;
    if (portion <= 0) continue;
    lines.push({
      dealId: deal.id,
      layerId,
      participantId: jobRoleId,
      jobRoleId,
      accrualMonth: deal.accrualMonth,
      payoutMonth: addMonths(deal.accrualMonth, driver.payoutLagMonths),
      amountSar: portion,
      phaseKey,
      lifecycleState: "accrued",
    });
  }
  return lines;
}

function rollupPeriod(
  lines: IncentiveSnapshotLine[],
  filter: (l: IncentiveSnapshotLine) => boolean
): { accrual: number; payout: number } {
  let accrual = 0;
  let payout = 0;
  for (const l of lines) {
    if (!filter(l)) continue;
    accrual += l.amountSar;
    payout += l.amountSar;
  }
  return { accrual, payout };
}

function buildPeriodRollups(
  lines: IncentiveSnapshotLine[],
  year: number
): {
  quarterly: IncentivePeriodRollup[];
  semiannual: IncentivePeriodRollup[];
  annual: IncentivePeriodRollup;
} {
  const quarterly: IncentivePeriodRollup[] = [];
  for (let q = 1; q <= 4; q++) {
    const months = [
      `${year}-${String((q - 1) * 3 + 1).padStart(2, "0")}`,
      `${year}-${String((q - 1) * 3 + 2).padStart(2, "0")}`,
      `${year}-${String((q - 1) * 3 + 3).padStart(2, "0")}`,
    ];
    const { accrual, payout } = rollupPeriod(lines, (l) =>
      months.includes(l.accrualMonth.slice(0, 7))
    );
    quarterly.push({
      periodKey: `${year}-Q${q}`,
      accrualTotalSar: accrual,
      payoutTotalSar: payout,
    });
  }
  const h1Months = monthsInHalf(year, 1);
  const h2Months = monthsInHalf(year, 2);
  const h1 = rollupPeriod(lines, (l) => h1Months.includes(l.accrualMonth));
  const h2 = rollupPeriod(lines, (l) => h2Months.includes(l.accrualMonth));
  const semiannual: IncentivePeriodRollup[] = [
    { periodKey: `${year}-H1`, accrualTotalSar: h1.accrual, payoutTotalSar: h1.payout },
    { periodKey: `${year}-H2`, accrualTotalSar: h2.accrual, payoutTotalSar: h2.payout },
  ];
  const annualAccrual = lines.reduce((s, l) => s + l.amountSar, 0);
  const annualPayout = rollupPeriod(lines, () => true).payout;
  return {
    quarterly,
    semiannual,
    annual: {
      periodKey: `${year}`,
      accrualTotalSar: annualAccrual,
      payoutTotalSar: annualPayout,
    },
  };
}

function monthsInHalf(year: number, half: 1 | 2): string[] {
  const start = half === 1 ? 1 : 7;
  return Array.from({ length: 6 }, (_, i) => {
    const m = start + i;
    return `${year}-${String(m).padStart(2, "0")}`;
  });
}

export function evaluateIncentiveRun(input: IncentiveRunInput): IncentiveRunResult {
  const options = mergeOptions(input);
  const planErrors = validateIncentivePlan(input.plan);
  if (planErrors.length) {
    return { ok: false, errors: planErrors };
  }

  const warnings: string[] = [];
  const snapshotLines: IncentiveSnapshotLine[] = [];
  const explainLines: IncentiveExplainLine[] = [];
  const byLayer: Record<string, number> = {};
  const byParticipant: Record<string, number> = {};
  const byDeal: Record<string, number> = {};
  let companyRetainedSar = 0;

  const scoreMult = input.scorecardMultiplier ?? 1;
  const primaryDriver = input.plan.payoutDrivers[0];
  const defaultLag = primaryDriver?.payoutLagMonths ?? 0;

  let explainIdx = 0;
  const nextId = () => `ex-${++explainIdx}`;

  if (scoreMult !== 1) {
    explainLines.push({
      id: nextId(),
      formulaId: "scorecard_multiplier",
      label: "Scorecard attainment multiplier",
      amountSar: 0,
      inputs: { scoreMult },
    });
  }

  for (const deal of input.deals) {
    if (deal.tierResolution) {
      const tr = deal.tierResolution;
      explainLines.push({
        id: nextId(),
        formulaId: "tier_resolution",
        label: tr.summary ?? `Tier: ${deal.tierKey}`,
        amountSar: 0,
        inputs: {
          tierKey: deal.tierKey,
          scope: tr.scope,
          dealValue: deal.dealValueSar,
          serviceId: tr.serviceId ?? "",
          explicit: Boolean(tr.fromExplicitTierKey),
        },
        dealId: deal.id,
      });
    }

    const rule = matchIncentiveRule(input.plan, deal);
    if (!rule) {
      warnings.push(`No matching rule for deal ${deal.id} (${deal.tierKey})`);
      continue;
    }

    const stackFactors = stackingMultipliersFromPlan(
      deal,
      rule,
      input.plan,
      options.usePlanStackingRules ?? false
    );
    const stackMult = applyStackingMultipliers(input.plan.stackingPolicy, stackFactors);

    explainLines.push({
      id: nextId(),
      formulaId: "rule_match",
      label: `Rule ${rule.id} (${rule.tierKey})`,
      amountSar: 0,
      inputs: {
        tierKey: deal.tierKey,
        referral: deal.referral,
        clientType: deal.clientType,
        complexity: deal.complexity,
      },
      ruleId: rule.id,
      dealId: deal.id,
    });

    const ruleExplainId = explainLines[explainLines.length - 1]!.id;

    explainLines.push({
      id: nextId(),
      parentId: ruleExplainId,
      formulaId: "stacking_breakdown",
      label: "Stacking multipliers",
      amountSar: 0,
      inputs: {
        factors: stackFactors.join("×"),
        product: stackMult,
        policy: input.plan.stackingPolicy,
      },
      dealId: deal.id,
    });

    const { pool: dealPool, basisLabel } = computeDealPool(deal, rule, stackMult * scoreMult);
    let pool = dealPool;

    if (
      options.useReferralRateByTier &&
      !options.useReferrerShare &&
      deal.referral &&
      input.plan.referralRateByTier?.[deal.tierKey] != null
    ) {
      const refRate = input.plan.referralRateByTier[deal.tierKey]!;
      const bonus = pool * refRate;
      pool += bonus;
      explainLines.push({
        id: nextId(),
        formulaId: "referral_tier_rate",
        label: `Referral tier rate (${deal.tierKey})`,
        amountSar: bonus,
        inputs: { tierKey: deal.tierKey, rate: refRate },
        dealId: deal.id,
      });
    }

    if (options.applyReserve && input.plan.reservePct > 0) {
      const retained = pool * (input.plan.reservePct / 100);
      pool -= retained;
      companyRetainedSar += retained;
      explainLines.push({
        id: nextId(),
        formulaId: "company_reserve",
        label: "Company retained (reserve)",
        amountSar: retained,
        inputs: { reservePct: input.plan.reservePct },
        dealId: deal.id,
      });
    }

    const dealExplainId = nextId();
    explainLines.push({
      id: dealExplainId,
      formulaId: "deal_pool",
      label: `${deal.label} pool`,
      amountSar: pool,
      inputs: {
        dealValue: deal.dealValueSar,
        basis: basisLabel,
        rate: rule.rateValue,
        stackMult,
        scoreMult,
      },
      ruleId: rule.id,
      dealId: deal.id,
    });

    byDeal[deal.id] = (byDeal[deal.id] ?? 0) + pool;

    const phases = phaseWeightsForDeal(deal, rule, input.plan);
    const activeLayers = input.plan.layers.filter((l) => {
      if (l.key === "referrer" && !deal.referral) return false;
      return true;
    });

    let dealCommissionBaseForReferrer = 0;
    const usePerDriverMatrix =
      options.useLayerMatrix && (input.plan.layerMatrix?.length ?? 0) > 0;
    const referrerShare =
      options.useReferrerShare && deal.referral
        ? (input.plan.referrerShareOfCommission ?? 0.5)
        : 0;

    const allocateLayerPool = (
      layer: (typeof activeLayers)[0],
      layerPool: number,
      splitPct: number,
      matrixPct: number,
      driverFilter?: IncentivePayoutDriverType
    ) => {
      if (layer.key === "referrer" && referrerShare > 0) return;

      const layerExplainId = nextId();
      const layerInputs: Record<string, number | string | boolean> = {
        defaultSplitPct: layer.defaultSplitPct,
        splitPctUsed: splitPct,
        fromMatrix: matrixPct > 0,
      };
      if (driverFilter) layerInputs.recognitionDriver = driverFilter;
      if (layer.key === "sales_manager") {
        layerInputs.rollupFromLayerIds = input.plan.layers
          .filter((l) => l.key !== "sales_manager" && l.key !== "referrer")
          .map((l) => l.id)
          .join(",");
      }

      explainLines.push({
        id: layerExplainId,
        parentId: dealExplainId,
        formulaId: "layer_split",
        label: layer.label,
        amountSar: layerPool,
        inputs: layerInputs,
        ruleId: rule.id,
        layerId: layer.id,
        dealId: deal.id,
      });
      byLayer[layer.id] = (byLayer[layer.id] ?? 0) + layerPool;

      const parts = participantsForLayer(input, layer.id);
      const shares = splitAmongParticipants(
        layerPool,
        parts,
        layer.allocationPolicy,
        input.plan.roleOverrides,
        layer.id,
        options.useParticipantWeights ?? false,
        options.useRoleOverrides ?? false
      );

      const phaseKey = options.applyPhaseWeights
        ? (resolvePhaseWeightForLayer(layer.key, phases) > 0
            ? (layer.key === "closer"
                ? "closing"
                : (layer.key as IncentiveSnapshotLine["phaseKey"]))
            : undefined)
        : undefined;

      for (const share of shares) {
        if (layer.key !== "referrer") {
          dealCommissionBaseForReferrer += share.amountSar;
        }
        const lines = emitPayoutLines(
          deal,
          layer.id,
          share.jobRoleId,
          share.jobRoleId,
          share.amountSar,
          input.plan.payoutDrivers,
          options.usePayoutDrivers ?? false,
          defaultLag,
          phaseKey,
          driverFilter
        );
        for (const line of lines) {
          snapshotLines.push(line);
          byParticipant[share.jobRoleId] =
            (byParticipant[share.jobRoleId] ?? 0) + line.amountSar;
        }
        explainLines.push({
          id: nextId(),
          parentId: layerExplainId,
          formulaId: "participant_share",
          label: share.displayName,
          amountSar: share.amountSar,
          participantId: share.jobRoleId,
          layerId: layer.id,
          dealId: deal.id,
        });
      }
    };

    for (const layer of activeLayers) {
      if (layer.key === "referrer" && referrerShare > 0) continue;

      if (usePerDriverMatrix) {
        for (const driver of MATRIX_DRIVERS) {
          const driverPct = resolveLayerSplitPct(
            input.plan,
            layer,
            deal.tierKey,
            driver,
            true
          );
          if (driverPct <= 0) continue;
          let layerPool = pool * (driverPct / 100);
          if (options.applyPhaseWeights) {
            layerPool *= resolvePhaseWeightForLayer(layer.key, phases);
          }
          allocateLayerPool(layer, layerPool, driverPct, driverPct, driver);
        }
        continue;
      }

      const matrixPct =
        options.useLayerMatrix && input.plan.layerMatrix?.length
          ? layerPctFromMatrix(input.plan, layer.id, deal.tierKey)
          : 0;
      const splitPct = matrixPct > 0 ? matrixPct : layer.defaultSplitPct;
      let layerPool = pool * (splitPct / 100);
      if (options.applyPhaseWeights) {
        layerPool *= resolvePhaseWeightForLayer(layer.key, phases);
      }
      allocateLayerPool(layer, layerPool, splitPct, matrixPct);
    }

    if (referrerShare > 0) {
      const referrerLayer = activeLayers.find((l) => l.key === "referrer");
      if (referrerLayer) {
        const layerPool = dealCommissionBaseForReferrer * referrerShare;
        explainLines.push({
          id: nextId(),
          parentId: dealExplainId,
          formulaId: "referrer_share",
          label: "Referrer share of commission",
          amountSar: layerPool,
          inputs: {
            base: dealCommissionBaseForReferrer,
            share: referrerShare,
          },
          dealId: deal.id,
        });
        allocateLayerPool(referrerLayer, layerPool, referrerShare * 100, 0);
      }
    }
  }

  if (
    options.applyManagerTeamRule &&
    input.plan.managerTeamRule &&
    input.managerTeamAttainment != null
  ) {
    const mgrLayer = input.plan.layers.find((l) => l.key === "sales_manager");
    if (mgrLayer) {
      const mgrAmount = byLayer[mgrLayer.id] ?? 0;
      const mgrParticipants = participantsForLayer(input, mgrLayer.id).map(
        (p) => p.jobRoleId
      );
      applyManagerTeamAdjustment({
        rule: input.plan.managerTeamRule,
        teamAttainment: input.managerTeamAttainment,
        managerLayerId: mgrLayer.id,
        managerAmountSar: mgrAmount,
        byLayer,
        byParticipant,
        participantIds: mgrParticipants,
        explainLines,
        nextId,
      });
    }
  }

  const companyTotalSar = Object.values(byDeal).reduce((s, v) => s + v, 0);
  const periodRollups = buildPeriodRollups(snapshotLines, input.periodYear);

  const engineVersion = Object.values(options).some(Boolean)
    ? INCENTIVE_ENGINE_VERSION
    : 1;

  const snapshot: IncentiveSnapshot = {
    contractVersion: INCENTIVE_CONTRACT_VERSION,
    engineVersion,
    planId: input.plan.id,
    planVersion: input.plan.version,
    mode: input.mode,
    periodYear: input.periodYear,
    lines: snapshotLines,
    explainLines,
    byLayer,
    byParticipant,
    byDeal,
    companyTotalSar,
    companyRetainedSar,
    ...periodRollups,
    warnings,
    optionsUsed: options,
  };

  return {
    ok: true,
    runId: `run-${hashInput(input)}`,
    inputHash: hashInput(input),
    snapshot,
  };
}
