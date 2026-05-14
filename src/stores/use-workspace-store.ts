import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEMO_ORG_ID,
  demoCompanies,
  demoOpportunities,
  demoScenarios,
  demoStreams,
} from "@/data/demo-seed";
import type { TierLine } from "@/lib/planning/workbook-engine";
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
  /** Append a company + its streams + scenarios (e.g. Sales Plan “Save to workspace”). */
  appendSalesPlanSnapshot: (payload: {
    company: DemoCompany;
    streams: DemoRevenueStream[];
    scenarios: DemoScenario[];
  }) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      selectedCompanyId: demoCompanies[0]?.id ?? "",
      selectedScenarioId: demoScenarios[0]?.id ?? "",
      companies: demoCompanies.map((c) => ({ ...c })),
      opportunities: demoOpportunities.map((o) => ({ ...o })),
      streams: cloneStreams(),
      scenarios: cloneScenarios(),
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
    }),
    {
      name: "efp-workspace",
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<WorkspaceState>;
        return {
          ...current,
          ...p,
          streams:
            Array.isArray(p.streams) && p.streams.length > 0 ? p.streams : current.streams,
          scenarios:
            Array.isArray(p.scenarios) && p.scenarios.length > 0 ? p.scenarios : current.scenarios,
          companies:
            Array.isArray(p.companies) && p.companies.length > 0
              ? p.companies
              : current.companies,
          opportunities:
            Array.isArray(p.opportunities) && p.opportunities.length > 0
              ? p.opportunities
              : current.opportunities,
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
