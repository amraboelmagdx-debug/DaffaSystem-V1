"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { OperatorModeBadge } from "@/components/ox/operator-mode-badge";
import type { OperatorMode } from "@/lib/ox/operator-mode";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  purpose: string;
  mode: OperatorMode;
  actions?: ReactNode;
  className?: string;
};

export function PagePurposeHeader({
  title,
  purpose,
  mode,
  actions,
  className,
}: Props) {
  const t = useTranslations("ox");
  return (
    <header
      className={cn(
        "flex flex-col gap-3 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between",
        className
      )}
    >
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <OperatorModeBadge mode={mode} />
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">{purpose}</p>
        <p className="text-xs text-muted-foreground/80">{t(`modes.${mode}Desc`)}</p>
      </div>
      {actions ? (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      ) : null}
    </header>
  );
}
