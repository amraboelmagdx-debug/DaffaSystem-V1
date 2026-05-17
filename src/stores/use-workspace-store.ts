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
import { activeOperationalUnits } from "@/lib/platform-economics/operational-unit";
import type { DemoCompany, DemoOpportunity, DemoRevenueStream, DemoScenario } from "@/types/domain";

function cloneStreams(): DemoRevenueStream[] {
  return demoStreams.map((s) => ({ ...s }));
}

function cloneScenarios(): DemoScenario[] {
  return demoScenarios.map((s) => ({ ...s }));
}

interface WorkspaceState {
  selectedCompanyId: string;
  selectedScenarioId: string;
  companies: DemoCompany[];
  opportunities: DemoOpportunity[];
  /** Mutable copy — used by dashboard / matrix / sales-plan save */
  streams: DemoRevenueStream[];
  scenarios: DemoScenario[];
  /** Per revenue_stream id — workbook-style tier matrix (LOTF D16 blocks). */
  tierLineOverrides: Record<string, TierLine[]>;
  setCompany: (id: string) => void;
  setScenario: (id: string) => void;
  updateCompany: (id: string, patch: Partial<DemoCompany>) => void;
  updateOpportunity: (id: string, patch: Partial<DemoOpportunity>) => void;
  setTierLinesForStream: (streamId: string, lines: TierLine[]) => void;
  resetTierLinesForCompany: (companyId: string) => void;
  /** Append a company + its streams + scenarios (legacy — prefer applySalesPlanToOperationalUnit). */
  appendSalesPlanSnapshot: (payload: {
    company: DemoCompany;
    streams: DemoRevenueStream[];
    scenarios: DemoScenario[];
  }) => void;
  /** Merge Sales Plan outputs into an HR-linked business unit (no orphan company). */
  applySalesPlanToOperationalUnit: (payload: {
    companyId: string;
    companyPatch: Partial<DemoCompany>;
    streams: DemoRevenueStream[];
    scenarioPatch?: Partial<DemoScenario>;
  }) => boolean;
  /** Replace persisted workspace with the default executive demo pack. */
  loadDemoPack: () => void;
  /** Clear companies/streams/scenarios (empty planning workspace). */
  resetToEmpty: () => void;
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
      updateOpportunity: (id, patch) =>
        set({
          opportunities: get().opportunities.map((o) =>
            o.id === id ? { ...o, ...patch } : o
          ),
        }),
      setTierLinesForStream: (streamId, lines) =>
        set({
          tierLineOverrides: { ...get().tierLineOverrides, [streamId]: lines },
        }),
      resetTierLinesForCompany: (companyId) =>
        set((s) => {
          const ids = new Set(
            s.streams.filter((st) => st.companyId === companyId).map((st) => st.id)
          );
          const next: Record<string, TierLine[]> = { ...s.tierLineOverrides };
          for (const id of ids) delete next[id];
          return { tierLineOverrides: next };
        }),
      appendSalesPlanSnapshot: ({ company, streams: newStreams, scenarios: newScenarios }) =>
        set((s) => ({
          companies: [...s.companies, company],
          streams: [...s.streams, ...newStreams],
          scenarios: [...s.scenarios, ...newScenarios],
          selectedCompanyId: company.id,
          selectedScenarioId: newScenarios[0]?.id ?? s.selectedScenarioId,
        })),
      applySalesPlanToOperationalUnit: ({ companyId, companyPatch, streams: planStreams, scenarioPatch }) => {
        const s = get();
        const company = s.companies.find((c) => c.id === companyId);
        if (!company?.hrBusinessUnitId) return false;

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

        const scenariosForCo = s.scenarios.filter((sc) => sc.companyId === companyId);
        const baseline = scenariosForCo.find((sc) => sc.baseline) ?? scenariosForCo[0];
        const nextScenarios = baseline
          ? s.scenarios.map((sc) =>
              sc.id === baseline.id ? { ...sc, ...scenarioPatch } : sc
            )
          : s.scenarios;

        set({
          companies: s.companies.map((c) =>
            c.id === companyId ? { ...c, ...companyPatch } : c
          ),
          streams: [
            ...s.streams.filter((st) => st.companyId !== companyId),
            ...untouched,
            ...mergedStreams,
          ],
          scenarios: nextScenarios,
          selectedCompanyId: companyId,
          selectedScenarioId: baseline?.id ?? s.selectedScenarioId,
        });
        return true;
      },
      loadDemoPack: () =>
        set({
          selectedCompanyId: demoCompanies[0]?.id ?? "",
          selectedScenarioId: demoScenarios[0]?.id ?? "",
          companies: demoCompanies.map((c) => ({ ...c })),
          opportunities: demoOpportunities.map((o) => ({ ...o })),
          streams: cloneStreams(),
          scenarios: cloneScenarios(),
          tierLineOverrides: {},
        }),
      resetToEmpty: () =>
        set({
          selectedCompanyId: "",
          selectedScenarioId: "",
          companies: [],
          opportunities: [],
          streams: [],
          scenarios: [],
          tierLineOverrides: {},
        }),
    }),
    {
      name: "efp-workspace",
      storage: createJSONStorage(() => createTenantScopedStorage(WORKSPACE_BASE_KEY)),
      skipHydration: true,
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorkspaceState>;
        return {
          ...current,
          selectedCompanyId: p.selectedCompanyId ?? "",
          selectedScenarioId: p.selectedScenarioId ?? "",
          companies: Array.isArray(p.companies) ? p.companies : [],
          opportunities: Array.isArray(p.opportunities) ? p.opportunities : [],
          streams: Array.isArray(p.streams) ? p.streams : [],
          scenarios: Array.isArray(p.scenarios) ? p.scenarios : [],
          tierLineOverrides:
            p.tierLineOverrides && typeof p.tierLineOverrides === "object"
              ? p.tierLineOverrides
              : {},
        };
      },
      partialize: (s) => ({
        companies: s.companies,
        opportunities: s.opportunities,
        streams: s.streams,
        scenarios: s.scenarios,
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

/** Await tenant-scoped workspace persist before applying server projection. */
export async function rehydrateWorkspaceStore(): Promise<void> {
  await useWorkspaceStore.persist.rehydrate();
}
