import { describe, expect, it } from "vitest";
import {
  demoCompanies,
  demoOpportunities,
  demoScenarios,
  demoStreams,
} from "@/data/demo-seed";
import { resolvePlanningEvaluation } from "./planning-evaluation-readiness";

describe("resolvePlanningEvaluation", () => {
  const company = demoCompanies.find((c) => c.id === "co-northwind")!;

  it("blocks when company is missing", () => {
    const result = resolvePlanningEvaluation({
      company: null,
      streams: [],
      opportunities: [],
      scenarios: [],
      activeScenarioId: "",
      tierLineOverrides: {},
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("no_company");
    }
  });

  it("blocks when scenarios are empty", () => {
    const result = resolvePlanningEvaluation({
      company,
      streams: demoStreams.filter((s) => s.companyId === company.id),
      opportunities: demoOpportunities,
      scenarios: [],
      activeScenarioId: "",
      tierLineOverrides: {},
    });
    expect(result.status).toBe("blocked");
    if (result.status === "blocked") {
      expect(result.reason).toBe("no_scenarios");
    }
  });

  it("ready when scenarios exist and falls back to first scenario", () => {
    const scenarios = demoScenarios.filter((s) => s.companyId === company.id);
    const result = resolvePlanningEvaluation({
      company,
      streams: demoStreams.filter((s) => s.companyId === company.id),
      opportunities: demoOpportunities,
      scenarios,
      activeScenarioId: "",
      tierLineOverrides: {},
    });
    expect(result.status).toBe("ready");
    if (result.status === "ready") {
      expect(result.activeScenario.id).toBe(scenarios[0]!.id);
      expect(result.context.activeScenarioId).toBe(scenarios[0]!.id);
    }
  });
});
