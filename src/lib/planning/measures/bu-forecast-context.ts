import type { DemoCompany } from "@/types/domain";
import { resolveBusinessUnitIdForCompany } from "@/lib/platform-economics/operational-unit";

/** BU-scoped forecast identity (versioned forecasts will key off this in Phase 7). */
export type BuForecastContext = {
  organizationId: string;
  hrBusinessUnitId: string;
  companyId: string;
  companyName: string;
  scenarioId: string | null;
};

export function buildBuForecastContext(
  company: DemoCompany,
  scenarioId: string | null
): BuForecastContext | null {
  const hrBusinessUnitId =
    company.hrBusinessUnitId ?? resolveBusinessUnitIdForCompany(company.id, [company]);
  if (!hrBusinessUnitId) return null;
  return {
    organizationId: company.organizationId,
    hrBusinessUnitId,
    companyId: company.id,
    companyName: company.name,
    scenarioId,
  };
}
