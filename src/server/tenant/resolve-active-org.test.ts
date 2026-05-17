import { describe, expect, it } from "vitest";
import {
  membershipForOrganization,
  resolveActiveOrganizationId,
} from "./resolve-active-org";
import type { TenantMembership } from "./types";

const memberships: TenantMembership[] = [
  {
    organizationId: "00000000-0000-4000-8000-000000000002",
    organizationName: "Org B",
    role: "analyst",
  },
  {
    organizationId: "00000000-0000-4000-8000-000000000001",
    organizationName: "Org A",
    role: "admin",
  },
];

describe("resolveActiveOrganizationId", () => {
  it("uses cookie when it matches a membership", () => {
    expect(
      resolveActiveOrganizationId(
        memberships,
        "00000000-0000-4000-8000-000000000002"
      )
    ).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("falls back to first sorted membership when cookie is invalid", () => {
    expect(resolveActiveOrganizationId(memberships, "not-a-member-org")).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
  });

  it("falls back when cookie is null", () => {
    expect(resolveActiveOrganizationId(memberships, null)).toBe(
      "00000000-0000-4000-8000-000000000001"
    );
  });

  it("returns null when no memberships", () => {
    expect(resolveActiveOrganizationId([], "any")).toBeNull();
  });
});

describe("membershipForOrganization", () => {
  it("returns membership for org B only when requested", () => {
    const m = membershipForOrganization(
      memberships,
      "00000000-0000-4000-8000-000000000002"
    );
    expect(m?.organizationName).toBe("Org B");
    expect(
      membershipForOrganization(memberships, "00000000-0000-4000-8000-000000009999")
    ).toBeUndefined();
  });
});
