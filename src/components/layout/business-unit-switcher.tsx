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
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

export function BusinessUnitSwitcher() {
  const t = useTranslations("holding");
  const router = useRouter();
  const pathname = usePathname();
  const { linkedUnits, selectedCompanyId, setCompany, clearOperationalContext } =
    useOperationalWorkspace();
  const onHoldingRoute = pathname.startsWith("/holding");
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);

  if (linkedUnits.length <= 1) return null;

  const labelFor = (companyId: string) => {
    const unit = linkedUnits.find((c) => c.id === companyId);
    if (!unit) return companyId;
    const hrBu = unit.hrBusinessUnitId
      ? businessUnits.find((b) => b.id === unit.hrBusinessUnitId)
      : undefined;
    return hrBu?.name ?? unit.name;
  };

  return (
    <Select
      value={onHoldingRoute ? "__holding__" : selectedCompanyId || linkedUnits[0]?.id}
      onValueChange={(id) => {
        if (id === "__holding__") {
          router.push("/holding");
          return;
        }
        setCompany(id);
      }}
    >
      <SelectTrigger className="h-8 w-[min(12rem,40vw)] text-xs" aria-label={t("switcherLabel")}>
        <SelectValue placeholder={t("switcherPlaceholder")} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__none__" disabled>
          {t("switcherPlaceholder")}
        </SelectItem>
        {linkedUnits.map((u) => (
          <SelectItem key={u.id} value={u.id}>
            {labelFor(u.id)}
          </SelectItem>
        ))}
        <SelectItem value="__holding__">{t("viewHolding")}</SelectItem>
      </SelectContent>
    </Select>
  );
}
