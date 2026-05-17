"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type TransitionalBannerVariant = "transitional" | "derived" | "deprecated";

type Props = {
  variant: TransitionalBannerVariant;
  /** Page shows read-only or non-authoritative data */
  readOnly?: boolean;
  /** Uses demo forecast builders or demo-seed style inputs */
  usesDemoData?: boolean;
  /** Sample-data panel or demo CRM opportunities */
  usesSampleData?: boolean;
  className?: string;
};

export function TransitionalArchitectureBanner({
  variant,
  readOnly = false,
  usesDemoData = false,
  usesSampleData = false,
  className,
}: Props) {
  const t = useTranslations("architectureCleanup");

  const badgeKey =
    variant === "deprecated"
      ? "badgeDeprecated"
      : variant === "derived"
        ? "badgeDerived"
        : "badgeTransitional";

  const titleKey =
    variant === "deprecated"
      ? "titleDeprecated"
      : variant === "derived"
        ? "titleDerived"
        : "titleTransitional";

  const bodyKey =
    variant === "deprecated"
      ? "bodyDeprecated"
      : variant === "derived"
        ? "bodyDerived"
        : "bodyTransitional";

  return (
    <div
      className={cn(
        "rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3 text-sm",
        className
      )}
      role="status"
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="warning">{t(badgeKey)}</Badge>
        {readOnly ? (
          <Badge variant="outline" className="font-normal">
            {t("badgeReadOnly")}
          </Badge>
        ) : null}
        {usesDemoData ? (
          <Badge variant="outline" className="font-normal">
            {t("badgeDemoData")}
          </Badge>
        ) : null}
        {usesSampleData ? (
          <Badge variant="outline" className="font-normal">
            {t("badgeSampleData")}
          </Badge>
        ) : null}
      </div>
      <p className="mt-2 font-medium text-foreground">{t(titleKey)}</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(bodyKey)}</p>
      <p className="mt-2 text-xs text-muted-foreground/90">{t("notCanonicalFootnote")}</p>
    </div>
  );
}
