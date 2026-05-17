import { NextResponse } from "next/server";

import { linkRevenueStreamToService } from "@/server/platform-economics/link-stream-to-service";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";
import { z } from "zod";

const bodySchema = z.object({
  serviceTemplateId: z.string().min(1).nullable().optional(),
  serviceFamilyId: z.string().min(1).nullable().optional(),
});

type RouteContext = { params: Promise<{ streamId: string }> };

export async function PATCH(req: Request, context: RouteContext) {
  try {
    const tenant = await requireTenantContext();
    const { streamId } = await context.params;
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const result = await linkRevenueStreamToService({
      organizationId: tenant.organizationId,
      streamId,
      serviceTemplateId: parsed.data.serviceTemplateId,
      serviceFamilyId: parsed.data.serviceFamilyId,
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.message }, { status: result.status });
    }

    return NextResponse.json({ streamId: result.streamId, metadata: result.metadata });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
