"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { OperationalFeasibilityNarrativeLabels } from "@/types/operational-feasibility";

const RISK_KEYS = [
  "deliveryInfeasible",
  "deliveryConstrained",
  "roleOverload",
  "utilizationThreshold",
] as const;

export function useFeasibilityNarrativeLabels(): OperationalFeasibilityNarrativeLabels {
  const t = useTranslations("planning.feasibility.narrative");

  return useMemo(() => {
    const riskLabels: Record<string, string> = {};
    for (const key of RISK_KEYS) {
      riskLabels[key] = t(`risk.${key}`);
    }

    return {
      headlineFeasible: (scenario) => t("headlineFeasible", { scenario }),
      headlineConstrained: (scenario, pct) => t("headlineConstrained", { scenario, pct }),
      headlineInfeasible: (scenario, pct) => t("headlineInfeasible", { scenario, pct }),
      roleOverload: (scenario, role, pct) => t("roleOverload", { scenario, role, pct }),
      serviceBottleneck: (service) => t("serviceBottleneck", { service }),
      hiringPressure: (fte) => t("hiringPressure", { fte }),
      thresholdBreach: (count) => t("thresholdBreach", { count }),
      unavailable: (reason) => t("unavailable", { reason }),
      compareStatusShift: (from, to) => t("compareStatusShift", { from, to }),
      disclaimer: t("disclaimer"),
      statusLabel: {
        feasible: t("status.feasible"),
        constrained: t("status.constrained"),
        infeasible: t("status.infeasible"),
        unavailable: t("status.unavailable"),
      },
      hiringLevel: {
        low: t("hiringLevel.low"),
        moderate: t("hiringLevel.moderate"),
        high: t("hiringLevel.high"),
        severe: t("hiringLevel.severe"),
      },
      riskLabels,
    };
  }, [t]);
}
