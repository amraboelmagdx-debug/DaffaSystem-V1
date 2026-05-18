import { NextResponse } from "next/server";
import { z } from "zod";
import { incentivePlanSchema } from "@/lib/incentives/persist-schemas";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import {
  listIncentivePlans,
  upsertIncentivePlan,
} from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const postSchema = z.object({
  plan: incentivePlanSchema,
});

export async function GET(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const hrBusinessUnitId = searchParams.get("hrBusinessUnitId") ?? undefined;
    const plans = await listIncentivePlans(tenant.organizationId, hrBusinessUnitId);
    return incentiveJson({ plans });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function POST(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const json = await req.json().catch(() => null);
    const parsed = postSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    const result = await upsertIncentivePlan(tenant.organizationId, {
      ...parsed.data.plan,
      organizationId: tenant.organizationId,
    } as import("@/types/incentives").IncentivePlan);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: "PERSISTENCE_DEGRADED" },
        { status: result.status }
      );
    }
    return incentiveJson({ plan: result.plan }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
