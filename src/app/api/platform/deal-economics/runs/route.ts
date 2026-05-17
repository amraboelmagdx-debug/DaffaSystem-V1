import { NextResponse } from "next/server";
import { z } from "zod";

import type { DealEconomicsInput, DealEconomicsResultSuccess } from "@/lib/deal-economics/types";
import { persistDealEconomicsRun } from "@/server/platform-economics/persist-deal-economics-run";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const bodySchema = z.object({
  hrBusinessUnitId: z.string().min(1),
  input: z.record(z.unknown()),
  result: z.record(z.unknown()),
});

/**
 * Stub persistence for versioned calculator runs.
 * Client performs `evaluateDealEconomics` locally; POST stores immutable input + result.
 */
export async function POST(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const json = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(json);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parsed.error.flatten() },
        { status: 422 }
      );
    }

    const result = parsed.data.result as DealEconomicsResultSuccess;
    if (result?.ok !== true) {
      return NextResponse.json(
        { error: "result must be a successful DealEconomicsResult (ok: true)" },
        { status: 422 }
      );
    }

    const persist = await persistDealEconomicsRun({
      organizationId: tenant.organizationId,
      hrBusinessUnitId: parsed.data.hrBusinessUnitId,
      input: parsed.data.input as DealEconomicsInput,
      result,
    });

    if (!persist.ok) {
      return NextResponse.json({ error: persist.message }, { status: persist.status });
    }

    return NextResponse.json({ run: persist.run }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
