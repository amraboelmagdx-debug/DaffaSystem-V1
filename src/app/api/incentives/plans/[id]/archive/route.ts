import { NextResponse } from "next/server";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import { archiveIncentivePlan } from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext();
    const { id } = await params;
    const plan = await archiveIncentivePlan(tenant.organizationId, id);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return incentiveJson({ plan });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
