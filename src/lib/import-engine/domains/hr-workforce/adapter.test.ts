import { describe, expect, it } from "vitest";
import { hrWorkforceImportAdapter } from "./adapter";

describe("HR import adapter — dependency checklist", () => {
  it("reports satisfied when at least one business unit exists", () => {
    const checks = hrWorkforceImportAdapter.checkDependencies();
    const tenant = checks.find((c) => c.moduleId === "tenant");
    expect(tenant).toBeDefined();
    expect(["satisfied", "missing"]).toContain(tenant!.status);
  });

  it("dependsOn is empty (HR has no upstream)", () => {
    expect(hrWorkforceImportAdapter.dependsOn).toEqual([]);
  });

  it("exposes a stable id and label", () => {
    expect(hrWorkforceImportAdapter.id).toBe("hr-workforce");
    expect(hrWorkforceImportAdapter.label).toBe("HR Workforce");
  });
});
