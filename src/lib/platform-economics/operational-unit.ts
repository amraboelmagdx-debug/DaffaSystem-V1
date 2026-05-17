import type { DemoCompany } from "@/types/domain";

/** Planning projection of an HR Business Unit (`companies` row + optional HR link). */
export type OperationalUnit = DemoCompany;

export function isLinkedOperationalUnit(company: DemoCompany): boolean {
  return Boolean(company.hrBusinessUnitId?.trim());
}

export function isOrphanOperationalUnit(company: DemoCompany): boolean {
  return !isLinkedOperationalUnit(company);
}

export function partitionOperationalUnits(companies: DemoCompany[]): {
  linked: DemoCompany[];
  orphans: DemoCompany[];
} {
  const linked: DemoCompany[] = [];
  const orphans: DemoCompany[] = [];
  for (const c of companies) {
    if (isLinkedOperationalUnit(c)) linked.push(c);
    else orphans.push(c);
  }
  return { linked, orphans };
}

export function activeOperationalUnits(companies: DemoCompany[]): DemoCompany[] {
  return partitionOperationalUnits(companies).linked;
}

export function resolveCompanyIdForBusinessUnit(
  hrBusinessUnitId: string,
  companies: DemoCompany[]
): string | undefined {
  const id = hrBusinessUnitId.trim();
  if (!id) return undefined;
  return companies.find((c) => c.hrBusinessUnitId === id)?.id;
}

export function resolveBusinessUnitIdForCompany(
  companyId: string,
  companies: DemoCompany[]
): string | undefined {
  return companies.find((c) => c.id === companyId)?.hrBusinessUnitId;
}
