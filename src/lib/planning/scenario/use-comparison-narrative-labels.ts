"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { ComparisonNarrativeLabels, PostureDeltaField } from "@/types/scenario-comparison";

const POSTURE_FIELDS: PostureDeltaField[] = [
  "growthPosture",
  "utilizationPosture",
  "hiringPosture",
  "pricingPosture",
  "costPosture",
];

export function useComparisonNarrativeLabels(): ComparisonNarrativeLabels {
  const t = useTranslations("planning.comparison.narrative");

  return useMemo(() => {
  const postureLabels = {} as Record<PostureDeltaField, string>;
  for (const field of POSTURE_FIELDS) {
    postureLabels[field] = t(`posture.${field}`);
  }

  return {
    revenueUp: (pct, compareName, baseName) =>
      t("revenueUp", { pct, compareName, baseName }),
    revenueDown: (pct, compareName, baseName) =>
      t("revenueDown", { pct, compareName, baseName }),
    netProfitUp: (pct) => t("netProfitUp", { pct }),
    netProfitDown: (pct) => t("netProfitDown", { pct }),
    postureShift: (field, from, to) => t("postureShift", { field, from, to }),
    governanceTypeChange: (from, to) => t("governanceTypeChange", { from, to }),
    salesGapWiden: (amount) => t("salesGapWiden", { amount }),
    salesGapNarrow: (amount) => t("salesGapNarrow", { amount }),
    sharedStreams: t("sharedStreams"),
    capacityProxy: (from, to) => t("capacityProxy", { from, to }),
    defaultHeadline: (compareName, baseName) => t("defaultHeadline", { compareName, baseName }),
    postureLabels,
    postureLevel: {
      low: t("postureLevel.low"),
      neutral: t("postureLevel.neutral"),
      high: t("postureLevel.high"),
    },
  };
  }, [t]);
}
