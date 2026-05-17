"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale } from "next-intl";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { mergeOpportunityTiersWithDefaults } from "@/data/opportunity-tiers-defaults";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OperationalWorkspaceGate } from "@/components/operational-workspace/operational-workspace-gate";
import { SampleDataPanel } from "@/components/sample-data/sample-data-panel";
import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";
import { isOrphanOperationalUnit } from "@/lib/platform-economics/operational-unit";
import { streamsForCompany, useWorkspaceStore } from "@/stores/use-workspace-store";
import { formatCurrency, formatPct } from "@/lib/calculations/engine";
import type { OpportunityTierDefinition } from "@/types/sales-plan";

const schema = z.object({
  fixedCostsMonthly: z.coerce.number().min(0),
  revenueMonthly: z.coerce.number().min(0),
  growthTargetPct: z.coerce.number().min(-0.5).max(2),
  marginTargetPct: z.coerce.number().min(0).max(1),
  npTargetPct: z.coerce.number().min(0).max(0.99),
  contributionMarginPct: z.coerce.number().min(0.05).max(0.99),
});

type FormValues = z.infer<typeof schema>;

export default function CompaniesPage() {
  const locale = useLocale();
  const { linkedUnits, orphanUnits, selectedUnit, setCompany, isReady } =
    useOperationalWorkspace();
  const updateCompany = useWorkspaceStore((s) => s.updateCompany);
  const company = selectedUnit;
  const streams = company ? streamsForCompany(company.id) : [];

  const [tierBands, setTierBands] = useState<OpportunityTierDefinition[]>(() =>
    mergeOpportunityTiersWithDefaults(company?.opportunityTiers)
  );

  useEffect(() => {
    if (!company) return;
    setTierBands(mergeOpportunityTiersWithDefaults(company.opportunityTiers));
  }, [company?.id, company?.opportunityTiers]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: company
      ? {
          fixedCostsMonthly: company.fixedCostsMonthly,
          revenueMonthly: company.revenueMonthly,
          growthTargetPct: company.growthTargetPct,
          marginTargetPct: company.marginTargetPct,
          npTargetPct: company.npTargetPct,
          contributionMarginPct: company.contributionMarginPct,
        }
      : {
          fixedCostsMonthly: 0,
          revenueMonthly: 0,
          growthTargetPct: 0,
          marginTargetPct: 0,
          npTargetPct: 0,
          contributionMarginPct: 0.38,
        },
  });

  const onSubmit = form.handleSubmit((data) => {
    if (!company) return;
    updateCompany(company.id, data);
  });

  if (!isReady) {
    return <OperationalWorkspaceGate>{null}</OperationalWorkspaceGate>;
  }

  if (!company) {
    return (
      <OperationalWorkspaceGate>
      <div className="mx-auto max-w-2xl space-y-4">
        <SampleDataPanel moduleId="workspace" />
        <p className="text-center text-sm text-muted-foreground">
          No HR-linked business units in the workspace yet. Add units in HR Workforce and refresh.
        </p>
      </div>
      </OperationalWorkspaceGate>
    );
  }

  return (
    <OperationalWorkspaceGate>
    <div className="mx-auto max-w-5xl space-y-8">
      <SampleDataPanel moduleId="workspace" />
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Company management</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Targets, fixed cost base, and blended contribution for the active business unit
          (HR-synced planning projection).
        </p>
      </div>

      {orphanUnits.length > 0 && (
        <p className="rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-muted-foreground">
          {orphanUnits.length} workspace unit(s) are not linked to HR — sync from HR → Organization
          or archive them. New Sales Plan saves require a linked unit.
          {company && isOrphanOperationalUnit(company) ? " The selected unit is orphaned." : ""}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {linkedUnits.map((c) => (
          <Button
            key={c.id}
            variant={c.id === company.id ? "default" : "outline"}
            size="sm"
            onClick={() => setCompany(c.id)}
          >
            {c.name}
          </Button>
        ))}
      </div>

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">{company.name}</CardTitle>
          <div className="flex flex-wrap gap-2 pt-2">
            {company.marketSegments.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          <form className="grid gap-6 md:grid-cols-2" onSubmit={onSubmit}>
            <div className="space-y-2">
              <Label htmlFor="revenueMonthly">Monthly revenue (plan)</Label>
              <Input id="revenueMonthly" type="number" {...form.register("revenueMonthly")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="fixedCostsMonthly">Fixed costs (monthly)</Label>
              <Input id="fixedCostsMonthly" type="number" {...form.register("fixedCostsMonthly")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contributionMarginPct">Contribution margin (0–1)</Label>
              <Input
                id="contributionMarginPct"
                type="number"
                step="0.01"
                {...form.register("contributionMarginPct")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="npTargetPct">NP target (0–1)</Label>
              <Input id="npTargetPct" type="number" step="0.01" {...form.register("npTargetPct")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="growthTargetPct">Growth target (YoY)</Label>
              <Input id="growthTargetPct" type="number" step="0.01" {...form.register("growthTargetPct")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="marginTargetPct">Gross margin target</Label>
              <Input id="marginTargetPct" type="number" step="0.01" {...form.register("marginTargetPct")} />
            </div>
            <div className="md:col-span-2 flex gap-3">
              <Button type="submit">Save company targets</Button>
              <p className="text-xs text-muted-foreground self-center">
                Live preview on dashboard uses these values instantly.
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/50 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Opportunity tier SAR bands (per company)</CardTitle>
          <p className="text-xs text-muted-foreground">
            Tiny / Standard / Big / Mega value ranges used by Sales Plan OS for labels and default deal
            hints. Saved per company; open{" "}
            <Link href={`/${locale}/sales-plan`} className="font-medium text-primary underline">
              Sales Plan OS
            </Link>{" "}
            to use them in the wizard (or use “Apply to workspace” there to sync back).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {tierBands.map((tier) => (
              <div key={tier.key} className="rounded-lg border border-border/60 bg-muted/10 p-3">
                <p className="text-sm font-semibold capitalize">{tier.key}</p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Min SAR</Label>
                    <Input
                      className="mt-1 h-9"
                      type="number"
                      min={0}
                      value={Number(tier.minValueSar ?? 0)}
                      onChange={(e) => {
                        const min = Math.max(0, Number(e.target.value) || 0);
                        setTierBands((rows) =>
                          rows.map((r) =>
                            r.key === tier.key ? { ...r, minValueSar: min } : r
                          )
                        );
                      }}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Max SAR</Label>
                    <Input
                      className="mt-1 h-9"
                      type="number"
                      min={0}
                      value={tier.maxValueSar == null ? "" : Number(tier.maxValueSar)}
                      placeholder={tier.key === "mega" ? "Unbounded if empty" : undefined}
                      onChange={(e) => {
                        const raw = e.target.value;
                        setTierBands((rows) =>
                          rows.map((r) => {
                            if (r.key !== tier.key) return r;
                            if (tier.key === "mega" && raw === "") {
                              return { ...r, maxValueSar: null };
                            }
                            const n = Math.max(0, Number(raw) || 0);
                            const lo = Number(r.minValueSar ?? 0);
                            return { ...r, maxValueSar: Math.max(lo, n) };
                          })
                        );
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button
            type="button"
            onClick={() =>
              updateCompany(company.id, {
                opportunityTiers: mergeOpportunityTiersWithDefaults(tierBands).map((t) => ({
                  ...t,
                })),
              })
            }
          >
            Save tier bands for {company.name}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Revenue streams</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table">
            <thead>
              <tr>
                <th>Stream</th>
                <th className="text-end tabular-nums">CM%</th>
                <th className="text-end tabular-nums">Weight</th>
                <th className="text-end tabular-nums">Avg deal</th>
                <th className="text-end tabular-nums">Conv %</th>
              </tr>
            </thead>
            <tbody>
              {streams.map((s) => (
                <tr key={s.id}>
                  <td className="font-medium">{s.name}</td>
                  <td className="text-end tabular-nums">{formatPct(s.contributionMarginPct)}</td>
                  <td className="text-end tabular-nums">{formatPct(s.revenueWeight)}</td>
                  <td className="text-end tabular-nums">{formatCurrency(s.avgDealSize)}</td>
                  <td className="text-end tabular-nums">{formatPct(s.conversionRatePct)}</td>
                </tr>
              ))}
              {!streams.length && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted-foreground">
                    No streams configured — dashboard uses company-level contribution margin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
    </OperationalWorkspaceGate>
  );
}
