import { describe, expect, it } from "vitest";
import { isTestSampleId, isTestSampleName } from "./sample-markers";

describe("sample-markers", () => {
  it("flags EFP and TEST dev role names", () => {
    expect(isTestSampleName("EFP_E2E_ROLE")).toBe(true);
    expect(isTestSampleName("TEST 222 Senior Consultant")).toBe(true);
    expect(isTestSampleName("Senior Consultant")).toBe(false);
  });

  it("flags synthetic ids", () => {
    expect(isTestSampleId("__efp_api_verify_role__")).toBe(true);
    expect(isTestSampleId("role-abc")).toBe(false);
  });
});
