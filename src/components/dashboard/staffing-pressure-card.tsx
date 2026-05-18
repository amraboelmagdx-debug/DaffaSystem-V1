"use client";

import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { StaffingPressure } from "@/types/operational-feasibility";

type Props = {
  staffing: StaffingPressure | null;
};

export function StaffingPressureCard({ staffing }: Props) {
  const t = useTranslations("planning.feasibility");
  if (!staffing || staffing.impliedFteGap <= 0) return null;

  return (
    <Card className="border-border/60 bg-muted/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{t("staffingPressure")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="text-2xl font-semibold tabular-nums">{staffing.impliedFteGap} FTE</p>
        <p className="text-muted-foreground">
          {t(`hiringLevel.${staffing.hiringPressureLevel}`)}
        </p>
      </CardContent>
    </Card>
  );
}
