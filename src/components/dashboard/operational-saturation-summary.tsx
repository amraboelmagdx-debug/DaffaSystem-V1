"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type {
  OperationalFeasibilityResult,
  ServiceDeliveryPressure,
} from "@/types/operational-feasibility";

type Props = {
  saturation: OperationalFeasibilityResult["saturation"];
  servicePressures: ServiceDeliveryPressure[];
};

export function OperationalSaturationSummary({ saturation, servicePressures }: Props) {
  const t = useTranslations("planning.feasibility");
  if (!saturation) return null;

  const highServices = servicePressures.filter((s) => s.pressureLevel === "high").slice(0, 4);

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("saturation")}
      </p>
      <p className="text-sm text-muted-foreground">
        {saturation.overloadRoleCount} overloaded roles ·{" "}
        {saturation.servicesOverCapacityCount} high-pressure services
      </p>
      {highServices.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {highServices.map((s) => (
            <Badge key={s.streamId} variant="secondary" className="text-[10px]">
              {s.streamName}
            </Badge>
          ))}
        </div>
      ) : null}
    </div>
  );
}
