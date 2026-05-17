import { NextResponse } from "next/server";
import { loadPlanningWorkspace } from "@/server/planning/workspace";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const data = await loadPlanningWorkspace(tenant.organizationId);
    return NextResponse.json(data);
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
