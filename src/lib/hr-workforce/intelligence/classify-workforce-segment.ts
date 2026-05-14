import type { JobRole } from "@/types/hr-workforce";
import { effectiveOperationalRoleType } from "@/lib/hr-workforce/role-operational-type";
import type { WorkforceSegment } from "./types";

const MGMT_RE =
  /(\bmanager\b|\bdirector\b|\bhead\b|\bvp\b|\bv\.p\.|\bcfo\b|\bceo\b|\bmd\b|\bchief\b|\bpresident\b|مدير|رئيس|مدير\s*عام)/i;

/**
 * Delivery / Support / Management split for intelligence & UX only.
 * Persisted `operationalRoleType` remains `delivery` | `indirect`; indirect rows are split heuristically.
 */
export function classifyWorkforceSegment(role: JobRole): WorkforceSegment {
  if (effectiveOperationalRoleType(role) === "delivery") return "delivery";
  if (MGMT_RE.test(role.name)) return "management";
  return "support";
}
