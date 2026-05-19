import { useSalesPlanWizardStore } from "@/stores/use-sales-plan-wizard-store";
import { useWorkspaceStore } from "@/stores/use-workspace-store";

/** Keep linked planning company (and sales-plan meta) in sync with HR BU display name. */
export function mirrorBuNameToLinkedCompany(
  hrBusinessUnitId: string,
  name: string
): string | null {
  const trimmed = name.trim();
  if (!trimmed) return null;

  const { companies, selectedCompanyId, updateCompany } =
    useWorkspaceStore.getState();
  const company = companies.find((c) => c.hrBusinessUnitId === hrBusinessUnitId);
  if (!company) return null;

  updateCompany(company.id, { name: trimmed });

  if (selectedCompanyId === company.id) {
    const wizard = useSalesPlanWizardStore.getState();
    if (wizard.meta.portfolioName !== trimmed) {
      useSalesPlanWizardStore.setState({
        meta: { ...wizard.meta, portfolioName: trimmed },
      });
    }
  }

  return company.id;
}
