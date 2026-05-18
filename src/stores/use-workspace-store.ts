import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { WORKSPACE_BASE_KEY } from "@/lib/persistence/persist-keys";
import { createTenantScopedStorage } from "@/lib/persistence/tenant-storage";
import {
  demoCompanies,
  demoOpportunities,
  demoScenarios,
  demoStreams,
} from "@/data/demo-seed";
import type { TierLine } from "@/lib/planning/workbook-engine";
import {
  companyOverlayFromCompany,
  createBundleFromCompany,
  deriveAssumptionsSummary,
  duplicateBundle,
  isScenarioGovernanceEditable,
  mergeGovernanceOnHydrate,
  migrateLegacyWorkspaceToBundles,
  scenariosForSelectors,
  scenariosFromBundles,
} from "@/lib/planning/scenario";
import { persistScenarioBundleToServer } from "@/lib/planning/scenario/persist-scenario-api";
import { newPlanningScenarioId } from "@/lib/planning/scenario/scenario-id";
import { resolveEffectiveCompany } from "@/lib/planning/scenario/resolve-effective-planning";
import type { CompanyPlanningOverlay, ScenarioPlanningBundle } from "@/types/planning-scenario";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type { ScenarioGovernance, ScenarioStatus, ScenarioType } from "@/types/scenario-governance";

function cloneStreams(): DemoRevenueStream[] {
  return demoStreams.map((s) => ({ ...s }));
}

function cloneScenarios(): DemoScenario[] {
  return demoScenarios.map((s) => ({ ...s }));
}

function buildDemoBundles(): Record<string, ScenarioPlanningBundle> {
  const companies = demoCompanies.map((c) => ({ ...c }));
  return migrateLegacyWorkspaceToBundles({
    companies,
    scenarios: cloneScenarios(),
    tierLineOverrides: {},
    selectedScenarioId: demoScenarios[0]?.id ?? "",
  });
}

function syncFromBundles(
  bundles: Record<string, ScenarioPlanningBundle>
): Pick<WorkspaceState, "scenarioBundles" | "scenarios"> {
  return {
    scenarioBundles: bundles,
    scenarios: scenariosFromBundles(bundles),
  };
}

export function getActiveScenarioBundle(
  state: Pick<WorkspaceState, "scenarioBundles" | "selectedScenarioId">
): ScenarioPlanningBundle | null {
  return state.scenarioBundles[state.selectedScenarioId] ?? null;
}

export function getEffectiveCompanyForPlanning(
  state: Pick<WorkspaceState, "companies" | "scenarioBundles" | "selectedScenarioId">,
  companyId: string
): DemoCompany | undefined {
  const company = state.companies.find((c) => c.id === companyId);
  if (!company) return undefined;
  const bundle = state.scenarioBundles[state.selectedScenarioId];
  if (!bundle || bundle.scenario.companyId !== companyId) return company;
  return resolveEffectiveCompany(company, bundle);
}

interface WorkspaceState {
  selectedCompanyId: string;
  selectedScenarioId: string;
  companies: DemoCompany[];
  opportunities: DemoOpportunity[];
  streams: DemoRevenueStream[];
  scenarios: DemoScenario[];
  scenarioBundles: Record<string, ScenarioPlanningBundle>;
  /** @deprecated Global tier map — migrated into active bundle; kept for persist transition. */
  tierLineOverrides: Record<string, TierLine[]>;
  setCompany: (id: string) => void;
  setScenario: (id: string) => void;
  updateCompany: (id: string, patch: Partial<DemoCompany>) => void;
  updateActiveScenarioOverlay: (patch: Partial<CompanyPlanningOverlay>) => void;
  updateScenarioBundle: (
    id: string,
    patch: {
      companyOverlay?: Partial<CompanyPlanningOverlay>;
      tierLineOverrides?: Record<string, TierLine[]>;
      scenario?: Partial<DemoScenario>;
      description?: string;
    }
  ) => void;
  /** Update notes without incrementing bundle version (for typing in summary UI). */
  setScenarioDescription: (id: string, description: string) => void;
  updateScenarioGovernance: (id: string, patch: Partial<ScenarioGovernance>) => void;
  setScenarioStatus: (id: string, status: ScenarioStatus) => void;
  archiveScenario: (id: string) => boolean;
  isScenarioEditable: (id: string) => boolean;
  createScenario: (opts: {
    companyId: string;
    name: string;
    cloneFromId?: string;
    scenarioType?: ScenarioType;
  }) => string | null;
  updateOpportunity: (id: string, patch: Partial<DemoOpportunity>) => void;
  setTierLinesForStream: (streamId: string, lines: TierLine[]) => void;
  resetTierLinesForCompany: (companyId: string) => void;
  appendSalesPlanSnapshot: (payload: {
    company: DemoCompany;
    streams: DemoRevenueStream[];
    scenarios: DemoScenario[];
  }) => void;
  applySalesPlanToOperationalUnit: (payload: {
    companyId: string;
    companyPatch: Partial<DemoCompany>;
    streams: DemoRevenueStream[];
    scenarioPatch?: Partial<DemoScenario>;
  }) => boolean;
  applySalesPlanToScenario: (payload: {
    scenarioId: string;
    companyId: string;
    companyPatch: Partial<DemoCompany>;
    streams: DemoRevenueStream[];
    scenarioPatch?: Partial<DemoScenario>;
  }) => boolean;
  loadDemoPack: () => void;
  resetToEmpty: () => void;
}

