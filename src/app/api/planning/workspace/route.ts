import { NextResponse } from "next/server";
import { loadPlanningWorkspace } from "@/server/planning/workspace";

export async function GET() {
  const data = await loadPlanningWorkspace();
  return NextResponse.json(data);
}
