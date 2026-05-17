import { NextResponse } from "next/server";
import { z } from "zod";
import {
  assertOrganizationMembership,
  getTenantContext,
  requireTenantContext,
} from "@/server/tenant/context";
import { setActiveOrganizationCookie } from "@/server/tenant/cookies";
import { TenantForbiddenError, tenantErrorResponse } from "@/server/tenant/errors";
import { membershipForOrganization } from "@/server/tenant/resolve-active-org";

const bodySchema = z.object({
  organizationId: z.string().uuid(),
});

export async function POST(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { organizationId } = parsed.data;
    assertOrganizationMembership(tenant, organizationId);

    const active = membershipForOrganization(tenant.memberships, organizationId);
    if (!active) {
      throw new TenantForbiddenError();
    }

    const response = NextResponse.json({
      userId: tenant.userId,
      activeOrganizationId: active.organizationId,
      activeOrganizationName: active.organizationName,
      role: active.role,
      memberships: tenant.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        role: m.role,
      })),
    });

    setActiveOrganizationCookie(response, organizationId);
    return response;
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

/** Allow GET to return current context without switching (convenience). */
export async function GET() {
  try {
    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    return NextResponse.json({
      userId: ctx.userId,
      activeOrganizationId: ctx.organizationId,
      activeOrganizationName: ctx.organizationName,
      role: ctx.role,
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
