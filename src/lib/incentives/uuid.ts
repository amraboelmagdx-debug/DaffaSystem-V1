const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUuid(value: string): boolean {
  return UUID_RE.test(value);
}

export function assertUuid(value: string, field: string): string {
  if (!isValidUuid(value)) {
    throw new Error(`${field} must be a valid UUID (got "${value}")`);
  }
  return value;
}

export function newIncentiveUuid(): string {
  return crypto.randomUUID();
}

/** Legacy client plans used plan-{buId} before migration 013 UUID columns. */
export function isLegacyIncentivePlanId(id: string): boolean {
  return id.startsWith("plan-") && !isValidUuid(id);
}
