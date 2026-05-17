import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveActiveOrganizationId } from "./resolve-active-org";

describe("dev tenant bypass policy", () => {
  const env = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...env };
  });

  afterEach(() => {
    process.env = env;
  });

  it("blocks dev bypass in production NODE_ENV", async () => {
    process.env.NODE_ENV = "production";
    process.env.VERCEL_ENV = undefined;
    process.env.DEV_TENANT_ID = "00000000-0000-4000-8000-000000000001";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getTenantContext } = await import("./context");
    const ctx = await getTenantContext();
    expect(ctx).toBeNull();
  });

  it("allows dev bypass when DEV_TENANT_ID set in development without Supabase", async () => {
    process.env.NODE_ENV = "development";
    process.env.VERCEL_ENV = undefined;
    process.env.DEV_TENANT_ID = "00000000-0000-4000-8000-0000000000aa";
    process.env.DEV_TENANT_NAME = "Dev Org";
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const { getTenantContext } = await import("./context");
    const ctx = await getTenantContext();
    expect(ctx?.organizationId).toBe("00000000-0000-4000-8000-0000000000aa");
    expect(ctx?.role).toBe("admin");
  });
});

describe("cross-tenant org resolution", () => {
  it("user A cookie for org B is ignored when not in memberships", () => {
    const userAMemberships = [
      {
        organizationId: "org-a",
        organizationName: "Tenant A",
        role: "admin" as const,
      },
    ];
    const resolved = resolveActiveOrganizationId(userAMemberships, "org-b");
    expect(resolved).toBe("org-a");
  });
});

describe("requireTenantContext", () => {
  afterEach(() => {
    vi.resetModules();
  });

  it("throws TenantAuthError when no context available", async () => {
    process.env.NODE_ENV = "production";
    delete process.env.DEV_TENANT_ID;
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    vi.doMock("@/lib/supabase/route-handler", () => ({
      createRouteSupabaseClient: vi.fn().mockResolvedValue(null),
    }));

    const { requireTenantContext } = await import("./context");
    const { TenantAuthError } = await import("./errors");

    await expect(requireTenantContext()).rejects.toBeInstanceOf(TenantAuthError);
  });
});
