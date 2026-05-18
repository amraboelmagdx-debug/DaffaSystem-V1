"use client";

import { QaDebugPanel } from "@/components/dev/qa-debug-panel";
import { isQaInstrumentationEnabled } from "@/lib/persistence/qa-instrumentation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/** Embeds QA tooling in Settings instead of a floating global panel. */
export function QaDebugPanelSettings() {
  if (!isQaInstrumentationEnabled()) return null;

  return (
    <Card className="border-dashed border-amber-500/30">
      <CardHeader>
        <CardTitle className="text-base">Developer QA</CardTitle>
        <CardDescription>
          Persistence truth, session, drift, and error tabs — same tools as the former floating panel.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <QaDebugPanel embedded />
      </CardContent>
    </Card>
  );
}
