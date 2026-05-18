"use client";

import { useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function OxExpandDiagnostics({
  title,
  children,
  defaultOpen = false,
  className,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const t = useTranslations("ox");
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("rounded-lg border border-dashed border-border/50", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-muted-foreground hover:bg-muted/30"
      >
        <span>{title ?? t("diagnostics.expand")}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open ? <div className="border-t border-border/40 px-4 py-4">{children}</div> : null}
    </div>
  );
}
