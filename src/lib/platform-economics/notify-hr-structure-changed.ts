/** Debounced planning sync — dynamic import avoids store ↔ bootstrap load cycles. */
export function notifyHrStructureChangedDebounced(): void {
  if (typeof window === "undefined") return;
  void import("@/lib/platform-economics/request-hr-planning-sync").then((m) =>
    m.requestHrPlanningSyncDebounced()
  );
}
