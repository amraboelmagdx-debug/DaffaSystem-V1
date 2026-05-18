"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  purpose?: string;
  defaultOpen?: boolean;
  collapsible?: boolean;
  tier?: "primary" | "secondary" | "diagnostic";
  children: ReactNode;
  className?: string;
};

export function OxSection({
  title,
  purpose,
  defaultOpen = true,
  collapsible = false,
  tier = "primary",
  children,
  className,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  const tierClass =
    tier === "primary"
      ? "border-border/80"
      : tier === "secondary"
        ? "border-border/50 bg-muted/10"
        : "border-dashed border-border/40 bg-muted/5";

  return (
    <section className={cn("rounded-xl border p-4 md:p-6", tierClass, className)}>
      <div className="mb-4 flex items-start justify-between gap-2">
        <div>
          <h2
            className={cn(
              "font-semibold tracking-tight",
              tier === "primary" ? "text-lg" : "text-base"
            )}
          >
            {title}
          </h2>
          {purpose ? (
            <p className="mt-1 text-sm text-muted-foreground">{purpose}</p>
          ) : null}
        </div>
        {collapsible ? (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="rounded-md p-1 text-muted-foreground hover:bg-muted"
            aria-expanded={open}
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>
        ) : null}
      </div>
      {(!collapsible || open) && children}
    </section>
  );
}
