/** Detect dev/test pollution in persisted entities (names, ids). */
const TEST_ID_PATTERNS = [/^__efp_/i, /^role_efp_/i];

export function isTestSampleName(name: string | undefined | null): boolean {
  if (!name?.trim()) return false;
  const n = name.trim();
  if (/^EFP_/i.test(n)) return true;
  if (/^TEST\s*\d/i.test(n)) return true;
  if (/^TEST\s+\d/i.test(n)) return true;
  if (/EFP_(E2E|PERSIST|VITEST|API)_/i.test(n)) return true;
  return false;
}

export function isTestSampleId(id: string | undefined | null): boolean {
  if (!id?.trim()) return false;
  return TEST_ID_PATTERNS.some((p) => p.test(id));
}

export function isSampleCompanyId(id: string): boolean {
  return id === "co-northwind" || id === "co-aurora";
}
