"use client";

import { create } from "zustand";
import { createDefaultIncentivePlan } from "@/lib/incentives/default-plan";
import { isLegacyIncentivePlanId } from "@/lib/incentives/uuid";
import type {
  IncentivePlan,
  IncentiveRunRecord,
  IncentiveSimulatorPreset,
  PayoutFreeze,
} from "@/types/incentives";
import type { IncentiveApiMeta } from "@/lib/incentives/api-meta";

export type IncentivePersistError = {
  message: string;
  code?: string;
  status?: number;
};

type IncentivePlanStore = {
  plans: IncentivePlan[];
  activePlanId: string | null;
  runs: IncentiveRunRecord[];
  presets: (IncentiveSimulatorPreset & { id: string })[];
  freezes: PayoutFreeze[];
  loading: boolean;
  plansLoaded: boolean;
  error: string | null;
  lastPersistError: IncentivePersistError | null;
  loadError: string | null;
  persistenceMeta: IncentiveApiMeta | null;
  showSupersededRuns: boolean;
  setShowSupersededRuns: (show: boolean) => void;
  loadPlans: (hrBusinessUnitId: string) => Promise<void>;
  ensureDefaultPlan: (input: {
    organizationId: string;
    hrBusinessUnitId: string;
    companyId: string;
  }) => Promise<IncentivePlan>;
  setActivePlan: (planId: string) => void;
  getActivePlan: () => IncentivePlan | null;
  savePlan: (plan: IncentivePlan) => Promise<boolean>;
  approvePlan: (planId: string, approvedBy?: string | null) => Promise<boolean>;
  archivePlan: (planId: string) => Promise<boolean>;
  persistRun: (
    record: IncentiveRunRecord,
    hrBusinessUnitId: string,
    options?: { periodKey?: string; rerunPolicy?: "supersede" }
  ) => Promise<boolean>;
  loadRuns: (filters?: {
    planId?: string;
    hrBusinessUnitId?: string;
    periodYear?: number;
    mode?: string;
  }) => Promise<void>;
  loadFreezes: () => Promise<void>;
  loadPresets: (hrBusinessUnitId: string) => Promise<void>;
  savePreset: (
    hrBusinessUnitId: string,
    preset: IncentiveSimulatorPreset
  ) => Promise<void>;
  resetForBuChange: () => void;
  reloadForBu: (hrBusinessUnitId: string) => Promise<void>;
  visibleRuns: () => IncentiveRunRecord[];
};

function parseApiMeta(json: unknown): IncentiveApiMeta | null {
  if (!json || typeof json !== "object") return null;
  const meta = (json as { meta?: IncentiveApiMeta }).meta;
  if (!meta?.persistenceBackend) return null;
  return meta;
}

async function parseErrorResponse(res: Response): Promise<IncentivePersistError> {
  try {
    const body = (await res.json()) as { error?: string; message?: string; code?: string };
    const code = body.code;
    const base = body.error ?? body.message ?? `Request failed (${res.status})`;
    return {
      message: code ? `${base} (${code})` : base,
      code,
      status: res.status,
    };
  } catch {
    return { message: `Request failed (${res.status})`, status: res.status };
  }
}

