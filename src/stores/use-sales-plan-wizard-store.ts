import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_OPPORTUNITY_TIERS,
  mergeOpportunityTiersWithDefaults,
  suggestedAdvFromTierBand,
} from "@/data/opportunity-tiers-defaults";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
import { isLinkedOperationalUnit } from "@/lib/platform-economics/operational-unit";
import { buildSalesPlanModel } from "@/lib/sales-plan/build-model";
import { sumMonthlyFixedCosts, weightedBlendedCm } from "@/lib/sales-plan/engine";
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import type { DemoCompany, DemoRevenueStream, DemoScenario } from "@/types/domain";
import type {
  ContributionCell,
  ConversionRates,
  FixedCostLine,
  MarketSegmentShare,
  OpportunityTierDefinition,
  ProductServiceLine,
  QuarterlyWeights,
  SalesPlanMeta,
} from "@/types/sales-plan";
import {
  DEFAULT_CONVERSION_RATES,
  DEFAULT_QUARTERLY_WEIGHTS,
} from "@/types/sales-plan";

const TIER_KEYS = ["tiny", "standard", "big", "mega"] as const;

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function seedFixedLines(): FixedCostLine[] {
  const cats: FixedCostLine["categoryKey"][] = [
    "salaries",
    "office_rent",
    "operations",
    "software",
    "marketing",
    "legal_accounting",
    "utilities",
    "travel",
    "management_overhead",
  ];
  return cats.map((categoryKey) => ({
    id: newId("fc"),
    categoryKey,
    amountMonthly: 0,
    amountYearly: 0,
    recurring: true,
    oneTime: false,
  }));
}

function defaultContributionMatrix(
  products: ProductServiceLine[],
  opportunityTiers: OpportunityTierDefinition[]
): Record<string, ContributionCell> {
  const tiers = mergeOpportunityTiersWithDefaults(opportunityTiers);
  const tierByKey = new Map(tiers.map((t) => [t.key, t]));
  const map: Record<string, ContributionCell> = {};
  for (const p of products) {
    for (const tk of TIER_KEYS) {
      const exists = tk === "mega" ? false : true;
      const tier = tierByKey.get(tk);
      const fallback = DEFAULT_OPPORTUNITY_TIERS.find((x) => x.key === tk)!;
      const adv = tier ? suggestedAdvFromTierBand(tier) : suggestedAdvFromTierBand(fallback);
      map[`${p.id}:${tk}`] = {
        serviceId: p.id,
        tierKey: tk,
        exists,
        avgDealValueSar: adv,
        contributionMarginPct: 0.38,
        deliveryCostSar: 0,
        salesCycleDays: 60,
      };
    }
  }
  return map;
}

function defaultTierMix(products: ProductServiceLine[]) {
  const mix: Record<string, Partial<Record<(typeof TIER_KEYS)[number], number>>> = {};
  for (const p of products) {
    mix[p.id] = { tiny: 0.35, standard: 0.4, big: 0.2, mega: 0.05 };
  }
  return mix;
}

function defaultShares(products: ProductServiceLine[]) {
  if (!products.length) return {};
  const w = 1 / products.length;
  const shares: Record<string, number> = {};
  for (const p of products) shares[p.id] = w;
  return shares;
}

const defaultMeta: SalesPlanMeta = {
  portfolioName: "",
  planningYear: new Date().getFullYear(),
  currency: "SAR",
  planningScenarioName: "Operating plan",
};

const defaultSegments: MarketSegmentShare[] = [
  { segment: "governmental", targetPct: 0.25 },
  { segment: "private", targetPct: 0.45 },
  { segment: "semi_governmental", targetPct: 0.2 },
  { segment: "nonprofit", targetPct: 0.1 },
];

interface SalesPlanWizardState {
  currentStep: number;
  meta: SalesPlanMeta;
  opportunityTiers: OpportunityTierDefinition[];
  fixedCostLines: FixedCostLine[];
  products: ProductServiceLine[];
  serviceRevenueShare: Record<string, number>;
  tierMixByService: Record<string, Partial<Record<(typeof TIER_KEYS)[number], number>>>;
  contributionCells: Record<string, ContributionCell>;
  conversionRates: ConversionRates;
  quarterlyWeights: QuarterlyWeights;
  marketSegments: MarketSegmentShare[];
  /** When set, overrides model-implied blended CM (0–1). */
  blendedCmOverride: number | null;
  npTargetPct: number;
  /** Optional UI: enterprise FP&A roadmap panel (explanatory; does not replace core model). */
  showAdvancedEnterpriseUi: boolean;

