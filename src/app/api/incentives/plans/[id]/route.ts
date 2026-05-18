import { NextResponse } from "next/server";
import { z } from "zod";
import { incentivePlanSchema } from "@/lib/incentives/persist-schemas";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import {
  getIncentivePlan,
  upsertIncentivePlan,
} from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";
import type { IncentivePlan } from "@/types/incentives";

const putSchema = z.object({
  plan: incentivePlanSchema,
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext();
    const { id } = await params;
    const plan = await getIncentivePlan(tenant.organizationId, id);
    if (!plan) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return incentiveJson({ plan });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const tenant = await requireTenantContext();
    const { id } = await params;
    const json = await req.json().catch(() => null);
    const parsed = putSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }
    if (parsed.data.plan.id !== id) {
      return NextResponse.json({ error: "plan.id mismatch" }, { status: 400 });
    }
    const result = await upsertIncentivePlan(tenant.organizationId, {
      ...parsed.data.plan,
      organizationId: tenant.organizationId,
    } as IncentivePlan);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: "PERSISTENCE_DEGRADED" },
        { status: result.status }
      );
    }
    return incentiveJson({ plan: result.plan });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
