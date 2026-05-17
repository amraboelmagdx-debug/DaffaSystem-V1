import type { ServiceEconomicsGraphContext } from "@/lib/service-economics/types";
import type { DealEconomicsGraphEdge, DealEconomicsInput } from "./types";

export function buildDealEconomicsGraphEdges(
  input: DealEconomicsInput,
  graph: ServiceEconomicsGraphContext
): DealEconomicsGraphEdge[] {
  const edges: DealEconomicsGraphEdge[] = [
    { kind: "tenant", organizationId: input.organizationId },
    {
      kind: "business_unit",
      hrBusinessUnitId: input.hrBusinessUnitId,
      companyId: graph.companyId,
    },
  ];
  if (input.revenueStreamId) {
    edges.push({ kind: "revenue_stream", streamId: input.revenueStreamId });
  }
  edges.push({
    kind: "service_template",
    templateId: graph.templateId,
    tierId: graph.tierId,
  });
  return edges;
}
