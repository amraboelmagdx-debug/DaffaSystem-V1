import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createBrowserJSONStorage } from "@/lib/persistence/browser-storage";
import type { CommercialMarginThresholds, PricingModelSpec } from "@/lib/commercial-pricing-intelligence/types";
import { DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS, DEFAULT_PRICING_MODEL_SPEC } from "@/lib/commercial-pricing-intelligence/defaults";

interface CommercialPricingPrefsState {
  model: PricingModelSpec;
  activeRiskIds: string[];
  commercialScenarioId: string;
  thresholds: CommercialMarginThresholds;
  setModel: (m: PricingModelSpec) => void;
  setActiveRiskIds: (ids: string[]) => void;
  setCommercialScenarioId: (id: string) => void;
  setThresholds: (t: Partial<CommercialMarginThresholds>) => void;
  reset: () => void;
}

const initial = {
  model: DEFAULT_PRICING_MODEL_SPEC,
  activeRiskIds: [] as string[],
  commercialScenarioId: "neutral",
  thresholds: { ...DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS },
};

export const useCommercialPricingPrefsStore = create<CommercialPricingPrefsState>()(
  persist(
    (set) => ({
      ...initial,
      setModel: (m) => set({ model: m }),
      setActiveRiskIds: (ids) => set({ activeRiskIds: ids }),
      setCommercialScenarioId: (id) => set({ commercialScenarioId: id }),
      setThresholds: (t) => set((s) => ({ thresholds: { ...s.thresholds, ...t } })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "efp-commercial-pricing-prefs-v1",
      storage: createBrowserJSONStorage(),
      partialize: (s) => ({
        model: s.model,
        activeRiskIds: s.activeRiskIds,
        commercialScenarioId: s.commercialScenarioId,
        thresholds: s.thresholds,
      }),
    }
  )
);
