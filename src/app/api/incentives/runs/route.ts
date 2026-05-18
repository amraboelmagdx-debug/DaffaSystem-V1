import { NextResponse } from "next/server";
import { z } from "zod";
import { incentiveRunRecordSchema } from "@/lib/incentives/persist-schemas";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import { listIncentiveRuns, saveIncentiveRun } from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";
import type { IncentiveRunRecord, RerunPolicy } from "@/types/incentives";

const postSchema = z.object({
  record: incentiveRunRecordSchema,
  hrBusinessUnitId: z.string().min(1),
  periodKey: z.string().optional(),
  rerunPolicy: z.enum(["block_if_frozen", "supersede", "delta_only"]).optional(),
});

export async function GET(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const planId = searchParams.get("planId") ?? undefined;
    const periodYear = searchParams.get("periodYear");
    const hrBusinessUnitId = searchParams.get("hrBusinessUnitId") ?? undefined;
    const mode = searchParams.get("mode") ?? undefined;
    const runs = await listIncentiveRuns(tenant.organizationId, {
      planId,
      periodYear: periodYear ? Number(periodYear) : undefined,
      hrBusinessUnitId,
      mode,
    });
    return incentiveJson({ runs });
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
    const record = parsed.data.record as IncentiveRunRecord;
    const result = await saveIncentiveRun(
      tenant.organizationId,
      record,
      parsed.data.hrBusinessUnitId,
      {
        periodKey: parsed.data.periodKey,
        rerunPolicy: parsed.data.rerunPolicy as RerunPolicy | undefined,
      }
    );
    if (!result.ok) {
      return NextResponse.json(
        { error: result.message, code: result.code },
        { status: result.status }
      );
    }
    return incentiveJson({ run: result.run }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
