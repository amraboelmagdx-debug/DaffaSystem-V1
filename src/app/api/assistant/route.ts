import { NextResponse } from "next/server";
import { z } from "zod";

const bodySchema = z.object({
  question: z.string().min(3).max(2000),
  context: z
    .object({
      revenue: z.number().optional(),
      netProfit: z.number().optional(),
      roi: z.number().optional(),
      npPct: z.number().optional(),
      pipelineWeighted: z.number().optional(),
    })
    .optional(),
});

function analyze(question: string, ctx: z.infer<typeof bodySchema>["context"]) {
  const q = question.toLowerCase();
  const bullets: string[] = [];

  if (q.includes("roi")) {
    bullets.push(
      "ROI is net profit divided by fixed costs. If ROI is falling while revenue is flat, check contribution margin compression or rising fixed costs."
    );
  }
  if (q.includes("np") || q.includes("net profit")) {
    bullets.push(
      "Net profit moves with (contribution margin × revenue) − fixed costs. A 5pt NP lift typically needs either higher CM mix or lower fixed cost intensity."
    );
  }
  if (q.includes("scenario")) {
    bullets.push(
      "Compare scenarios by net profit and sales gap. Aggressive growth scenarios often trade NP% for velocity — validate pipeline coverage before committing."
    );
  }
  if (q.includes("pipeline") || q.includes("coverage")) {
    bullets.push(
      "Weighted pipeline should cover several months of quota depending on cycle length. Low coverage with high growth targets is a leading risk flag."
    );
  }
  if (q.includes("margin") || q.includes("contribution")) {
    bullets.push(
      "Weak revenue streams drag blended CM. Prioritize streams with high CM% and realistic conversion uplift rather than only top-line growth."
    );
  }
  if (!bullets.length) {
    bullets.push(
      "Ask about ROI, NP targets, scenarios, pipeline coverage, or contribution margin — the assistant maps your question to planning heuristics and highlights likely drivers."
    );
  }

  if (ctx) {
    if (ctx.netProfit !== undefined && ctx.netProfit < 0) {
      bullets.unshift(
        "Current context shows negative net profit — reduce fixed costs, raise CM mix, or increase revenue until gross profit clears overhead."
      );
    }
    if (ctx.roi !== undefined && ctx.roi < 0.05) {
      bullets.unshift(
        "ROI is below 5% in the supplied context — stress-test fixed costs and sales efficiency before scaling headcount."
      );
    }
  }

  return {
    summary: "Executive insight (deterministic rules engine — swap for LLM when ready).",
    bullets,
    actions: [
      "Open Scenarios to compare aggressive vs conservative paths.",
      "Tune company targets under Companies to restate contribution and NP goals.",
      "Use Pipeline to raise probabilities on late-stage deals with defensible close plans.",
    ],
  };
}

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }
  const result = analyze(parsed.data.question, parsed.data.context);
  return NextResponse.json(result);
}
