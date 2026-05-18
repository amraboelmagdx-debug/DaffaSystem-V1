import type {
  CompanyPlanningOverlay,
  ScenarioBundleAssumptionsPayload,
  ScenarioPlanningBundle,
} from "@/types/planning-scenario";
import type { DemoCompany, DemoScenario } from "@/types/domain";
import type { TierLine } from "@/lib/planning/workbook-engine";
import { companyOverlayFromCompany, cloneCompanyOverlay } from "./company-overlay";
import {
  defaultGovernanceForScenario,
  deriveAssumptionsSummary,
  governanceForDuplicate,
  mergeGovernanceOnHydrate,
} from "./scenario-governance";
import { newPlanningScenarioId } from "./scenario-id";

export function scenariosFromBundles(
  bundles: Record<string, ScenarioPlanningBundle>
): DemoScenario[] {
  return Object.values(bundles).map((b) => ({ ...b.scenario }));
}

export function bundleAssumptionsFromBundle(
  bundle: ScenarioPlanningBundle
): ScenarioBundleAssumptionsPayload {
  const { scenario } = bundle;
  return {
    npTargetPct: scenario.npTargetPct,
    revenueMixAdj: scenario.revenueMixAdj,
    conversionRateAdj: scenario.conversionRateAdj,
    fixedCostAdj: scenario.fixedCostAdj,
    growthAdj: scenario.growthAdj,
    pipelineWeightAdj: scenario.pipelineWeightAdj,
    companyOverlay: cloneCompanyOverlay(bundle.companyOverlay),
    tierLineOverrides: structuredClone(bundle.tierLineOverrides),
    parentScenarioId: bundle.parentScenarioId,
    version: bundle.version,
    clientUpdatedAt: bundle.updatedAt,
    description: bundle.description,
    governance: structuredClone(bundle.governance),
  };
}

export function bundleFromAssumptionsPayload(
  scenarioRow: DemoScenario,
  payload: ScenarioBundleAssumptionsPayload,
  company?: DemoCompany
): ScenarioPlanningBundle {
  const overlay =
    payload.companyOverlay ??
    (company ? companyOverlayFromCompany(company) : defaultOverlay());
  const raw: ScenarioPlanningBundle = {
    scenario: {
      ...scenarioRow,
      npTargetPct: payload.npTargetPct ?? scenarioRow.npTargetPct,
      revenueMixAdj: payload.revenueMixAdj ?? scenarioRow.revenueMixAdj,
      conversionRateAdj: payload.conversionRateAdj ?? scenarioRow.conversionRateAdj,
      fixedCostAdj: payload.fixedCostAdj ?? scenarioRow.fixedCostAdj,
      growthAdj: payload.growthAdj ?? scenarioRow.growthAdj,
      pipelineWeightAdj: payload.pipelineWeightAdj ?? scenarioRow.pipelineWeightAdj,
    },
    companyOverlay: cloneCompanyOverlay(overlay),
    tierLineOverrides: structuredClone(payload.tierLineOverrides ?? {}),
    parentScenarioId: payload.parentScenarioId ?? null,
    version: payload.version ?? 1,
    updatedAt: payload.clientUpdatedAt ?? new Date().toISOString(),
    description: payload.description,
    governance:
      payload.governance ??
      defaultGovernanceForScenario(scenarioRow, {
        parentScenarioId: payload.parentScenarioId ?? null,
        version: payload.version ?? 1,
        updatedAt: payload.clientUpdatedAt ?? new Date().toISOString(),
        description: payload.description,
      }),
  };
  return mergeGovernanceOnHydrate(raw);
}

function defaultOverlay(): CompanyPlanningOverlay {
  return {
    fixedCostsMonthly: 0,
    growthTargetPct: 0,
    marginTargetPct: 0.38,
    npTargetPct: 0.12,
    revenueMonthly: 0,
    contributionMarginPct: 0.38,
  };
}