  setStep: (n: number) => void;
  setMeta: (patch: Partial<SalesPlanMeta>) => void;
  setOpportunityTiers: (tiers: OpportunityTierDefinition[]) => void;
  updateOpportunityTier: (key: string, patch: Partial<OpportunityTierDefinition>) => void;
  setFixedLines: (lines: FixedCostLine[]) => void;
  updateFixedLine: (id: string, patch: Partial<FixedCostLine>) => void;
  addCustomFixedLine: () => void;
  addProduct: (name?: string) => void;
  updateProduct: (id: string, patch: Partial<ProductServiceLine>) => void;
  removeProduct: (id: string) => void;
  seedProductsFromStreams: (rows: { id: string; name: string }[]) => void;
  setServiceShare: (serviceId: string, pct: number) => void;
  normalizeServiceShares: () => void;
  setTierMix: (serviceId: string, tier: (typeof TIER_KEYS)[number], pct: number) => void;
  setContributionCell: (serviceId: string, tier: (typeof TIER_KEYS)[number], patch: Partial<ContributionCell>) => void;
  setConversionRates: (patch: Partial<ConversionRates>) => void;
  setQuarterlyWeights: (patch: Partial<QuarterlyWeights>) => void;
  setMarketSegment: (segment: MarketSegmentShare["segment"], pct: number) => void;
  setBlendedCmOverride: (v: number | null) => void;
  setNpTargetPct: (v: number) => void;
  resetWizard: () => void;
  normalizeMarketSegments: () => void;
  normalizeAllTierMixes: () => void;
  normalizeTierMixForService: (serviceId: string) => void;
  applyPlanToWorkspace: () => void;
  /** Merges wizard into the selected HR-linked business unit; returns false if validation fails. */
  savePlanToSelectedOperationalUnit: () => boolean;
  /** @deprecated Use savePlanToSelectedOperationalUnit */
  savePlanToWorkspaceAsNewCompany: () => boolean;
  hydrateOpportunityTiersFromWorkspaceCompany: () => void;
  setShowAdvancedEnterpriseUi: (v: boolean) => void;
}

function buildInitial(): Omit<
  SalesPlanWizardState,
  | "setStep"
  | "setMeta"
  | "setOpportunityTiers"
  | "updateOpportunityTier"
  | "setFixedLines"
  | "updateFixedLine"
  | "addCustomFixedLine"
  | "addProduct"
  | "updateProduct"
  | "removeProduct"
  | "seedProductsFromStreams"
  | "setServiceShare"
  | "normalizeServiceShares"
  | "setTierMix"
  | "setContributionCell"
  | "setConversionRates"
  | "setQuarterlyWeights"
  | "setMarketSegment"
  | "setBlendedCmOverride"
  | "setNpTargetPct"
  | "resetWizard"
  | "normalizeMarketSegments"
  | "normalizeAllTierMixes"
  | "normalizeTierMixForService"
  | "applyPlanToWorkspace"
  | "savePlanToSelectedOperationalUnit"
  | "savePlanToWorkspaceAsNewCompany"
  | "hydrateOpportunityTiersFromWorkspaceCompany"
  | "setShowAdvancedEnterpriseUi"
> {
  return {
    currentStep: 1,
    meta: { ...defaultMeta },
    opportunityTiers: mergeOpportunityTiersWithDefaults(),
    fixedCostLines: seedFixedLines(),
    products: [],
    serviceRevenueShare: {},
    tierMixByService: {},
    contributionCells: {},
    conversionRates: { ...DEFAULT_CONVERSION_RATES },
    quarterlyWeights: { ...DEFAULT_QUARTERLY_WEIGHTS },
    marketSegments: defaultSegments.map((s) => ({ ...s })),
    blendedCmOverride: null,
    npTargetPct: 0.12,
    showAdvancedEnterpriseUi: false,
  };
}

