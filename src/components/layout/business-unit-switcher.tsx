"use client";

import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export function BusinessUnitSwitcher() {
  const t = useTranslations("holding");
  const router = useRouter();
  const pathname = usePathname();
  const { linkedUnits, selectedCompanyId, setCompany } =
    useOperationalWorkspace();
  const { isUnitScoped, companyId, prefix } = useUnitRouteContext();
  const onHoldingRoute = pathname.startsWith("/holding");
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);

  if (linkedUnits.length === 0) return null;
  if (!isUnitScoped && linkedUnits.length <= 1) return null;

  const activeId = isUnitScoped
    ? companyId ?? ""
    : onHoldingRoute
      ? "__holding__"
      : selectedCompanyId || linkedUnits[0]?.id || "";

  const labelFor = (cId: string) => {
    const unit = linkedUnits.find((c) => c.id === cId);
    if (!unit) return cId;
    const hrBu = unit.hrBusinessUnitId
      ? businessUnits.find((b) => b.id === unit.hrBusinessUnitId)
      : undefined;
    return hrBu?.name ?? unit.name;
  };

  const handleChange = (next: string) => {
    if (next === "__holding__") {
      router.push("/holding");
      return;
    }
    if (isUnitScoped && companyId) {
      // Replace the [companyId] segment in the current path, keeping the
      // module sub-path intact (e.g. /unit/A/sales-plan → /unit/B/sales-plan).
      const tail = pathname.slice(prefix.length);
      setCompany(next);
      router.push(`/unit/${next}${tail}`);
      return;
    }
    setCompany(next);
    router.push(`/unit/${next}`);
  };

  return (
    <Select value={activeId} onValueChange={handleChange}>
      <SelectTrigger
        className="h-8 w-[min(12rem,40vw)] text-xs"
        aria-label={t("switcherLabel")}
      >
        <SelectValue placeholder={t("switcherPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__holding__">{t("viewHolding")}</SelectItem>
        {linkedUnits.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {labelFor(u.id)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
