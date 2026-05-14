"use client";

import { useEffect } from "react";
import { useUiStore } from "@/stores/use-ui-store";

export function useKeyboardShortcuts() {
  const { toggleSidebar } = useUiStore();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggleSidebar]);
}
