import { NextResponse } from "next/server";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import { listPlanVersions } from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext();
    const { id } = await params;
    const versions = await listPlanVersions(tenant.organizationId, id);
    return incentiveJson({ versions });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
