import { describe, expect, it } from "vitest";
import { getImportSliceResetPayload, IMPORT_SESSION_INITIAL } from "./hr-import-slice";

describe("hr-import-slice", () => {
  it("getImportSliceResetPayload clears logs and session fields", () => {
    const r = getImportSliceResetPayload();
    expect(r.importLogs).toEqual([]);
    expect(r.importSessionFileName).toBe(IMPORT_SESSION_INITIAL.importSessionFileName);
    expect(r.importSessionRows).toEqual([]);
    expect(r.importSessionPlan).toBeNull();
  });
});
