import { NextResponse } from "next/server";
import { z } from "zod";
import { createPlanningScenario } from "@/server/planning/scenarios";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const postSchema = z.object({
  companyId: z.string().min(1),
  name: z.string().min(1),
  isBaseline: z.boolean().optional(),
  parentScenarioId: z.string().nullable().optional(),
  version: z.number().int().positive().optional(),
  assumptions: z.record(z.unknown()),
  clientId: z.string().optional(),
});

export async function POST(req: Request) {
  try {
    await requireTenantContext();
  } catch (err) {
    return tenantErrorResponse(err);
  }

  const json = await req.json().catch(() => null);
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createPlanningScenario({
    companyId: parsed.data.companyId,
    name: parsed.data.name,
    isBaseline: parsed.data.isBaseline,
    parentScenarioId: parsed.data.parentScenarioId ?? null,
    version: parsed.data.version,
    assumptions: parsed.data.assumptions as import("@/types/planning-scenario").ScenarioBundleAssumptionsPayload,
    clientId: parsed.data.clientId,
  });

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 503 });
  }

  return NextResponse.json({ id: result.id });
}
