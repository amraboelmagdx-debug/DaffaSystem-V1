"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

const SEGMENT_KEYS: Record<string, string> = {
  "": "breadcrumbs.executive",
  "sales-plan": "breadcrumbs.salesPlan",
  "sales-incentives": "breadcrumbs.incentives",
  "service-architecture": "breadcrumbs.serviceArchitecture",
  "hr-workforce": "breadcrumbs.hrWorkforce",
  settings: "breadcrumbs.settings",
  grid: "breadcrumbs.grid",
  scenarios: "breadcrumbs.scenarios",
  pipeline: "breadcrumbs.pipeline",
  assistant: "breadcrumbs.assistant",
  "get-started": "breadcrumbs.getStarted",
  "test-lab": "breadcrumbs.testLab",
  import: "breadcrumbs.import",
  intelligence: "breadcrumbs.intelligence",
  roles: "breadcrumbs.roles",
  families: "breadcrumbs.families",
  templates: "breadcrumbs.templates",
};

export function OperationalBreadcrumbs({ className }: { className?: string }) {
  const pathname = usePathname();
  const t = useTranslations("ox");
  const parts = pathname.split("/").filter(Boolean);

  if (parts.length === 0) {
    return (
      <nav className={cn("text-sm text-muted-foreground", className)} aria-label="Breadcrumb">
        <span className="font-medium text-foreground">{t("breadcrumbs.executive")}</span>
      </nav>
    );
  }

  const crumbs: { href: string; label: string }[] = [];
  let acc = "";
  for (const part of parts) {
    acc += `/${part}`;
    const key = SEGMENT_KEYS[part];
    crumbs.push({
      href: acc,
      label: key ? t(key) : part,
    });
  }

  return (
    <nav
      className={cn("flex flex-wrap items-center gap-1 text-sm text-muted-foreground", className)}
      aria-label="Breadcrumb"
    >
      <Link href="/" className="hover:text-foreground">
        {t("breadcrumbs.home")}
      </Link>
      {crumbs.map((c, i) => (
        <Fragment key={c.href}>
          <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
          {i === crumbs.length - 1 ? (
            <span className="font-medium text-foreground">{c.label}</span>
          ) : (
            <Link href={c.href} className="hover:text-foreground">
              {c.label}
            </Link>
          )}
        </Fragment>
      ))}
    </nav>
  );
}
