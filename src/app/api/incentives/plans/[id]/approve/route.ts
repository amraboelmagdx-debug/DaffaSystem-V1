import { NextResponse } from "next/server";
import { z } from "zod";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import { approveIncentivePlan } from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const bodySchema = z.object({
  approvedBy: z.string().nullable().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext();
    const { id } = await params;
    const json = await req.json().catch(() => ({}));
    const parsed = bodySchema.safeParse(json);
    const approvedBy = parsed.success ? parsed.data.approvedBy : null;
    const plan = await approveIncentivePlan(tenant.organizationId, id, approvedBy);
    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }
    return incentiveJson({ plan });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