export const useSalesPlanWizardStore = create<SalesPlanWizardState>()(
  persist(
    (set, get) => ({
      ...buildInitial(),

      setStep: (n) => set({ currentStep: Math.min(18, Math.max(1, Math.round(n))) }),
      setMeta: (patch) => set({ meta: { ...get().meta, ...patch } }),
      setOpportunityTiers: (tiers) =>
        set({ opportunityTiers: mergeOpportunityTiersWithDefaults(tiers) }),
      updateOpportunityTier: (key, patch) =>
        set({
          opportunityTiers: get().opportunityTiers.map((t) =>
            t.key === key ? { ...t, ...patch } : t
          ),
        }),
      setFixedLines: (lines) => set({ fixedCostLines: lines }),
      updateFixedLine: (id, patch) =>
        set({
          fixedCostLines: get().fixedCostLines.map((l) =>
            l.id === id ? { ...l, ...patch } : l
          ),
        }),
      addCustomFixedLine: () =>
        set({
          fixedCostLines: [
            ...get().fixedCostLines,
            {
              id: newId("fc"),
              categoryKey: "custom",
              customLabel: "Custom",
              amountMonthly: 0,
              amountYearly: 0,
              recurring: true,
              oneTime: false,
            },
          ],
        }),
      addProduct: (name) => {
        const p: ProductServiceLine = {
          id: newId("svc"),
          name: name?.trim() || "New service",
          category: "General",
          deliveryType: "service",
          strategicImportance: 0.5,
          operationalComplexity: 3,
          scalabilityScore: 0.5,
        };
        const products = [...get().products, p];
        set({
          products,
          serviceRevenueShare: defaultShares(products),
          tierMixByService: defaultTierMix(products),
          contributionCells: {
            ...get().contributionCells,
            ...defaultContributionMatrix([p], get().opportunityTiers),
          },
        });
      },
      updateProduct: (id, patch) =>
        set({
          products: get().products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        }),
      removeProduct: (id) => {
        const products = get().products.filter((p) => p.id !== id);
        const share = { ...get().serviceRevenueShare };
        delete share[id];
        const mix = { ...get().tierMixByService };
        delete mix[id];
        const cells = { ...get().contributionCells };
        for (const tk of TIER_KEYS) delete cells[`${id}:${tk}`];
        set({ products, serviceRevenueShare: share, tierMixByService: mix, contributionCells: cells });
      },
      seedProductsFromStreams: (rows) => {
        const products = rows.map((r) => ({
          id: r.id,
          name: r.name,
          category: "Imported",
          deliveryType: "service" as const,
          strategicImportance: 0.55,
          operationalComplexity: 3,
          scalabilityScore: 0.55,
        }));
        set({
          products,
          serviceRevenueShare: defaultShares(products),
          tierMixByService: defaultTierMix(products),
          contributionCells: defaultContributionMatrix(products, get().opportunityTiers),
        });
      },
      setServiceShare: (serviceId, pct) =>
        set({
          serviceRevenueShare: { ...get().serviceRevenueShare, [serviceId]: pct },
        }),
      normalizeServiceShares: () => {
        const products = get().products;
        const w = 1 / (products.length || 1);
        const share: Record<string, number> = {};
        for (const p of products) share[p.id] = w;
        set({ serviceRevenueShare: share });
      },
      setTierMix: (serviceId, tier, pct) =>
        set({
          tierMixByService: {
            ...get().tierMixByService,
            [serviceId]: { ...get().tierMixByService[serviceId], [tier]: pct },
          },
        }),
      setContributionCell: (serviceId, tier, patch) => {
        const key = `${serviceId}:${tier}`;
        const prev = get().contributionCells[key];
        if (!prev) return;
        const nextCell = { ...prev, ...patch };
        set({
          contributionCells: {
            ...get().contributionCells,
            [key]: nextCell,
          },
        });
        if (patch.exists === false) {
          set({
            tierMixByService: {
              ...get().tierMixByService,
              [serviceId]: { ...get().tierMixByService[serviceId], [tier]: 0 },
            },
          });
          get().normalizeTierMixForService(serviceId);
        }
      },
      setConversionRates: (patch) =>
        set({ conversionRates: { ...get().conversionRates, ...patch } }),
      setQuarterlyWeights: (patch) =>
        set({ quarterlyWeights: { ...get().quarterlyWeights, ...patch } }),
      setMarketSegment: (segment, pct) =>
        set({
          marketSegments: get().marketSegments.map((s) =>
            s.segment === segment ? { ...s, targetPct: pct } : s
          ),
        }),
      setBlendedCmOverride: (v) => set({ blendedCmOverride: v }),
      setNpTargetPct: (v) => set({ npTargetPct: Math.min(0.5, Math.max(0, v)) }),
      resetWizard: () => set(buildInitial()),
      normalizeMarketSegments: () =>
        set({
          marketSegments: get().marketSegments.map((s) => ({
            ...s,
            targetPct: 0.25,
          })),
        }),
      normalizeAllTierMixes: () => {
        const { products } = get();
        for (const p of products) {
          get().normalizeTierMixForService(p.id);
        }
      },
      normalizeTierMixForService: (serviceId) => {
        const { products, contributionCells, tierMixByService } = get();
        if (!products.some((p) => p.id === serviceId)) return;
        const next = { ...tierMixByService };
        const active = TIER_KEYS.filter((tk) => contributionCells[`${serviceId}:${tk}`]?.exists);
        if (!active.length) return;
        const raw = next[serviceId] ?? {};
        const sum = active.reduce((a, tk) => a + Math.max(0, raw[tk] ?? 0), 0);
        const patch: Partial<Record<(typeof TIER_KEYS)[number], number>> = {};
        if (sum < 1e-9) {
          const u = 1 / active.length;
          for (const tk of active) patch[tk] = u;
        } else {
          for (const tk of active) patch[tk] = Math.max(0, raw[tk] ?? 0) / sum;
        }
        next[serviceId] = { ...next[serviceId], ...patch };
        set({ tierMixByService: next });
      },
      hydrateOpportunityTiersFromWorkspaceCompany: () => {
        const { companies, selectedCompanyId } = useWorkspaceStore.getState();
        const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
        if (!company) return;
        set({
          opportunityTiers: mergeOpportunityTiersWithDefaults(company.opportunityTiers),
        });
      },
      setShowAdvancedEnterpriseUi: (v) => set({ showAdvancedEnterpriseUi: v }),
      applyPlanToWorkspace: () => {
        const w = get();
        const fixed = sumMonthlyFixedCosts(w.fixedCostLines);
        const { companies, selectedCompanyId, updateCompany } = useWorkspaceStore.getState();
        const company = companies.find((c) => c.id === selectedCompanyId) ?? companies[0];
        if (!company) return;
        updateCompany(company.id, {
          fixedCostsMonthly: fixed,
          npTargetPct: w.npTargetPct,
          opportunityTiers: w.opportunityTiers.map((t) => ({ ...t })),
        });
      },
      savePlanToSelectedOperationalUnit: () => {
        const w = get();
        if (!w.meta.portfolioName?.trim() || w.products.length === 0) return false;

        const ws = useWorkspaceStore.getState();
        const company =
          ws.companies.find((c) => c.id === ws.selectedCompanyId && isLinkedOperationalUnit(c)) ??
          ws.companies.find((c) => isLinkedOperationalUnit(c));
        if (!company?.hrBusinessUnitId) return false;

        const totalFixed = sumMonthlyFixedCosts(w.fixedCostLines);
        const serviceWeights = w.products.map((p) => ({
          serviceId: p.id,
          weight: Math.max(0, w.serviceRevenueShare[p.id] ?? 0),
        }));
        const engineCells: {
          serviceId: string;
          tierKey: (typeof TIER_KEYS)[number];
          exists: boolean;
          cm: number;
          mix: number;
          adv: number;
        }[] = [];
        for (const p of w.products) {
          for (const tk of TIER_KEYS) {
            const cell = w.contributionCells[`${p.id}:${tk}`];
            const mix = w.tierMixByService[p.id]?.[tk] ?? 0;
            if (!cell) continue;
            engineCells.push({
              serviceId: p.id,
              tierKey: tk,
              exists: cell.exists,
              cm: cell.contributionMarginPct,
              mix,
              adv: cell.avgDealValueSar,
            });
          }
        }
        let blended = w.blendedCmOverride;
        if (blended == null) {
          blended = weightedBlendedCm({ serviceWeights, cells: engineCells });
        }

        const model = buildSalesPlanModel({
          products: w.products,
          serviceRevenueShare: w.serviceRevenueShare,
          tierMixByService: w.tierMixByService,
          contributionCells: w.contributionCells,
          fixedMonthly: totalFixed,
          blendedCm: blended,
          npTargetPct: w.npTargetPct,
          conversionRates: w.conversionRates,
          quarterlyWeights: w.quarterlyWeights,
          marketSegments: w.marketSegments,
        });

        const revenueMonthly = Math.max(10_000, model.annualRevenueSar / 12);
        const existingStreams = ws.streams.filter((s) => s.companyId === company.id);
        const streamById = new Map(existingStreams.map((s) => [s.id, s]));

        const rawStreams: DemoRevenueStream[] = w.products.map((p) => {
          const active = TIER_KEYS.filter((tk) => w.contributionCells[`${p.id}:${tk}`]?.exists);
          const mixMap = w.tierMixByService[p.id] ?? {};
          let cm = 0.4;
          if (active.length) {
            let s = 0;
            let v = 0;
            for (const tk of active) {
              const m = Math.max(0, mixMap[tk] ?? 0);
              const c = w.contributionCells[`${p.id}:${tk}`]!;
              s += m;
              v += m * c.contributionMarginPct;
            }
            cm = s > 1e-9 ? v / s : 0.4;
          }
          const firstTk = active[0];
          const cell0 = firstTk ? w.contributionCells[`${p.id}:${firstTk}`] : null;
          const prev = streamById.get(p.id);
          return {
            id: prev?.id ?? p.id,
            companyId: company.id,
            name: p.name,
            hrDepartmentId: prev?.hrDepartmentId ?? null,
            serviceTemplateId: prev?.serviceTemplateId ?? null,
            serviceFamilyId: prev?.serviceFamilyId ?? null,
            contributionMarginPct: Math.min(0.99, Math.max(0.05, cm)),
            revenueWeight: Math.max(0.01, w.serviceRevenueShare[p.id] ?? 1 / w.products.length),
            avgDealSize: cell0 ? cell0.avgDealValueSar : 200_000,
            growthRatePct: 0.15,
            conversionRatePct: 0.25,
            salesCycleDays: cell0?.salesCycleDays ?? 60,
          };
        });
        const wsum = rawStreams.reduce((a, s) => a + s.revenueWeight, 0) || 1;
        const streams: DemoRevenueStream[] = rawStreams.map((s) => ({
          ...s,
          revenueWeight: s.revenueWeight / wsum,
        }));

        return useWorkspaceStore.getState().applySalesPlanToOperationalUnit({
          companyId: company.id,
          companyPatch: {
            organizationId: company.organizationId || getActiveOrganizationId() || company.organizationId,
            fixedCostsMonthly: totalFixed,
            marginTargetPct: blended,
            npTargetPct: w.npTargetPct,
            revenueMonthly,
            contributionMarginPct: blended,
            opportunityTiers: w.opportunityTiers.map((t) => ({ ...t })),
          },
          streams,
          scenarioPatch: {
            name: w.meta.planningScenarioName?.trim() || "Saved plan",
            npTargetPct: w.npTargetPct,
          },
        });
      },
      savePlanToWorkspaceAsNewCompany: () => get().savePlanToSelectedOperationalUnit(),
    }),
    {
      name: "efp-sales-plan-wizard",
      version: 2,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as Record<string, unknown>;
        return {
          ...p,
          opportunityTiers: mergeOpportunityTiersWithDefaults(
            p.opportunityTiers as OpportunityTierDefinition[] | undefined
          ),
        };
      },
      partialize: (s) => ({
        currentStep: s.currentStep,
        meta: s.meta,
        opportunityTiers: s.opportunityTiers,
        fixedCostLines: s.fixedCostLines,
        products: s.products,
        serviceRevenueShare: s.serviceRevenueShare,
        tierMixByService: s.tierMixByService,
        contributionCells: s.contributionCells,
        conversionRates: s.conversionRates,
        quarterlyWeights: s.quarterlyWeights,
        marketSegments: s.marketSegments,
        blendedCmOverride: s.blendedCmOverride,
        npTargetPct: s.npTargetPct,
        showAdvancedEnterpriseUi: s.showAdvancedEnterpriseUi,
      }),
    }
  )
);
