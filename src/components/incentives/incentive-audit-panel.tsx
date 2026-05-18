"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { IncentiveOverrideAuditEntry } from "@/types/incentives";

export function IncentiveAuditPanel({ planId }: { planId: string }) {
  const t = useTranslations("incentives");
  const [entries, setEntries] = useState<IncentiveOverrideAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    void fetch(`/api/incentives/audit?planId=${encodeURIComponent(planId)}`, {
      credentials: "include",
    })
      .then(async (res) => {
        if (!res.ok) {
          setError(`Audit load failed (${res.status})`);
          setEntries([]);
          return;
        }
        const data = (await res.json()) as { entries: IncentiveOverrideAuditEntry[] };
        setEntries(data.entries ?? []);
      })
      .catch(() => setError("Audit load failed (offline)"))
      .finally(() => setLoading(false));
  }, [planId]);

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="text-base">{t("auditTitle")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {loading ? (
          <p className="text-muted-foreground">{t("auditLoading")}</p>
        ) : error ? (
          <p className="text-destructive">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-muted-foreground">{t("auditEmpty")}</p>
        ) : (
          <ul className="max-h-48 space-y-2 overflow-y-auto">
            {entries.map((e) => (
              <li key={e.id} className="rounded-md border border-border/50 px-2 py-1.5">
                <p className="font-mono text-[10px] text-muted-foreground">{e.createdAt}</p>
                <p>
                  {e.layerId} · {e.jobRoleId}
                </p>
                <p className="text-xs text-muted-foreground">
                  {String(e.oldValue)} → {String(e.newValue)}
                  {e.reason ? ` · ${e.reason}` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
