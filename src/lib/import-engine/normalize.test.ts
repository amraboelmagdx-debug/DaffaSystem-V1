import { describe, expect, it } from "vitest";
import { bool, ciKey, matchHeader, num, normalizeHeader } from "./normalize";

describe("import-engine normalize", () => {
  it("ciKey trims and lowercases", () => {
    expect(ciKey("  Foo  ")).toBe("foo");
    expect(ciKey(null)).toBe("");
  });

  it("num parses comma-separated numbers", () => {
    expect(num("1,234.5")).toBe(1234.5);
    expect(num("")).toBe(0);
    expect(num("not a number", 42)).toBe(42);
  });

  it("bool recognizes common true/false tokens", () => {
    expect(bool("yes")).toBe(true);
    expect(bool("TRUE")).toBe(true);
    expect(bool("0")).toBe(false);
    expect(bool("maybe", true)).toBe(true);
  });

  it("matchHeader picks the best candidate", () => {
    const headers = ["Business Unit", "BU code"];
    expect(matchHeader(headers, { exact: ["business unit"] })).toBe("Business Unit");
    expect(matchHeader(headers, { includes: ["unit"] })).toBe("Business Unit");
  });

  it("normalizeHeader collapses whitespace", () => {
    expect(normalizeHeader("  Business   Unit  ")).toBe("business unit");
  });
});
