import { createJSONStorage } from "zustand/middleware";
import type { StateStorage } from "zustand/middleware";

/** No-op Storage for SSR / Node — avoids Node 22 experimental `localStorage` warnings. */
const noopStorage: Storage = {
  length: 0,
  clear() {},
  getItem() {
    return null;
  },
  key() {
    return null;
  },
  removeItem() {},
  setItem() {},
};

export function getBrowserLocalStorage(): Storage {
  if (typeof window === "undefined") return noopStorage;
  return window.localStorage;
}

export function createBrowserStateStorage(): StateStorage {
  return {
    getItem: (name) => {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem(name);
    },
    setItem: (name, value) => {
      if (typeof window === "undefined") return;
      window.localStorage.setItem(name, value);
    },
    removeItem: (name) => {
      if (typeof window === "undefined") return;
      window.localStorage.removeItem(name);
    },
  };
}

export function createBrowserJSONStorage() {
  return createJSONStorage(getBrowserLocalStorage);
}
