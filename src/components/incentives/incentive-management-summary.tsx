"use client";

import { formatCurrency } from "@/lib/calculations/engine";
import { OxExplainMetric } from "@/components/ox/ox-explain-metric";
import { MEASURE_ID } from "@/lib/planning/measures/measure-ids";
import { Card, CardContent } from "@/components/ui/card";

export function IncentiveManagementSummary({
  companyTotalSar,
  retainedSar,
  participantCount,
  warningCount,
  planVersion,
  periodYear,
}: {
  companyTotalSar: number;
  retainedSar: number;
  participantCount: number;
  warningCount: number;
  planVersion: number;
  periodYear: number;
}) {
  const fmt = (n: number) => formatCurrency(n, "SAR");

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">Incentive pool</p>
            <OxExplainMetric measureId={MEASURE_ID.INCENTIVE_POOL_COMPANY_TOTAL} />
          </div>
          <p className="text-2xl font-semibold">{fmt(companyTotalSar)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-xs text-muted-foreground">Company retained</p>
            <OxExplainMetric measureId={MEASURE_ID.INCENTIVE_POOL_RETAINED} />
          </div>
          <p className="text-2xl font-semibold">{fmt(retainedSar)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Participants</p>
          <p className="text-2xl font-semibold">{participantCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Warnings</p>
          <p className="text-2xl font-semibold">{warningCount}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-4">
          <p className="text-xs text-muted-foreground">Plan · period</p>
          <p className="text-2xl font-semibold">
            v{planVersion} · {periodYear}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
