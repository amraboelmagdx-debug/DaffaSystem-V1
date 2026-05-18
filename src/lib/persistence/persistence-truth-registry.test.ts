import { describe, expect, it } from "vitest";
import {
  getDomainRegistryMeta,
  resolvePersistenceTruth,
} from "./persistence-truth-registry";

describe("persistence-truth-registry", () => {
  it("includes all domains with write/read paths", () => {
    const meta = getDomainRegistryMeta();
    expect(meta.length).toBeGreaterThanOrEqual(10);
    for (const row of meta) {
      expect(row.writePath.length).toBeGreaterThan(0);
      expect(row.readPath.length).toBeGreaterThan(0);
    }
  });

  it("marks compare runs as ephemeral and not restart-safe", () => {
    const report = resolvePersistenceTruth({
      serverProbes: {
        authSessionOk: true,
        migration013Ok: true,
        hrCatalogProbeOk: true,
        serviceCatalogProbeOk: true,
        scenariosProbeOk: true,
        companiesProbeOk: true,
        supabaseClientAvailable: true,
      },
    });
    const compare = report.domains.find((d) => d.domainId === "incentive_compare_runs");
    expect(compare?.backend).toBe("ephemeral");
    expect(compare?.restartSafe).toBe(false);
  });

  it("marks sales plan wizard as local-only", () => {
    const report = resolvePersistenceTruth();
    const wizard = report.domains.find((d) => d.domainId === "sales_plan_wizard");
    expect(wizard?.expectedPilotMode).toBe("local_only");
    expect(wizard?.restartSafe).toBe(false);
  });
});
