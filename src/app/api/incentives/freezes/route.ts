import { NextResponse } from "next/server";
import { z } from "zod";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import {
  addPayoutFreeze,
  listPayoutFreezes,
} from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const postSchema = z.object({
  hrBusinessUnitId: z.string().min(1),
  periodKey: z.string().min(1),
  reason: z.string().min(1),
});

export async function GET() {
  try {
    const tenant = await requireTenantContext();
    const freezes = await listPayoutFreezes(tenant.organizationId);
    return incentiveJson({ freezes });
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
    const freeze = await addPayoutFreeze(tenant.organizationId, {
      ...parsed.data,
      frozenAt: new Date().toISOString(),
    });
    return incentiveJson({ freeze }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
