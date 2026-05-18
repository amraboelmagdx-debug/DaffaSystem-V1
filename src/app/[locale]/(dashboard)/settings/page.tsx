"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { dealSizeTiers } from "@/data/demo-seed";
import { formatCurrency, formatPct } from "@/lib/calculations/engine";
import { Badge } from "@/components/ui/badge";
import { PlatformSampleDataControls } from "@/components/sample-data/platform-sample-data-controls";
import { QaDebugPanelSettings } from "@/components/dev/qa-debug-panel-settings";
import { PersistenceDataHealthCard } from "@/components/settings/persistence-data-health-card";
import { isSampleDataUxEnabled } from "@/lib/ox/sample-data-access";

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Workspace settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Deal taxonomy, environment configuration, and security toggles. Supabase URL
          and anon key enable live data; leave unset for deterministic demo mode.
        </p>
      </div>

      <PersistenceDataHealthCard />
      {isSampleDataUxEnabled() ? <PlatformSampleDataControls /> : null}
      <QaDebugPanelSettings />

      <Card className="border-border/60 bg-card/60 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Deal size classification</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="app-data-table">
            <thead>
              <tr>
                <th>Level</th>
                <th>Range</th>
                <th className="text-end tabular-nums">Avg deal</th>
                <th className="text-end tabular-nums">Margin</th>
                <th className="text-end tabular-nums">Win prob</th>
              </tr>
            </thead>
            <tbody>
              {dealSizeTiers.map((t) => (
                <tr key={t.key}>
                  <td className="font-medium">
                    {t.label}
                    <Badge variant="outline" className="ms-2 text-[10px]">
                      {t.key}
                    </Badge>
                  </td>
                  <td>
                    {formatCurrency(t.min)} –{" "}
                    {t.max ? formatCurrency(t.max) : "∞"}
                  </td>
                  <td className="text-end tabular-nums">{formatCurrency(t.avg)}</td>
                  <td className="text-end tabular-nums">{formatPct(t.margin)}</td>
                  <td className="text-end tabular-nums">{formatPct(t.prob)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/40 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 font-mono text-xs text-muted-foreground">
          <p>NEXT_PUBLIC_SUPABASE_URL — Supabase project URL</p>
          <p>NEXT_PUBLIC_SUPABASE_ANON_KEY — public anon key</p>
          <p>NEXT_PUBLIC_REQUIRE_AUTH=true — enforce login (optional)</p>
        </CardContent>
      </Card>
    </div>
  );
}
