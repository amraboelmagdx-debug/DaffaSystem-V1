import { describe, expect, it } from "vitest";
import {
  HR_WORKFORCE_BASE_KEY,
  legacyPersistKeyForBase,
  tenantPersistKey,
} from "./persist-keys";

describe("persist-keys", () => {
  it("builds tenant-scoped key", () => {
    const orgId = "00000000-0000-4000-8000-0000000000a1";
    expect(tenantPersistKey(orgId, HR_WORKFORCE_BASE_KEY)).toBe(
      `efp-${orgId}-hr-workforce`
    );
  });

  it("maps base key to legacy global name", () => {
    expect(legacyPersistKeyForBase(HR_WORKFORCE_BASE_KEY)).toBe("efp-hr-workforce");
  });
});
