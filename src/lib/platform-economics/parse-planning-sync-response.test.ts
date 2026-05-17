import { describe, expect, it } from "vitest";

import {
  coerceErrorMessages,
  parsePlanningSyncResponse,
} from "./parse-planning-sync-response";

describe("coerceErrorMessages", () => {
  it("returns empty for nullish", () => {
    expect(coerceErrorMessages(undefined)).toEqual([]);
    expect(coerceErrorMessages(null)).toEqual([]);
  });

  it("handles string and array", () => {
    expect(coerceErrorMessages("a")).toEqual(["a"]);
    expect(coerceErrorMessages(["x", "y"])).toEqual(["x", "y"]);
  });

  it("extracts error and message fields", () => {
    expect(coerceErrorMessages({ error: "Auth required" })).toEqual(["Auth required"]);
    expect(coerceErrorMessages({ message: "Failed" })).toEqual(["Failed"]);
  });
});

describe("parsePlanningSyncResponse", () => {
  it("marks 401 with authRequired and default message", () => {
    const res = new Response(JSON.stringify({ error: "Sign in required" }), {
      status: 401,
    });
    const parsed = parsePlanningSyncResponse(res, { error: "Sign in required" });
    expect(parsed.authRequired).toBe(true);
    expect(parsed.ok).toBe(false);
    expect(parsed.errors).toEqual(["Sign in required"]);
  });

  it("handles 200 sync body with errors array", () => {
    const res = new Response(null, { status: 200 });
    const parsed = parsePlanningSyncResponse(res, {
      ok: false,
      organizationId: "org-1",
      errors: ["HR catalog missing"],
      companiesUpserted: 0,
      linksUpserted: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      scenariosCreated: 0,
      companiesRetired: 0,
    });
    expect(parsed.authRequired).toBeUndefined();
    expect(parsed.errors).toEqual(["HR catalog missing"]);
    expect(parsed.organizationId).toBe("org-1");
  });

  it("handles missing errors field without throwing", () => {
    const res = new Response(null, { status: 422 });
    const parsed = parsePlanningSyncResponse(res, { ok: false, organizationId: "o" });
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.errors)).toBe(true);
  });
});