function bumpBundle(
  bundle: ScenarioPlanningBundle,
  patch: {
    companyOverlay?: Partial<CompanyPlanningOverlay>;
    tierLineOverrides?: Record<string, TierLine[]>;
    scenario?: Partial<DemoScenario>;
    description?: string;
  }
): ScenarioPlanningBundle {
  const next: ScenarioPlanningBundle = {
    ...bundle,
    scenario: patch.scenario ? { ...bundle.scenario, ...patch.scenario } : bundle.scenario,
    companyOverlay: patch.companyOverlay
      ? { ...bundle.companyOverlay, ...patch.companyOverlay }
      : bundle.companyOverlay,
    tierLineOverrides: patch.tierLineOverrides ?? bundle.tierLineOverrides,
    description: patch.description !== undefined ? patch.description : bundle.description,
    version: bundle.version + 1,
    updatedAt: new Date().toISOString(),
  };
  next.governance = {
    ...next.governance,
    assumptionsSummary: deriveAssumptionsSummary(next),
    auditRevision: next.governance.auditRevision + 1,
  };
  return next;
}

function touchScenarioGovernance(
  bundle: ScenarioPlanningBundle,
  patch: Partial<ScenarioGovernance>
): ScenarioPlanningBundle {
  return {
    ...bundle,
    governance: {
      ...bundle.governance,
      ...patch,
      assumptionsSummary: patch.assumptionsSummary ?? bundle.governance.assumptionsSummary,
    },
    updatedAt: new Date().toISOString(),
  };
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      selectedCompanyId: "",
      selectedScenarioId: "",
      companies: [],
      opportunities: [],
      streams: [],
      scenarios: [],
      scenarioBundles: {},
      tierLineOverrides: {},
      setCompany: (id) =>
        set(() => {
          const scenariosForCo = get().scenarios.filter((s) => s.companyId === id);
          const firstSc = scenariosForCo[0]?.id ?? "";
          return { selectedCompanyId: id, selectedScenarioId: firstSc };
        }),
      setScenario: (id) => set({ selectedScenarioId: id }),
      updateCompany: (id, patch) =>
        set({
          companies: get().companies.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        }),
      updateActiveScenarioOverlay: (patch) => {
        const id = get().selectedScenarioId;
        if (!id) return;
        get().updateScenarioBundle(id, { companyOverlay: patch });
      },
      isScenarioEditable: (id) => {
        const bundle = get().scenarioBundles[id];
        if (!bundle) return false;
        return isScenarioGovernanceEditable(bundle.governance);
      },
      updateScenarioGovernance: (id, patch) => {
        const bundles = { ...get().scenarioBundles };
        const prev = bundles[id];
        if (!prev) return;
        const next = touchScenarioGovernance(prev, patch);
        bundles[id] = next;
        set(syncFromBundles(bundles));
        void persistScenarioBundleToServer(next, "update");
      },
      setScenarioStatus: (id, status) => {
        get().updateScenarioGovernance(id, { status });
      },
      archiveScenario: (id) => {
        const bundle = get().scenarioBundles[id];
        if (!bundle) return false;
        if (bundle.scenario.baseline) {
          const baselines = Object.values(get().scenarioBundles).filter(
            (b) => b.scenario.companyId === bundle.scenario.companyId && b.scenario.baseline
          );
          if (baselines.length <= 1) return false;
        }
        get().setScenarioStatus(id, "archived");
        return true;
      },
      updateScenarioBundle: (id, patch) => {
        const bundles = { ...get().scenarioBundles };
        const prev = bundles[id];
        if (!prev) return;
        if (!isScenarioGovernanceEditable(prev.governance)) return;
        const next = bumpBundle(prev, patch);
        bundles[id] = next;
        set(syncFromBundles(bundles));
        void persistScenarioBundleToServer(next, "update");
      },
      setScenarioDescription: (id, description) => {
        const bundles = { ...get().scenarioBundles };
        const prev = bundles[id];
        if (!prev) return;
        bundles[id] = {
          ...prev,
          description,
          governance: { ...prev.governance, description },
          updatedAt: new Date().toISOString(),
        };
        set(syncFromBundles(bundles));
        void persistScenarioBundleToServer(bundles[id]!, "update");
      },
      createScenario: ({ companyId, name, cloneFromId, scenarioType }) => {
        const company = get().companies.find((c) => c.id === companyId);
        if (!company) return null;

        let bundle: ScenarioPlanningBundle;
        if (cloneFromId) {
          const source = get().scenarioBundles[cloneFromId];
          if (!source || source.scenario.companyId !== companyId) return null;
          bundle = duplicateBundle(source, name);
        } else {
          const active = getActiveScenarioBundle(get());
          const overlay = active?.companyOverlay ?? companyOverlayFromCompany(company);
          bundle = {
            ...createBundleFromCompany(company, {
              name,
              baseline: false,
              npTargetPct: company.npTargetPct,
              revenueMixAdj: 0,
              conversionRateAdj: 0,
              fixedCostAdj: 0,
              growthAdj: 0,
              pipelineWeightAdj: 0,
            }),
            companyOverlay: structuredClone(overlay),
          };
          bundle.scenario.id = newPlanningScenarioId();
          if (scenarioType) {
            bundle.governance = { ...bundle.governance, scenarioType };
          }
        }

        const bundles = { ...get().scenarioBundles, [bundle.scenario.id]: bundle };
        set({
          ...syncFromBundles(bundles),
          selectedScenarioId: bundle.scenario.id,
          selectedCompanyId: companyId,
        });
        void persistScenarioBundleToServer(bundle, "create");
        return bundle.scenario.id;
      },
      updateOpportunity: (id, patch) =>
        set({
          opportunities: get().opportunities.map((o) =>
            o.id === id ? { ...o, ...patch } : o
          ),
        }),
      setTierLinesForStream: (streamId, lines) => {
        const id = get().selectedScenarioId;
        if (!id || !get().isScenarioEditable(id)) return;
        const bundle = get().scenarioBundles[id];
        if (!bundle) {
          set({ tierLineOverrides: { ...get().tierLineOverrides, [streamId]: lines } });
          return;
        }
        get().updateScenarioBundle(id, {
          tierLineOverrides: { ...bundle.tierLineOverrides, [streamId]: lines },
        });
      },
      resetTierLinesForCompany: (companyId) => {
        const id = get().selectedScenarioId;
        const streamIds = new Set(
          get().streams.filter((st) => st.companyId === companyId).map((st) => st.id)
        );
        const bundle = id ? get().scenarioBundles[id] : null;
        if (bundle) {
          const next = { ...bundle.tierLineOverrides };
          for (const sid of streamIds) delete next[sid];
          get().updateScenarioBundle(id, { tierLineOverrides: next });
          return;
        }
        set((s) => {
          const next: Record<string, TierLine[]> = { ...s.tierLineOverrides };
          for (const sid of streamIds) delete next[sid];
          return { tierLineOverrides: next };
        });
      },
      appendSalesPlanSnapshot: ({ company, streams: newStreams, scenarios: newScenarios }) => {
        const bundles: Record<string, ScenarioPlanningBundle> = {};
        for (const sc of newScenarios) {
          bundles[sc.id] = createBundleFromCompany(company, sc);
        }
        set((s) => ({
          companies: [...s.companies, company],
          streams: [...s.streams, ...newStreams],
          ...syncFromBundles({ ...s.scenarioBundles, ...bundles }),
          selectedCompanyId: company.id,
          selectedScenarioId: newScenarios[0]?.id ?? s.selectedScenarioId,
        }));
      },
      applySalesPlanToScenario: ({
        scenarioId,
        companyId,
        companyPatch,
        streams: planStreams,
        scenarioPatch,
      }) => {
        const s = get();
        const company = s.companies.find((c) => c.id === companyId);
        const bundle = s.scenarioBundles[scenarioId];
        if (!company?.hrBusinessUnitId || !bundle) return false;
        if (!isScenarioGovernanceEditable(bundle.governance)) return false;

        const streamById = new Map(
          s.streams.filter((st) => st.companyId === companyId).map((st) => [st.id, st])
        );
        const mergedStreams = planStreams.map((ps) => {
          const prev = streamById.get(ps.id);
          return {
            ...ps,
            companyId,
            hrDepartmentId: ps.hrDepartmentId ?? prev?.hrDepartmentId ?? null,
            serviceTemplateId: ps.serviceTemplateId ?? prev?.serviceTemplateId ?? null,
            serviceFamilyId: ps.serviceFamilyId ?? prev?.serviceFamilyId ?? null,
          };
        });
        const mergedIds = new Set(mergedStreams.map((st) => st.id));
        const untouched = s.streams.filter(
          (st) => st.companyId === companyId && !mergedIds.has(st.id)
        );

        const overlayPatch: Partial<CompanyPlanningOverlay> = {
          fixedCostsMonthly: companyPatch.fixedCostsMonthly,
          marginTargetPct: companyPatch.marginTargetPct,
          npTargetPct: companyPatch.npTargetPct,
          revenueMonthly: companyPatch.revenueMonthly,
          contributionMarginPct: companyPatch.contributionMarginPct,
          opportunityTiers: companyPatch.opportunityTiers,
        };
        const cleaned = Object.fromEntries(
          Object.entries(overlayPatch).filter(([, v]) => v !== undefined)
        ) as Partial<CompanyPlanningOverlay>;

        const bundles = { ...s.scenarioBundles };
        bundles[scenarioId] = bumpBundle(bundle, {
          companyOverlay: { ...bundle.companyOverlay, ...cleaned },
          scenario: scenarioPatch,
        });

        set({
          streams: [
            ...s.streams.filter((st) => st.companyId !== companyId),
            ...untouched,
            ...mergedStreams,
          ],
          ...syncFromBundles(bundles),
          selectedCompanyId: companyId,
          selectedScenarioId: scenarioId,
        });
        void persistScenarioBundleToServer(bundles[scenarioId]!, "update");
        return true;
      },
      applySalesPlanToOperationalUnit: (payload) => {
        const s = get();
        const targetId = s.selectedScenarioId;
        if (!targetId) return false;
        return get().applySalesPlanToScenario({ ...payload, scenarioId: targetId });
      },
      loadDemoPack: () => {
        const bundles = buildDemoBundles();
        set({
          selectedCompanyId: demoCompanies[0]?.id ?? "",
          selectedScenarioId: demoScenarios[0]?.id ?? "",
          companies: demoCompanies.map((c) => ({ ...c })),
          opportunities: demoOpportunities.map((o) => ({ ...o })),
          streams: cloneStreams(),
          ...syncFromBundles(bundles),
          tierLineOverrides: {},
        });
      },
      resetToEmpty: () =>
        set({
          selectedCompanyId: "",
          selectedScenarioId: "",
          companies: [],
          opportunities: [],
          streams: [],
          scenarios: [],
          scenarioBundles: {},
          tierLineOverrides: {},
        }),
    }),
    {
      name: "efp-workspace",
      storage: createJSONStorage(() => createTenantScopedStorage(WORKSPACE_BASE_KEY)),
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorkspaceState>;
        const companies = Array.isArray(p.companies) ? p.companies : [];
        const scenarios = Array.isArray(p.scenarios) ? p.scenarios : [];
        const tierLineOverrides =
          p.tierLineOverrides && typeof p.tierLineOverrides === "object"
            ? p.tierLineOverrides
            : {};
        const scenarioBundles = migrateLegacyWorkspaceToBundles({
          companies,
          scenarios,
          tierLineOverrides,
          selectedScenarioId: p.selectedScenarioId ?? "",
          existingBundles: p.scenarioBundles,
        });
        return {
          ...current,
          selectedCompanyId: p.selectedCompanyId ?? "",
          selectedScenarioId: p.selectedScenarioId ?? "",
          companies,
          opportunities: Array.isArray(p.opportunities) ? p.opportunities : [],
          streams: Array.isArray(p.streams) ? p.streams : [],
          scenarios: scenariosFromBundles(scenarioBundles),
          scenarioBundles,
          tierLineOverrides,
        };
      },
      partialize: (s) => ({
        companies: s.companies,
        opportunities: s.opportunities,
        streams: s.streams,
        scenarios: s.scenarios,
        scenarioBundles: s.scenarioBundles,
        selectedCompanyId: s.selectedCompanyId,
        selectedScenarioId: s.selectedScenarioId,
        tierLineOverrides: s.tierLineOverrides,
      }),
    }
  )
);

export function streamsForCompany(companyId: string): DemoRevenueStream[] {
  return useWorkspaceStore.getState().streams.filter((s) => s.companyId === companyId);
}

export function scenariosForCompany(companyId: string): DemoScenario[] {
  return useWorkspaceStore.getState().scenarios.filter((s) => s.companyId === companyId);
}

/** Scenarios visible in header selectors (excludes archived). */
export function selectableScenariosForCompany(companyId: string): DemoScenario[] {
  const s = useWorkspaceStore.getState();
  return scenariosForSelectors(
    s.scenarios.filter((sc) => sc.companyId === companyId),
    s.scenarioBundles
  );
}

export function tierLineOverridesForActiveScenario(): Record<string, TierLine[]> {
  const s = useWorkspaceStore.getState();
  const bundle = getActiveScenarioBundle(s);
  if (bundle) return bundle.tierLineOverrides;
  return s.tierLineOverrides;
}

/** Await tenant-scoped workspace persist before applying server projection. */
export async function rehydrateWorkspaceStore(): Promise<void> {
  await useWorkspaceStore.persist.rehydrate();
}
