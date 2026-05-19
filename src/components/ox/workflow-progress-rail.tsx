"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { WORKFLOW_STEPS } from "@/lib/ox/workflow-steps";
import { useWorkflowProgress } from "@/hooks/use-workflow-progress";
import { useUnitRouteContext } from "@/hooks/use-unit-route-context";
import { cn } from "@/lib/utils";

export function WorkflowProgressRail({ compact }: { compact?: boolean }) {
  const t = useTranslations("ox");
  const { stepStatus } = useWorkflowProgress();
  const { buildHref } = useUnitRouteContext();

  if (compact) {
    const completedCount = WORKFLOW_STEPS.filter((s) => stepStatus(s.id) === "complete").length;
    return (
      <p className="text-xs text-muted-foreground">
        {t("workflow.progress", { done: completedCount, total: WORKFLOW_STEPS.length })}
      </p>
    );
  }

  return (
    <nav
      aria-label={t("workflow.railLabel")}
      className="flex gap-1 overflow-x-auto pb-1 scrollbar-thin"
    >
      {WORKFLOW_STEPS.map((step, i) => {
        const status = stepStatus(step.id);
        return (
          <Link
            key={step.id}
            href={buildHref(step.href)}
            className={cn(
              "flex min-w-[4.5rem] flex-col items-center gap-1 rounded-lg px-2 py-1.5 text-center transition-colors",
              status === "complete" && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              status === "current" && "bg-primary/10 text-foreground ring-1 ring-primary/30",
              status === "upcoming" && "text-muted-foreground hover:bg-muted/50"
            )}
          >
            <span
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold",
                status === "complete" && "bg-emerald-600 text-white",
                status === "current" && "bg-primary text-primary-foreground",
                status === "upcoming" && "bg-muted text-muted-foreground"
              )}
            >
              {status === "complete" ? "✓" : i + 1}
            </span>
            <span className="line-clamp-2 text-[10px] font-medium leading-tight">
              {t(step.labelKey)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
