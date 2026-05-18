import { describe, expect, it } from "vitest";
import { evaluateExecutiveWorkspaceMeasures } from "@/lib/planning/measures/executive-workspace-measures";
import { buildPlanningContext } from "@/lib/planning/measures/planning-context";
import { demoCompanies, demoOpportunities, demoScenarios, demoStreams } from "@/data/demo-seed";
import { defaultForecastHorizon } from "./horizon";
import { projectFinancialTrajectory } from "./project-financial-trajectory";

describe("projectFinancialTrajectory", () => {
  const company = demoCompanies[0]!;
  const streams = demoStreams.filter((s) => s.companyId === company.id);
  const scenarios = demoScenarios.filter((s) => s.companyId === company.id);
  const activeScenario = scenarios[0]!;

  it("anchors month 0 to active scenario engine revenue", () => {
    const context = buildPlanningContext({
      company,
      streams,
      opportunities: demoOpportunities.filter((o) => o.companyId === company.id),
      scenarios,
      activeScenarioId: activeScenario.id,
      tierLineOverrides: {},
    });
    const measures = evaluateExecutiveWorkspaceMeasures(context);
    const financial = projectFinancialTrajectory({
      context,
      measures,
      horizon: defaultForecastHorizon(12),
    });
    expect(financial.points[0]!.revenue).toBeCloseTo(measures.activeEngine.revenue, 0);
  });

  it("higher growthAdj increases horizon-end revenue", () => {
    const baseContext = buildPlanningContext({
      company,
      streams,
      opportunities: [],
      scenarios: [{ ...activeScenario, growthAdj: 0 }],
      activeScenarioId: activeScenario.id,
      tierLineOverrides: {},
    });
    const highContext = buildPlanningContext({
      company,
      streams,
      opportunities: [],
      scenarios: [{ ...activeScenario, growthAdj: 0.2 }],
      activeScenarioId: activeScenario.id,
      tierLineOverrides: {},
    });
    const baseMeasures = evaluateExecutiveWorkspaceMeasures(baseContext);
    const highMeasures = evaluateExecutiveWorkspaceMeasures(highContext);
    const baseEnd = projectFinancialTrajectory({
      context: baseContext,
      measures: baseMeasures,
      horizon: defaultForecastHorizon(12),
    }).points[11]!.revenue;
    const highEnd = projectFinancialTrajectory({
      context: highContext,
      measures: highMeasures,
      horizon: defaultForecastHorizon(12),
    }).points[11]!.revenue;
    expect(highEnd).toBeGreaterThan(baseEnd);
  });
});
