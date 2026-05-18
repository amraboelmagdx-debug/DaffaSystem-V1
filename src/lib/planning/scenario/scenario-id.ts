export function newPlanningScenarioId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `sc-${crypto.randomUUID()}`;
  }
  return `sc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