export const useIncentivePlanStore = create<IncentivePlanStore>((set, get) => ({
  plans: [],
  activePlanId: null,
  runs: [],
  presets: [],
  freezes: [],
  loading: false,
  plansLoaded: false,
  error: null,
  lastPersistError: null,
  loadError: null,
  persistenceMeta: null,
  showSupersededRuns: false,
  setShowSupersededRuns: (show) => set({ showSupersededRuns: show }),

  resetForBuChange: () =>
    set({
      runs: [],
      activePlanId: null,
      plans: [],
      plansLoaded: false,
      error: null,
      lastPersistError: null,
      loadError: null,
    }),

  reloadForBu: async (hrBusinessUnitId) => {
    get().resetForBuChange();
    set({ loading: true });
    await get().loadPlans(hrBusinessUnitId);
    const plan = get().getActivePlan();
    if (plan) {
      await get().loadRuns({ hrBusinessUnitId, planId: plan.id });
    }
    await get().loadFreezes();
    await get().loadPresets(hrBusinessUnitId);
    set({ loading: false });
  },

  visibleRuns: () => {
    const { runs, showSupersededRuns } = get();
    if (showSupersededRuns) return runs;
    return runs.filter((r) => r.runLifecycle !== "superseded");
  },

  loadPlans: async (hrBusinessUnitId) => {
    set({ loading: true, error: null, loadError: null });
    try {
      const res = await fetch(
        `/api/incentives/plans?hrBusinessUnitId=${encodeURIComponent(hrBusinessUnitId)}`,
        { credentials: "include" }
      );
      const json = await res.json().catch(() => ({}));
      const meta = parseApiMeta(json);
      if (meta) set({ persistenceMeta: meta });
      if (!res.ok) {
        const err = await parseErrorResponse(res);
        set({
          loading: false,
          plans: [],
          plansLoaded: true,
          error: err.message,
          loadError: err.message,
        });
        return;
      }
      const data = json as { plans: IncentivePlan[] };
      const plans = data.plans ?? [];
      set({
        plans,
        loading: false,
        plansLoaded: true,
        activePlanId: plans[0]?.id ?? get().activePlanId,
        error: null,
        loadError: null,
      });
    } catch {
      set({
        loading: false,
        plans: [],
        plansLoaded: true,
        error: "Unable to reach incentive API",
        loadError: "Unable to reach incentive API",
      });
    }
  },

  ensureDefaultPlan: async (input) => {
    const existing = get().plans.find(
      (p) => p.hrBusinessUnitId === input.hrBusinessUnitId
    );
    if (existing) {
      if (isLegacyIncentivePlanId(existing.id)) {
        const migrated = { ...existing, id: crypto.randomUUID() };
        const ok = await get().savePlan(migrated);
        if (ok) {
          set({ activePlanId: migrated.id });
          return migrated;
        }
      } else {
        set({ activePlanId: existing.id });
        return existing;
      }
    }
    const plan = createDefaultIncentivePlan(input);
    await get().savePlan(plan);
    const saved = get().plans.find((p) => p.id === plan.id) ?? plan;
    set({ activePlanId: saved.id });
    return saved;
  },

  setActivePlan: (planId) => set({ activePlanId: planId }),

  getActivePlan: () => {
    const { plans, activePlanId } = get();
    return plans.find((p) => p.id === activePlanId) ?? plans[0] ?? null;
  },

  savePlan: async (plan) => {
    try {
      const res = await fetch("/api/incentives/plans", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const json = await res.json().catch(() => ({}));
      const meta = parseApiMeta(json);
      if (meta) set({ persistenceMeta: meta });
      if (!res.ok) {
        const err = await parseErrorResponse(res);
        set({ error: err.message, lastPersistError: err });
        return false;
      }
      const data = json as { plan: IncentivePlan };
      set((s) => ({
        plans: [...s.plans.filter((p) => p.id !== data.plan.id), data.plan],
        activePlanId: data.plan.id,
        error: null,
        lastPersistError: null,
      }));
      return true;
    } catch {
      const err = { message: "Save plan failed (offline)" };
      set({ error: err.message, lastPersistError: err });
      return false;
    }
  },

  approvePlan: async (planId, approvedBy) => {
    const res = await fetch(`/api/incentives/plans/${encodeURIComponent(planId)}/approve`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ approvedBy }),
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { plan: IncentivePlan; meta?: IncentiveApiMeta };
    if (data.meta) set({ persistenceMeta: data.meta });
    set((s) => ({
      plans: s.plans.map((p) => (p.id === planId ? data.plan : p)),
    }));
    return true;
  },

  archivePlan: async (planId) => {
    const res = await fetch(`/api/incentives/plans/${encodeURIComponent(planId)}/archive`, {
      method: "POST",
      credentials: "include",
    });
    if (!res.ok) return false;
    const data = (await res.json()) as { plan: IncentivePlan; meta?: IncentiveApiMeta };
    if (data.meta) set({ persistenceMeta: data.meta });
    set((s) => ({
      plans: s.plans.map((p) => (p.id === planId ? data.plan : p)),
    }));
    return true;
  },

  persistRun: async (record, hrBusinessUnitId, options) => {
    try {
      const res = await fetch("/api/incentives/runs", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          record,
          hrBusinessUnitId,
          periodKey: options?.periodKey,
          rerunPolicy: options?.rerunPolicy,
        }),
      });
      const json = await res.json().catch(() => ({}));
      const meta = parseApiMeta(json);
      if (meta) set({ persistenceMeta: meta });
      if (!res.ok) {
        const err = await parseErrorResponse(res);
        set({ lastPersistError: err });
        return false;
      }
      const data = json as { run: IncentiveRunRecord };
      set((s) => ({
        runs: [data.run, ...s.runs.filter((r) => r.id !== data.run.id)],
        lastPersistError: null,
      }));
      return true;
    } catch {
      set({ lastPersistError: { message: "Persist run failed (offline)" } });
      return false;
    }
  },

  loadRuns: async (filters) => {
    const params = new URLSearchParams();
    if (filters?.planId) params.set("planId", filters.planId);
    if (filters?.hrBusinessUnitId) params.set("hrBusinessUnitId", filters.hrBusinessUnitId);
    if (filters?.periodYear != null) params.set("periodYear", String(filters.periodYear));
    if (filters?.mode) params.set("mode", filters.mode);
    const q = params.toString() ? `?${params}` : "";
    try {
      const res = await fetch(`/api/incentives/runs${q}`, { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const meta = parseApiMeta(json);
      if (meta) set({ persistenceMeta: meta });
      if (!res.ok) {
        set({ loadError: `Failed to load runs (${res.status})` });
        return;
      }
      const data = json as { runs: IncentiveRunRecord[] };
      set({ runs: data.runs ?? [], loadError: null });
    } catch {
      set({ loadError: "Failed to load runs (offline)" });
    }
  },

  loadFreezes: async () => {
    try {
      const res = await fetch("/api/incentives/freezes", { credentials: "include" });
      const json = await res.json().catch(() => ({}));
      const meta = parseApiMeta(json);
      if (meta) set({ persistenceMeta: meta });
      if (!res.ok) return;
      const data = json as { freezes: PayoutFreeze[] };
      set({ freezes: data.freezes ?? [] });
    } catch {
      /* offline */
    }
  },

  loadPresets: async (hrBusinessUnitId) => {
    try {
      const res = await fetch(
        `/api/incentives/presets?hrBusinessUnitId=${encodeURIComponent(hrBusinessUnitId)}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data = (await res.json()) as {
        presets: (IncentiveSimulatorPreset & { id: string })[];
      };
      set({ presets: data.presets ?? [] });
    } catch {
      /* offline */
    }
  },

  savePreset: async (hrBusinessUnitId, preset) => {
    await fetch("/api/incentives/presets", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hrBusinessUnitId, preset }),
    });
    await get().loadPresets(hrBusinessUnitId);
  },
}));