export function createBundleFromCompany(
  company: DemoCompany,
  scenario: Omit<DemoScenario, "id" | "companyId"> & { id?: string; companyId?: string }
): ScenarioPlanningBundle {
  const id = scenario.id ?? newPlanningScenarioId();
  const now = new Date().toISOString();
  const row: DemoScenario = {
    id,
    companyId: scenario.companyId ?? company.id,
    name: scenario.name,
    baseline: scenario.baseline ?? false,
    npTargetPct: scenario.npTargetPct,
    revenueMixAdj: scenario.revenueMixAdj,
    conversionRateAdj: scenario.conversionRateAdj,
    fixedCostAdj: scenario.fixedCostAdj,
    growthAdj: scenario.growthAdj,
    pipelineWeightAdj: scenario.pipelineWeightAdj,
  };
  const bundle: ScenarioPlanningBundle = {
    scenario: row,
    companyOverlay: companyOverlayFromCompany(company),
    tierLineOverrides: {},
    parentScenarioId: null,
    version: 1,
    updatedAt: now,
    governance: defaultGovernanceForScenario(row),
  };
  bundle.governance.assumptionsSummary = deriveAssumptionsSummary(bundle);
  return bundle;
}

export function duplicateBundle(
  source: ScenarioPlanningBundle,
  newName: string
): ScenarioPlanningBundle {
  const mergedSource = mergeGovernanceOnHydrate(source);
  const now = new Date().toISOString();
  const id = newPlanningScenarioId();
  const row: DemoScenario = {
    ...structuredClone(mergedSource.scenario),
    id,
    companyId: mergedSource.scenario.companyId,
    name: newName,
    baseline: false,
  };
  const bundle: ScenarioPlanningBundle = {
    scenario: row,
    companyOverlay: cloneCompanyOverlay(mergedSource.companyOverlay),
    tierLineOverrides: structuredClone(mergedSource.tierLineOverrides),
    parentScenarioId: mergedSource.scenario.id,
    version: 1,
    updatedAt: now,
    governance: governanceForDuplicate(mergedSource, id, newName),
  };
  bundle.governance.assumptionsSummary = deriveAssumptionsSummary(bundle);
  return bundle;
}

export function migrateLegacyWorkspaceToBundles(input: {
  companies: DemoCompany[];
  scenarios: DemoScenario[];
  tierLineOverrides: Record<string, TierLine[]>;
  selectedScenarioId: string;
  existingBundles?: Record<string, ScenarioPlanningBundle>;
}): Record<string, ScenarioPlanningBundle> {
  if (input.existingBundles && Object.keys(input.existingBundles).length > 0) {
    const migrated: Record<string, ScenarioPlanningBundle> = {};
    for (const [id, b] of Object.entries(input.existingBundles)) {
      migrated[id] = mergeGovernanceOnHydrate(b);
    }
    return migrated;
  }

  const companyById = new Map(input.companies.map((c) => [c.id, c]));
  const bundles: Record<string, ScenarioPlanningBundle> = {};
  const now = new Date().toISOString();

  for (const sc of input.scenarios) {
    const company = companyById.get(sc.companyId);
    const overlay = company ? companyOverlayFromCompany(company) : defaultOverlay();
    const tiers =
      sc.id === input.selectedScenarioId ? structuredClone(input.tierLineOverrides) : {};
    bundles[sc.id] = mergeGovernanceOnHydrate({
      scenario: { ...sc },
      companyOverlay: overlay,
      tierLineOverrides: tiers,
      parentScenarioId: null,
      version: 1,
      updatedAt: now,
      governance: defaultGovernanceForScenario(sc, { updatedAt: now }),
    });
  }

  return bundles;
}

export function rebuildBundlesFromHydrated(input: {
  companies: DemoCompany[];
  scenarios: DemoScenario[];
  priorBundles?: Record<string, ScenarioPlanningBundle>;
}): Record<string, ScenarioPlanningBundle> {
  const companyById = new Map(input.companies.map((c) => [c.id, c]));
  const bundles: Record<string, ScenarioPlanningBundle> = {};

  for (const sc of input.scenarios) {
    const prior = input.priorBundles?.[sc.id];
    const company = companyById.get(sc.companyId);
    if (prior) {
      bundles[sc.id] = mergeGovernanceOnHydrate({
        ...prior,
        scenario: { ...sc },
        companyOverlay: prior.companyOverlay,
      });
      continue;
    }
    bundles[sc.id] = createBundleFromCompany(company ?? {
      id: sc.companyId,
      name: "Unit",
      organizationId: "",
      fixedCostsMonthly: 0,
      growthTargetPct: 0,
      marginTargetPct: 0.38,
      npTargetPct: 0.12,
      revenueMonthly: 0,
      contributionMarginPct: 0.38,
      marketSegments: [],
    }, {
      ...sc,
      companyId: sc.companyId,
    });
  }

  return bundles;
}
