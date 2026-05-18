"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { RoleCapacityRow } from "@/types/operational-feasibility";

type Props = {
  roles: RoleCapacityRow[];
};

export function RoleBottleneckList({ roles }: Props) {
  const t = useTranslations("planning.feasibility");
  const bottlenecks = roles.filter((r) => r.isBottleneck).slice(0, 6);
  if (!bottlenecks.length) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {t("roleBottlenecks")}
      </p>
      <ul className="space-y-2">
        {bottlenecks.map((r) => (
          <li
            key={r.roleId}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/60 px-3 py-2 text-sm"
          >
            <span className="font-medium">{r.roleName}</span>
            <Badge variant="outline" className="text-[10px]">
              {r.utilizationPct.toFixed(0)}%
            </Badge>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  r.utilizationBand === "critical"
                    ? "bg-destructive"
                    : r.utilizationBand === "elevated"
                      ? "bg-amber-500"
                      : "bg-primary"
                }`}
                style={{ width: `${Math.min(100, r.utilizationPct)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
