import type { DealEconomicsInput } from "./types";

export function validateDealEconomicsInput(
  input: DealEconomicsInput
): { ok: true } | { ok: false; errors: string[] } {
  const errors: string[] = [];
  if (!input.organizationId?.trim()) errors.push("organizationId is required.");
  if (!input.hrBusinessUnitId?.trim()) errors.push("hrBusinessUnitId is required.");
  if (!input.serviceTemplateId?.trim()) errors.push("serviceTemplateId is required.");
  if (!input.serviceTierId?.trim()) errors.push("serviceTierId is required.");
  if (!input.currency?.trim()) errors.push("currency is required.");
  if (!input.lines?.length) errors.push("At least one deal line is required.");
  for (const line of input.lines ?? []) {
    if (!line.id?.trim()) errors.push("Each deal line must have an id.");
    if (!(line.quantity > 0)) errors.push(`Line "${line.label || line.id}": quantity must be positive.`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}
