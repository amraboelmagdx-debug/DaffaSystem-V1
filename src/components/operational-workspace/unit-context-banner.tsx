"use client";

import { useTranslations } from "next-intl";
import { Building2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { useUnitScope } from "@/hooks/use-unit-scope";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  showHoldingLink?: boolean;
};

export function UnitContextBanner({ className, showHoldingLink = true }: Props) {
  const t = useTranslations("unitScope");
  const { isUnitScoped, unitLabel } = useUnitScope();

  if (!isUnitScoped || !unitLabel) return null;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm",
        className
      )}
    >
      <Building2 className="h-4 w-4 shrink-0 text-primary" aria-hidden />
      <span className="text-muted-foreground">
        {t("workingIn")}{" "}
        <span className="font-medium text-foreground">{unitLabel}</span>
      </span>
      {showHoldingLink ? (
        <Link
          href="/holding"
          className="ms-auto text-xs font-medium text-primary hover:underline"
        >
          {t("viewHolding")}
        </Link>
      ) : null}
    </div>
  );
}

