import type {
  IncentiveDealInput,
  IncentivePlan,
  IncentiveRule,
} from "@/types/incentives";

function matchesClass<T extends string>(
  ruleValue: T | "any",
  actual: T
): boolean {
  return ruleValue === "any" || ruleValue === actual;
}

export function matchIncentiveRule(
  plan: IncentivePlan,
  deal: IncentiveDealInput
): IncentiveRule | null {
  const referralClass = deal.referral ? "referral" : "non_referral";
  const candidates = plan.rules.filter(
    (r) =>
      r.tierKey === deal.tierKey &&
      matchesClass(r.referral, referralClass) &&
      matchesClass(r.clientType, deal.clientType) &&
      matchesClass(r.complexity, deal.complexity)
  );
  if (!candidates.length) return null;
  const scored = candidates.map((r) => {
    let specificity = 0;
    if (r.referral !== "any") specificity += 4;
    if (r.clientType !== "any") specificity += 2;
    if (r.complexity !== "any") specificity += 1;
    return { r, specificity };
  });
  scored.sort((a, b) => b.specificity - a.specificity);
  return scored[0].r;
}
