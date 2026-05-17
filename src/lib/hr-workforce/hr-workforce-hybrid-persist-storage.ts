import type { StateStorage } from "zustand/middleware";
import { isHrWorkforceHybridDiskMirrorEnabledOnClient } from "@/lib/hr-workforce/persist-safety";

const DISK_API = "/api/dev/hr-workforce-disk";

let diskWriteTimer: ReturnType<typeof setTimeout> | null = null;
let pendingDiskBody: string | null = null;

function flushDiskWrite() {
  diskWriteTimer = null;
  const body = pendingDiskBody;
  pendingDiskBody = null;
  if (body == null || typeof window === "undefined") return;
  if (!isHrWorkforceHybridDiskMirrorEnabledOnClient()) return;
  void fetch(DISK_API, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body,
  }).catch(() => {
    /* dev server or API disabled — localStorage still holds data */
  });
}

function scheduleDiskWrite(value: string) {
  if (!isHrWorkforceHybridDiskMirrorEnabledOnClient()) return;
  pendingDiskBody = value;
  if (diskWriteTimer != null) clearTimeout(diskWriteTimer);
  diskWriteTimer = setTimeout(flushDiskWrite, 450);
}

/**
 * Underlying storage for `createJSONStorage`: prefers `localStorage`, then falls back to
 * the dev disk snapshot so the same HR data appears on any localhost port.
 */
export function getHrWorkforceHybridStateStorage(): StateStorage {
  return {
    getItem: async (name) => {
      if (typeof window === "undefined") return null;
      const local = window.localStorage.getItem(name);
      if (local != null && local !== "") {
        return local;
      }
      if (!isHrWorkforceHybridDiskMirrorEnabledOnClient()) return null;
      try {
        const res = await fetch(DISK_API, { cache: "no-store" });
        if (!res.ok) return null;
        const text = await res.text();
        if (!text.trim()) return null;
        window.localStorage.setItem(name, text);
        return text;
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(name, value);
      scheduleDiskWrite(value);
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
      if (diskWriteTimer != null) {
        clearTimeout(diskWriteTimer);
        diskWriteTimer = null;
      }
      pendingDiskBody = null;
      if (!isHrWorkforceHybridDiskMirrorEnabledOnClient()) return;
      void fetch(DISK_API, { method: "DELETE" }).catch(() => {});
    },
  };
}
