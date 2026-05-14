import { NextResponse } from "next/server";
import { z } from "zod";
import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";

const bodySchema = z.object({
  row_id: z.string().uuid(),
  period_month: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  value: z.number(),
});

export async function POST(req: Request) {
  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { row_id, period_month, value } = parsed.data;
  const { error } = await supabase.from("planning_matrix_cells").upsert(
    {
      row_id,
      period_month,
      value,
      source: "manual",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "row_id,period_month" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
