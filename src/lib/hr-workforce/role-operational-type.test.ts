import { describe, expect, it } from "vitest";
import type { JobRole } from "@/types/hr-workforce";
import {
  effectiveOperationalRoleType,
  inferOperationalRoleTypeFromLegacy,
  legacyFlagsForOperationalRoleType,
  migrateRoleOperationalType,
  patchOperationalRoleType,
} from "./role-operational-type";

describe("operational role type", () => {
  it("infers legacy mapping from billable flag only", () => {
    expect(inferOperationalRoleTypeFromLegacy({ isBillable: true, includeInOhAllocation: false })).toBe("delivery");
    expect(inferOperationalRoleTypeFromLegacy({ isBillable: false, includeInOhAllocation: true })).toBe("indirect");
    expect(inferOperationalRoleTypeFromLegacy({ isBillable: false, includeInOhAllocation: false })).toBe("indirect");
  });

  it("patchOperationalRoleType syncs legacy flags", () => {
    const p = patchOperationalRoleType("indirect");
    expect(p.operationalRoleType).toBe("indirect");
    expect(p.isBillable).toBe(false);
    expect(p.includeInOhAllocation).toBe(false);
  });

  it("effectiveOperationalRoleType coerces old support/management strings to indirect", () => {
    const r = {
      isBillable: true,
      includeInOhAllocation: true,
      operationalRoleType: "management" as unknown as JobRole["operationalRoleType"],
    } as JobRole;
    expect(effectiveOperationalRoleType(r)).toBe("indirect");
  });

  it("migrateRoleOperationalType assigns indirect when type missing and not billable", () => {
    const r = {
      id: "1",
      isBillable: false,
      includeInOhAllocation: true,
    } as JobRole;
    const m = migrateRoleOperationalType(r);
    expect(m.operationalRoleType).toBe("indirect");
    expect(legacyFlagsForOperationalRoleType("indirect").isBillable).toBe(false);
  });
});
