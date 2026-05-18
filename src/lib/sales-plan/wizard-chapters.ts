/** Sales plan wizard chapters — progressive disclosure without removing steps. */
export type SalesPlanChapterId =
  | "foundation"
  | "revenue"
  | "costs"
  | "targets"
  | "review";

export type SalesPlanChapter = {
  id: SalesPlanChapterId;
  labelKey: string;
  stepFrom: number;
  stepTo: number;
};

export const SALES_PLAN_CHAPTERS: readonly SalesPlanChapter[] = [
  { id: "foundation", labelKey: "salesPlan.chapterFoundation", stepFrom: 1, stepTo: 4 },
  { id: "revenue", labelKey: "salesPlan.chapterRevenue", stepFrom: 5, stepTo: 9 },
  { id: "costs", labelKey: "salesPlan.chapterCosts", stepFrom: 10, stepTo: 12 },
  { id: "targets", labelKey: "salesPlan.chapterTargets", stepFrom: 13, stepTo: 15 },
  { id: "review", labelKey: "salesPlan.chapterReview", stepFrom: 16, stepTo: 18 },
];

export function chapterForStep(step: number): SalesPlanChapter {
  return (
    SALES_PLAN_CHAPTERS.find((c) => step >= c.stepFrom && step <= c.stepTo) ??
    SALES_PLAN_CHAPTERS[0]
  );
}

export function firstStepOfChapter(chapterId: SalesPlanChapterId): number {
  return SALES_PLAN_CHAPTERS.find((c) => c.id === chapterId)?.stepFrom ?? 1;
}
