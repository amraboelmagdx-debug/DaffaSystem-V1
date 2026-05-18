"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type {
  AssumptionDriverCategory,
  AssumptionDriverId,
  AttributionNarrativeLabels,
} from "@/types/scenario-attribution";
import type { PostureDeltaField } from "@/types/scenario-comparison";

const DRIVER_IDS: AssumptionDriverId[] = [
  "overlay.revenueMonthly",
  "overlay.npTargetPct",
  "overlay.fixedCostsMonthly",
  "overlay.growthTargetPct",
  "overlay.marginTargetPct",
  "overlay.contributionMarginPct",
  "lever.growthAdj",
  "lever.conversionRateAdj",
  "lever.revenueMixAdj",
  "lever.fixedCostAdj",
  "lever.pipelineWeightAdj",
  "lever.npTargetPct",
  "workbook.tierOverrides",
  "governance.riskPosture",
  "governance.utilizationPosture",
];

const CATEGORIES: AssumptionDriverCategory[] = [
  "growth",
  "pricing",
  "utilization",
  "staffing",
  "margin",
  "cost",
  "risk",
  "service_mix",
  "fixed_cost",
  "pipeline",
  "workbook",
  "governance",
];

const POSTURE_FIELDS: PostureDeltaField[] = [
  "growthPosture",
  "utilizationPosture",
  "hiringPosture",
  "pricingPosture",
  "costPosture",
];

const PRESSURE_KEYS = [
  "riskLevelShift",
  "utilizationPressure",
  "salesGapWiden",
  "capacityProxy",
] as const;

export function useAttributionNarrativeLabels(): AttributionNarrativeLabels {
  const t = useTranslations("planning.attribution.narrative");

  return useMemo(() => {
    const driverLabel = {} as Record<AssumptionDriverId, string>;
    for (const id of DRIVER_IDS) {
      driverLabel[id] = t(`driver.${id.replace(/\./g, "_")}`);
    }

    const categoryLabel = {} as Record<AssumptionDriverCategory, string>;
    for (const cat of CATEGORIES) {
      categoryLabel[cat] = t(`category.${cat}`);
    }

    const postureLabels = {} as Record<PostureDeltaField, string>;
    for (const field of POSTURE_FIELDS) {
      postureLabels[field] = t(`posture.${field}`);
    }

    const pressureLabels: Record<string, string> = {};
    for (const key of PRESSURE_KEYS) {
      pressureLabels[key] = t(`pressure.${key}`);
    }

    return {
      revenueHeadline: (drivers, pct) => t("revenueHeadline", { drivers, pct }),
      marginHeadline: (drivers) => t("marginHeadline", { drivers }),
      riskHeadline: (reason) => t("riskHeadline", { reason }),
      tradeoff: (gain, cost) => t("tradeoff", { gain, cost }),
      whatChanged: (count) => t("whatChanged", { count }),
      whyChanged: (primary) => t("whyChanged", { primary }),
      residualNote: (revenue, np) => t("residualNote", { revenue, np }),
      postureShift: (field, from, to) => t("postureShift", { field, from, to }),
      serviceMix: t("serviceMix"),
      driverLabel,
      categoryLabel,
      pressureLabels,
      postureLabels,
      postureLevel: {
        low: t("postureLevel.low"),
        neutral: t("postureLevel.neutral"),
        high: t("postureLevel.high"),
      },
    };
  }, [t]);
}
