import { NextResponse } from "next/server";
import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";
import { getTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function GET() {
  try {
    let authenticated = false;
    const supabase = await createRouteSupabaseClient();
    if (supabase) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      authenticated = Boolean(user);
    }

    const ctx = await getTenantContext();
    if (!ctx) {
      return NextResponse.json(
        { error: "Authentication required", authenticated: false },
        { status: 401 }
      );
    }

    return NextResponse.json({
      userId: ctx.userId,
      activeOrganizationId: ctx.organizationId,
      activeOrganizationName: ctx.organizationName,
      role: ctx.role,
      authenticated,
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
