import type { ScenarioPlanningBundle } from "@/types/planning-scenario";
import type {
  PostureLevel,
  ScenarioAssumptionsSummary,
  ScenarioGovernance,
  ScenarioStatus,
  ScenarioType,
} from "@/types/scenario-governance";
import type { DemoScenario } from "@/types/domain";

const LOCAL_PLANNER = "local-planner";

export function inferScenarioTypeFromName(name: string, baseline: boolean): ScenarioType {
  if (baseline) return "baseline";
  const n = name.toLowerCase();
  if (n.includes("break") && n.includes("even")) return "break_even";
  if (n.includes("conserv")) return "conservative";
  if (n.includes("aggr")) return "aggressive";
  if (n.includes("expan")) return "expansion";
  if (n.includes("stress")) return "stress_case";
  if (n.includes("recover")) return "recovery_plan";
  if (n.includes("hiring") && n.includes("freeze")) return "hiring_freeze";
  if (n.includes("downturn") || n.includes("market down")) return "market_downturn";
  if (n.includes("strategic") && n.includes("push")) return "strategic_push";
  return "custom";
}

function postureFromSigned(value: number, low = -0.02, high = 0.02): PostureLevel {
  if (value <= low) return "low";
  if (value >= high) return "high";
  return "neutral";
}

export function deriveAssumptionsSummary(bundle: ScenarioPlanningBundle): ScenarioAssumptionsSummary {
  const { scenario, companyOverlay } = bundle;
  const growth =
    companyOverlay.growthTargetPct + scenario.growthAdj + scenario.revenueMixAdj * 0.5;
  const costSignal = scenario.fixedCostAdj;
  const pricingSignal = scenario.revenueMixAdj;
  const utilizationSignal = scenario.conversionRateAdj + scenario.pipelineWeightAdj;

  return {
    targetNpPct: companyOverlay.npTargetPct ?? scenario.npTargetPct,
    growthPosture: postureFromSigned(growth, 0.05, 0.12),
    utilizationPosture: postureFromSigned(utilizationSignal, -0.03, 0.03),
    hiringPosture: postureFromSigned(-costSignal, -0.02, 0.02),
    pricingPosture: postureFromSigned(pricingSignal, -0.02, 0.02),
    costPosture: postureFromSigned(costSignal, -0.02, 0.02),
  };
}

export function defaultGovernanceForScenario(
  scenario: DemoScenario,
  bundle?: Partial<ScenarioPlanningBundle>
): ScenarioGovernance {
  const now = bundle?.updatedAt ?? new Date().toISOString();
  const parentId = bundle?.parentScenarioId ?? null;
  const fullBundle: ScenarioPlanningBundle = {
    scenario,
    companyOverlay: bundle?.companyOverlay ?? {
      fixedCostsMonthly: 0,
      growthTargetPct: 0,
      marginTargetPct: 0.38,
      npTargetPct: scenario.npTargetPct,
      revenueMonthly: 0,
      contributionMarginPct: 0.38,
    },
    tierLineOverrides: bundle?.tierLineOverrides ?? {},
    parentScenarioId: parentId,
    version: bundle?.version ?? 1,
    updatedAt: now,
    description: bundle?.description,
    governance: bundle?.governance ?? ({} as ScenarioGovernance),
  };

  const assumptionsSummary = deriveAssumptionsSummary(fullBundle);

  return {
    scenarioType: inferScenarioTypeFromName(scenario.name, scenario.baseline),
    status: scenario.baseline ? "active" : "draft",
    description: bundle?.governance?.description ?? bundle?.description ?? "",
    notes: "",
    tags: [],
    owner: null,
    createdBy: LOCAL_PLANNER,
    createdAt: now,
    isReference: scenario.baseline,
    clonedFromScenarioId: parentId,
    strategicObjective: "",
    planningHorizon: "",
    confidenceLevel: "neutral",
    aggressivenessLevel: scenario.baseline ? "neutral" : "high",
    riskLevel: "neutral",
    assumptionsSummary,
    forecastLineageId: null,
    proposalLineageId: null,
    aiContextVersion: null,
    auditRevision: 1,
  };
}

