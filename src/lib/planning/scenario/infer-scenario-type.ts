export type InferredScenarioType = "baseline" | "aggressive" | "conservative" | "simulation";

export function inferScenarioType(name: string, baseline: boolean): InferredScenarioType {
  if (baseline) return "baseline";
  const n = name.toLowerCase();
  if (n.includes("aggr")) return "aggressive";
  if (n.includes("conserv")) return "conservative";
  return "simulation";
}
