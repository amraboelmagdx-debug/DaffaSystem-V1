import { NextResponse } from "next/server";
import { z } from "zod";
import { simulatorPresetSchema } from "@/lib/incentives/persist-schemas";
import { incentiveJson } from "@/server/incentives/incentive-api-meta";
import {
  listSimulatorPresets,
  upsertSimulatorPreset,
} from "@/server/incentives/incentive-store";
import { requireTenantContext } from "@/server/tenant/context";
import { tenantErrorResponse } from "@/server/tenant/errors";

const postSchema = z.object({
  hrBusinessUnitId: z.string().min(1),
  preset: simulatorPresetSchema,
});

export async function GET(req: Request) {
  try {
    const tenant = await requireTenantContext();
    const { searchParams } = new URL(req.url);
    const hrBusinessUnitId = searchParams.get("hrBusinessUnitId");
    if (!hrBusinessUnitId) {
      return NextResponse.json({ error: "hrBusinessUnitId required" }, { status: 400 });
    }
    const presets = await listSimulatorPresets(tenant.organizationId, hrBusinessUnitId);
    return incentiveJson({ presets });
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
    const saved = await upsertSimulatorPreset(
      tenant.organizationId,
      parsed.data.hrBusinessUnitId,
      parsed.data.preset
    );
    return incentiveJson({ preset: saved }, { status: 201 });
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
