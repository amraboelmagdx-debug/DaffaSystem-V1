import type { WorkforceAlert, WorkforceIntelligence } from "./types";

const INDIRECT_HC_WARN = 0.42;
const DELIVERY_RATIO_WARN = 0.38;
const MGMT_RATIO_WARN = 0.22;
const OH_LOAD_RATIO_WARN = 0.35;

export function buildWorkforceAlerts(intel: WorkforceIntelligence): WorkforceAlert[] {
  const out: WorkforceAlert[] = [];
  const { executive, org, economics } = intel;
  const hygiene = org.hygiene;
  const indirectHc = executive.indirectHeadcount;
  const totalHc = Math.max(1, executive.totalHeadcount);
  if (indirectHc / totalHc > INDIRECT_HC_WARN) {
    out.push({
      id: "indirect-high",
      severity: "warning",
      titleKey: "intelAlertIndirectHighTitle",
      bodyKey: "intelAlertIndirectHighBody",
    });
  }
  const delRatio = executive.deliveryHeadcount / totalHc;
  if (delRatio < DELIVERY_RATIO_WARN) {
    out.push({
      id: "delivery-low",
      severity: "warning",
      titleKey: "intelAlertDeliveryLowTitle",
      bodyKey: "intelAlertDeliveryLowBody",
    });
  }
  if (org.span.managementRatio > MGMT_RATIO_WARN) {
    out.push({
      id: "mgmt-heavy",
      severity: "info",
      titleKey: "intelAlertMgmtHeavyTitle",
      bodyKey: "intelAlertMgmtHeavyBody",
    });
  }
  if (economics.ratios.monthlyOhLoadRatio > OH_LOAD_RATIO_WARN) {
    out.push({
      id: "oh-load",
      severity: "info",
      titleKey: "intelAlertOhLoadTitle",
      bodyKey: "intelAlertOhLoadBody",
    });
  }
  if (hygiene.inactiveDepartments > 0 || hygiene.inactiveTeams > 0) {
    out.push({
      id: "inactive-structure",
      severity: "info",
      titleKey: "intelAlertInactiveStructureTitle",
      bodyKey: "intelAlertInactiveStructureBody",
    });
  }
  if (intel.trend.deltaPct != null && intel.trend.deltaPct > 8) {
    out.push({
      id: "cost-up",
      severity: "info",
      titleKey: "intelAlertCostUpTitle",
      bodyKey: "intelAlertCostUpBody",
    });
  }
  if (intel.trend.deltaPct != null && intel.trend.deltaPct < -8) {
    out.push({
      id: "cost-down",
      severity: "info",
      titleKey: "intelAlertCostDownTitle",
      bodyKey: "intelAlertCostDownBody",
    });
  }
  return out;
}
