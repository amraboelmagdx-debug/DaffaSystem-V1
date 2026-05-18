import { NextResponse } from "next/server";
import { z } from "zod";
import { updatePlanningScenario } from "@/server/planning/scenarios";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const putSchema = z.object({
  name: z.string().min(1).optional(),
  isBaseline: z.boolean().optional(),
  parentScenarioId: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
  assumptions: z.record(z.unknown()),
  recordSnapshot: z.boolean().optional(),
});

export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireTenantContext();
  } catch (err) {
    return tenantErrorResponse(err);
  }

  const { id } = await ctx.params;
  const json = await req.json().catch(() => null);
  const parsed = putSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await updatePlanningScenario(id, {
    name: parsed.data.name,
    isBaseline: parsed.data.isBaseline,
    parentScenarioId: parsed.data.parentScenarioId,
    version: parsed.data.version,
    assumptions: parsed.data.assumptions as import("@/types/planning-scenario").ScenarioBundleAssumptionsPayload,
    recordSnapshot: parsed.data.recordSnapshot,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ ok: true });
}
