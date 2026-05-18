import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBrowserJSONStorage } from "@/lib/persistence/browser-storage";
import type { ServiceCostAssumptions } from "@/lib/service-cost-simulation/types";
import { DEFAULT_SERVICE_COST_ASSUMPTIONS } from "@/lib/service-cost-simulation/defaults";

interface ServiceCostSimulationPrefsState {
  assumptions: ServiceCostAssumptions;
  scenarioId: string;
  setAssumptions: (patch: Partial<ServiceCostAssumptions>) => void;
  setScenarioId: (id: string) => void;
  resetAssumptions: () => void;
}

export const useServiceCostSimulationPrefsStore = create<ServiceCostSimulationPrefsState>()(
  persist(
    (set) => ({
      assumptions: { ...DEFAULT_SERVICE_COST_ASSUMPTIONS },
      scenarioId: "baseline",
      setAssumptions: (patch) =>
        set((s) => ({
          assumptions: { ...s.assumptions, ...patch },
        })),
      setScenarioId: (id) => set({ scenarioId: id }),
      resetAssumptions: () =>
        set({
          assumptions: { ...DEFAULT_SERVICE_COST_ASSUMPTIONS },
        }),
    }),
    {
      name: "efp-service-cost-simulation-prefs-v1",
      storage: createBrowserJSONStorage(),
      partialize: (s) => ({
        assumptions: s.assumptions,
        scenarioId: s.scenarioId,
      }),
    }
  )
);
