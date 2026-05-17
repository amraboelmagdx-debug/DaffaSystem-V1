import { NextResponse } from "next/server";
import { syncHrCatalogToPlanningWorkspace } from "@/server/platform-economics/sync-hr-to-planning";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function POST() {
  try {
    const tenant = await requireTenantContext();
    const result = await syncHrCatalogToPlanningWorkspace(tenant.organizationId);
    return NextResponse.json(result, { status: result.ok ? 200 : 422 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
