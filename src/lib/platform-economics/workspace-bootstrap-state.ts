import { create } from "zustand";

import type { OperationalWorkspaceBootstrapResult } from "./bootstrap-operational-workspace";

type WorkspaceBootstrapState = {
  status: "idle" | "loading" | "ready" | "error";
  lastResult: OperationalWorkspaceBootstrapResult | null;
  setLoading: () => void;
  setResult: (result: OperationalWorkspaceBootstrapResult) => void;
  reset: () => void;
};

export const useWorkspaceBootstrapStore = create<WorkspaceBootstrapState>((set) => ({
  status: "idle",
  lastResult: null,
  setLoading: () => set({ status: "loading", lastResult: null }),
  setResult: (result) =>
    set({
      status: result.errors.length > 0 && result.linkedUnitCount === 0 ? "error" : "ready",
      lastResult: result,
    }),
  reset: () => set({ status: "idle", lastResult: null }),
}));
