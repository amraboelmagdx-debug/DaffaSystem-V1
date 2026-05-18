import { NextResponse } from "next/server";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import { listOverrideAudit } from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

export async function GET(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId");
    if (!planId) {
      return NextResponse.json({ error: "planId required" }, { status: 400 });
    }
    const entries = await listOverrideAudit(tenant.organizationId, planId);
    return incentiveJson({ entries });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
