import type { OhManualSettings } from "@/types/hr-workforce";

export const DEFAULT_OH: OhManualSettings = {
  utilizationRatePct: 80,
  billableEmployeeCount: 10,
  totalAnnualOverhead: 500_000,
  billableFteSource: "manual",
  useComposedAnnualOh: false,
  ohNonWorkforceLines: [],
};
