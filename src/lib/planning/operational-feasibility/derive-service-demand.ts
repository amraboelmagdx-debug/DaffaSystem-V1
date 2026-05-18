import type { DemoRevenueStream } from "@/types/domain";
import type { ServiceDeliveryPressure, ServicePressureLevel } from "@/types/operational-feasibility";
import { EPS, SERVICE_OVERCAPACITY_SHARE_THRESHOLD } from "./feasibility-constants";

export function deriveServicePressures(input: {
  streamDemandHours: Map<string, number>;
  streams: DemoRevenueStream[];
  serviceHoursByTemplateId: Record<string, number>;
  totalSupplyHours: number;
}): ServiceDeliveryPressure[] {
  const { streamDemandHours, streams, serviceHoursByTemplateId, totalSupplyHours } = input;
  const totalDemand = [...streamDemandHours.values()].reduce((s, v) => s + v, 0);
  if (totalDemand < EPS) return [];

  const pressures: ServiceDeliveryPressure[] = [];

  for (const st of streams) {
    const demanded = streamDemandHours.get(st.id) ?? 0;
    if (demanded < EPS) continue;

    const sharePct = (demanded / totalDemand) * 100;
    const templateId = st.serviceTemplateId?.trim() || null;
    let pressureLevel: ServicePressureLevel = "low";

    if (templateId && serviceHoursByTemplateId[templateId] != null) {
      const templateHours = serviceHoursByTemplateId[templateId]!;
      const impliedUnits = demanded / Math.max(templateHours, 1);
      if (impliedUnits > 1.2) pressureLevel = "high";
      else if (impliedUnits > 1.05) pressureLevel = "moderate";
    }

    const proportionalSupplyShare = totalSupplyHours > EPS ? demanded / totalSupplyHours : 0;
    if (proportionalSupplyShare > 1 + SERVICE_OVERCAPACITY_SHARE_THRESHOLD) {
      pressureLevel = "high";
    } else if (proportionalSupplyShare > 1 && pressureLevel === "low") {
      pressureLevel = "moderate";
    }

    pressures.push({
      streamId: st.id,
      streamName: st.name,
      serviceTemplateId: templateId,
      demandedHours: demanded,
      shareOfTotalDemandPct: sharePct,
      pressureLevel,
    });
  }

  return pressures.sort((a, b) => b.demandedHours - a.demandedHours);
}
