import { describe, expect, it } from "vitest";
import { getTemplateTierPhasesOrdered } from "./selectors";
import { validateServiceRoleAllocation, validateTemplateTierPhase } from "./validation";
import type { DeliveryPhase, ServiceTemplateTierPhase } from "@/types/service-architecture";

describe("service architecture edge cases", () => {
  it("allows multiple role allocation rows for the same jobRoleId on one phase (no uniqueness guard)", () => {
    const issues = validateServiceRoleAllocation({
      serviceTemplateTierPhaseId: "ttp-1",
      jobRoleId: "role-1",
      allocatedHours: 4,
    });
    expect(issues).toHaveLength(0);
  });

  it("flags invalid sort orders for template-tier phases", () => {
    expect(validateTemplateTierPhase({ serviceTemplateTierId: "x", deliveryPhaseId: "y", sortOrder: -1 }).length).toBeGreaterThan(0);
    expect(validateTemplateTierPhase({ serviceTemplateTierId: "x", deliveryPhaseId: "y", sortOrder: NaN }).length).toBeGreaterThan(0);
  });

  it("does not define ordering when two rows share the same sortOrder (stable sort not guaranteed)", () => {
    const phases: DeliveryPhase[] = [
      {
        id: "p-a",
        name: "A",
        code: "A",
        lifecycle: "active",
        version: 1,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "p-b",
        name: "B",
        code: "B",
        lifecycle: "active",
        version: 1,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const rows: ServiceTemplateTierPhase[] = [
      {
        id: "ttp-1",
        serviceTemplateTierId: "tt-1",
        deliveryPhaseId: "p-b",
        sortOrder: 1,
        lifecycle: "active",
        version: 1,
        createdAt: "",
        updatedAt: "",
      },
      {
        id: "ttp-2",
        serviceTemplateTierId: "tt-1",
        deliveryPhaseId: "p-a",
        sortOrder: 1,
        lifecycle: "active",
        version: 1,
        createdAt: "",
        updatedAt: "",
      },
    ];
    const ordered = getTemplateTierPhasesOrdered({
      serviceTemplateTierId: "tt-1",
      templateTierPhases: rows,
      phases,
    });
    expect(ordered).toHaveLength(2);
    expect(ordered[0].sortOrder).toBe(ordered[1].sortOrder);
  });

  it("returns no phase rows when a template-tier has no phase joins yet", () => {
    const ordered = getTemplateTierPhasesOrdered({
      serviceTemplateTierId: "tt-unknown",
      templateTierPhases: [],
      phases: [],
    });
    expect(ordered).toHaveLength(0);
  });
});
