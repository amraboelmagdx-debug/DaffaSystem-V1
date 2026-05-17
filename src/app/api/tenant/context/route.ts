import { NextResponse } from "next/server";
import { getTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

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
      memberships: ctx.memberships.map((m) => ({
        organizationId: m.organizationId,
        organizationName: m.organizationName,
        role: m.role,
      })),
    });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
