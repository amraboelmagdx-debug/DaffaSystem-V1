"use client";

import { useTranslations } from "next-intl";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { useUnitScope } from "@/hooks/use-unit-scope";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  selectClassName?: string;
};

export function OperationalBuToolbar({ className, selectClassName }: Props) {
  const t = useTranslations("dashboard");
  const { isUnitScoped } = useUnitScope();
  const { linkedUnits, selectedUnit, setCompany, isReady } = useOperationalWorkspace();

  if (isUnitScoped) return null;

  if (!isReady || linkedUnits.length === 0) {
    return null;
  }

  const value = selectedUnit?.id ?? linkedUnits[0]?.id ?? "";

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {t("company")}
      </span>
      <Select value={value} onValueChange={setCompany}>
        <SelectTrigger className={cn("w-[220px] max-w-full", selectClassName)}>
          <SelectValue placeholder={t("company")} />
        </SelectTrigger>
        <SelectContent>
          {linkedUnits.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
