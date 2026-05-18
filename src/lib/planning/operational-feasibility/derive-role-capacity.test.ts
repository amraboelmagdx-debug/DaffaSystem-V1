import { describe, expect, it } from "vitest";
import { deriveHrWorkforceModel } from "@/lib/hr-workforce/selectors";
import { deriveRoleCapacityForBu, mergeOhManualForBu } from "./derive-role-capacity";
import { buildTestHrSnapshot } from "./test-hr-fixture";

describe("derive-role-capacity", () => {
  it("role available hours align with OH billable pool for delivery roles", () => {
    const snap = buildTestHrSnapshot();
    const buId = snap.businessUnits[0]!.id;
    const om = mergeOhManualForBu(buId, snap.ohManualByBusinessUnitId);
    const roles = deriveRoleCapacityForBu({
      hrBusinessUnitId: buId,
      roles: snap.roles,
      hrGlobalSettings: snap.hrGlobalSettings,
      ohManual: om,
    });

    const roleHoursSum = roles.reduce((s, r) => s + r.availableHoursMonth, 0);
    const derived = deriveHrWorkforceModel(snap);
    const buOh = derived.ohByBusinessUnitId[buId]!.oh.totalBillableHoursPerMonth;

    expect(roleHoursSum).toBeGreaterThan(0);
    expect(Math.abs(roleHoursSum - buOh) / buOh).toBeLessThan(0.06);
    expect(roles.length).toBeGreaterThan(0);
  });
});