export function mergeGovernanceOnHydrate(bundle: ScenarioPlanningBundle): ScenarioPlanningBundle {
  const defaults = defaultGovernanceForScenario(bundle.scenario, bundle);
  const existing = bundle.governance;
  if (!existing) {
    return { ...bundle, governance: defaults };
  }
  return {
    ...bundle,
    governance: {
      ...defaults,
      ...existing,
      assumptionsSummary: {
        ...defaults.assumptionsSummary,
        ...existing.assumptionsSummary,
      },
      tags: existing.tags?.length ? existing.tags : defaults.tags,
    },
  };
}

export function governanceForDuplicate(
  source: ScenarioPlanningBundle,
  newScenarioId: string,
  newName: string
): ScenarioGovernance {
  const now = new Date().toISOString();
  return {
    ...structuredClone(source.governance),
    scenarioType: source.governance.scenarioType === "baseline" ? "custom" : source.governance.scenarioType,
    status: "draft",
    description: "",
    notes: "",
    tags: [...source.governance.tags],
    createdBy: LOCAL_PLANNER,
    createdAt: now,
    isReference: false,
    clonedFromScenarioId: source.scenario.id,
    strategicObjective: source.governance.strategicObjective,
    auditRevision: 1,
  };
}

export function isScenarioGovernanceEditable(governance: ScenarioGovernance): boolean {
  return governance.status !== "locked" && governance.status !== "archived";
}

export type ScenarioIntentLabels = {
  type: Record<ScenarioType, string>;
  status: Record<ScenarioStatus, string>;
  posture: Record<PostureLevel, string>;
  clonedFrom: (name: string) => string;
  reference: string;
  targetingNp: (pct: string) => string;
  viaPostures: (parts: string) => string;
  customObjective: (text: string) => string;
};

export function buildScenarioIntentLine(
  bundle: ScenarioPlanningBundle,
  bundlesById: Record<string, ScenarioPlanningBundle>,
  labels: ScenarioIntentLabels
): string {
  const g = bundle.governance;
  const typeLabel = labels.type[g.scenarioType] ?? g.scenarioType;
  const statusLabel = labels.status[g.status] ?? g.status;
  const parts: string[] = [`${typeLabel} (${statusLabel})`];

  if (g.isReference) parts.push(labels.reference);

  const parentId = g.clonedFromScenarioId ?? bundle.parentScenarioId;
  if (parentId) {
    const parentName =
      bundlesById[parentId]?.scenario.name ?? parentId.slice(0, 8);
    parts.push(labels.clonedFrom(parentName));
  }

  if (g.strategicObjective.trim()) {
    parts.push(labels.customObjective(g.strategicObjective.trim()));
  } else {
    const npPct = (g.assumptionsSummary.targetNpPct * 100).toFixed(0);
    parts.push(labels.targetingNp(`${npPct}%`));
    const postureParts: string[] = [];
    const s = g.assumptionsSummary;
    if (s.growthPosture !== "neutral") {
      postureParts.push(`${labels.posture[s.growthPosture]} growth`);
    }
    if (s.pricingPosture !== "neutral") {
      postureParts.push(`${labels.posture[s.pricingPosture]} pricing`);
    }
    if (s.utilizationPosture !== "neutral") {
      postureParts.push(`${labels.posture[s.utilizationPosture]} utilization`);
    }
    if (postureParts.length) parts.push(labels.viaPostures(postureParts.join(", ")));
  }

  return parts.join(", ") + ".";
}

export function scenariosForSelectors(
  scenarios: DemoScenario[],
  bundles: Record<string, ScenarioPlanningBundle>
): DemoScenario[] {
  return scenarios.filter((sc) => {
    const status = bundles[sc.id]?.governance?.status;
    return status !== "archived";
  });
}
