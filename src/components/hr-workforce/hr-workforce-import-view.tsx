"use client";

import { useEffect, useMemo } from "react";
import { useTranslations } from "next-intl";
import { useUnitScope } from "@/hooks/use-unit-scope";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useTenantPersistenceContext } from "@/components/providers/tenant-persistence-context";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InsightBulb } from "@/components/planning/insight-bulb";
import { parseWorkbookFirstSheet, buildTemplateSheetBlob } from "@/lib/hr-workforce/sheet-read";
import {
  guessColumnMap,
  type ImportColumnKey,
  IMPORT_COLUMN_LABELS,
} from "@/lib/hr-workforce/import-parser";
import { bootstrapOperationalWorkspaceFromHr } from "@/lib/platform-economics/bootstrap-operational-workspace";
import { flushHrCatalogSync } from "@/lib/persistence/hr-catalog-dual-write";
import { writeHrCatalogLocalPersistSnapshot } from "@/lib/persistence/hr-catalog-local-persist";
import { getActiveOrganizationId } from "@/lib/persistence/active-tenant";
const COLUMN_KEYS: ImportColumnKey[] = [
  "holding",
  "businessUnit",
  "department",
  "team",
  "roleName",
  "employmentType",
  "employeeCount",
  "monthlySalary",
  "monthlySocialInsurance",
  "annualMedicalInsurance",
  "annualEosCost",
  "riskFactorPct",
  "isBillable",
  "additionalCosts",
];

function ciKey(s: string): string {
  return s.trim().toLowerCase();
}

export function HrWorkforceImportView() {
  const t = useTranslations("hrWorkforce");
  const { organizationName } = useTenantPersistenceContext();
  const { isUnitScoped, hrBusinessUnitId } = useUnitScope();
  const businessUnits = useHrWorkforceStore((s) => s.businessUnits);

  useEffect(() => {
    useHrWorkforceStore.setState({ importSessionTenantOrganizationName: organizationName });
  }, [organizationName]);
  const applyImportDeltas = useHrWorkforceStore((s) => s.applyImportDeltas);
  const pushImportLog = useHrWorkforceStore((s) => s.pushImportLog);
  const importSessionLoadParsed = useHrWorkforceStore((s) => s.importSessionLoadParsed);
  const importSessionSetColumnMapping = useHrWorkforceStore((s) => s.importSessionSetColumnMapping);
  const importSessionRunDryRun = useHrWorkforceStore((s) => s.importSessionRunDryRun);
  const importSessionClearAfterSuccessfulCommit = useHrWorkforceStore(
    (s) => s.importSessionClearAfterSuccessfulCommit
  );
  const importSessionReplaceExisting = useHrWorkforceStore((s) => s.importSessionReplaceExisting);
  const importSessionSetReplaceExisting = useHrWorkforceStore(
    (s) => s.importSessionSetReplaceExisting
  );

  const fileName = useHrWorkforceStore((s) => s.importSessionFileName);
  const headers = useHrWorkforceStore((s) => s.importSessionHeaders);
  const rows = useHrWorkforceStore((s) => s.importSessionRows);
  const columnMap = useHrWorkforceStore((s) => s.importSessionColumnMap);
  const errors = useHrWorkforceStore((s) => s.importSessionErrors);
  const plan = useHrWorkforceStore((s) => s.importSessionPlan);

  const scopedBuName = useMemo(
    () => businessUnits.find((b) => b.id === hrBusinessUnitId)?.name ?? "",
    [businessUnits, hrBusinessUnitId]
  );

  const importBlocksOtherBus = useMemo(() => {
    if (!isUnitScoped || !hrBusinessUnitId || !plan?.ok || !scopedBuName) return false;
    const allowed = ciKey(scopedBuName);
    if (plan.preview.newBusinessUnits > 0) return true;
    for (const bu of plan.deltas.businessUnits) {
      if (ciKey(bu.name) !== allowed) return true;
    }
    const buNames = new Map(businessUnits.map((b) => [b.id, b.name]));
    for (const bu of plan.deltas.businessUnits) buNames.set(bu.id, bu.name);
    for (const role of plan.deltas.roles) {
      const name = buNames.get(role.businessUnitId);
      if (name && ciKey(name) !== allowed) return true;
    }
    return false;
  }, [isUnitScoped, hrBusinessUnitId, plan, scopedBuName, businessUnits]);

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const buf = await f.arrayBuffer();
    const { headers: h, rows: r } = parseWorkbookFirstSheet(buf);
    importSessionLoadParsed({
      fileName: f.name,
      headers: h,
      rows: r,
      columnMap: guessColumnMap(h),
    });
  };

  const runDryRun = () => {
    importSessionRunDryRun();
  };

  const commit = async () => {
    if (!plan?.ok || importBlocksOtherBus) return;
    applyImportDeltas(plan.deltas, { replace: importSessionReplaceExisting });
    const orgId = getActiveOrganizationId();
    if (orgId) {
      writeHrCatalogLocalPersistSnapshot(orgId, new Date().toISOString());
      try {
        await flushHrCatalogSync(orgId, { skipExpectedUpdatedAt: true });
      } catch {
        /* store already updated; persist bar shows sync retry */
      }
      await bootstrapOperationalWorkspaceFromHr(orgId);
    }
    pushImportLog({
      fileName,
      rowCount: plan.deltas.roles.length,
      status: "success",
    });
    importSessionClearAfterSuccessfulCommit();
  };

  const downloadTemplate = () => {
    const blob = buildTemplateSheetBlob();
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "hr-workforce-import-template.xlsx";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-2xl font-semibold tracking-tight">{t("importTitle")}</h1>
        <InsightBulb label={t("bulbImportTitle")} description={t("bulbImportBody")} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">{t("importSubtitle")}</p>

      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardHeader>
          <CardTitle className="text-base text-amber-800 dark:text-amber-200">{t("templateHintTitle")}</CardTitle>
          <CardDescription className="text-amber-900/80 dark:text-amber-100/80">{t("templateHintBody")}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">{t("googleSheetsNote")}</CardContent>
      </Card>

      <div className="flex flex-wrap gap-3">
        <Button type="button" variant="secondary" onClick={downloadTemplate}>
          {t("downloadTemplate")}
        </Button>
        <label className="inline-flex cursor-pointer items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
          <input type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={onFile} />
          {t("upload")}
        </label>
        {fileName && <span className="self-center text-sm text-muted-foreground">{fileName}</span>}
      </div>

      {headers.length > 0 && (
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t("importReplaceTitle")}</CardTitle>
            <CardDescription>{t("importReplaceDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <label className="flex cursor-pointer items-start gap-2 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={importSessionReplaceExisting}
                onChange={(e) => importSessionSetReplaceExisting(e.target.checked)}
              />
              <span>{t("importReplaceLabel")}</span>
            </label>
          </CardContent>
        </Card>
      )}

      {headers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("columnMap")}</CardTitle>
            <CardDescription>{t("columnMapHint")}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {COLUMN_KEYS.map((key) => (
              <div key={key} className="space-y-1">
                <Label className="text-xs">{IMPORT_COLUMN_LABELS[key]}</Label>
                <Select
                  value={columnMap[key] ?? "__unmap__"}
                  onValueChange={(v) =>
                    importSessionSetColumnMapping(key, v === "__unmap__" ? undefined : v)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("notMapped")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__unmap__">{t("notMapped")}</SelectItem>
                    {headers.map((h, idx) => (
                      <SelectItem key={`${key}-${idx}-${h}`} value={h}>
                        {h}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("preview")}</CardTitle>
            <CardDescription>{rows.length} rows</CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="app-data-table min-w-[720px] text-xs">
              <thead>
                <tr>
                  <th className="w-10 text-end tabular-nums">#</th>
                  {headers.slice(0, 10).map((h) => (
                    <th key={h} className="max-w-[140px]">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 12).map((r) => (
                  <tr key={r.rowIndex}>
                    <td className="text-end tabular-nums text-muted-foreground">{r.rowIndex}</td>
                    {headers.slice(0, 10).map((h) => (
                      <td key={h} className="max-w-[140px] truncate">
                        {r.values[h] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" disabled={!rows.length} onClick={runDryRun}>
          {t("dryRun")}
        </Button>
        <Button
          type="button"
          disabled={!plan?.ok || importBlocksOtherBus}
          onClick={() => void commit()}
        >
          {t("importCommit")}
        </Button>
      </div>

      {importBlocksOtherBus ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 text-sm text-destructive">
            {t("importScopedBlocked")}
          </CardContent>
        </Card>
      ) : isUnitScoped && plan?.ok ? (
        <p className="text-xs text-muted-foreground">{t("importScopedUnitNote")}</p>
      ) : null}

      {errors.length > 0 && (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t("rowErrors")}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="max-h-48 list-disc space-y-1 overflow-auto ps-4 text-sm">
              {errors.slice(0, 80).map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {plan?.ok && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="text-base">{t("importPreviewTitle")}</CardTitle>
            <CardDescription>{t("importPreviewDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="text-sm">
            <ul className="list-inside list-disc space-y-1">
              {plan.preview.replaceExisting ? (
                <li>{t("previewReplaceMode")}</li>
              ) : (
                <li>{t("previewAppendMode")}</li>
              )}
              <li>{t("previewNewBU", { n: plan.preview.newBusinessUnits })}</li>
              <li>{t("previewNewDept", { n: plan.preview.newDepartments })}</li>
              <li>{t("previewNewTeam", { n: plan.preview.newTeams })}</li>
              <li>{t("previewRoles", { n: plan.preview.roles })}</li>
              {plan.preview.sampleRole ? (
                <li>
                  {t("previewSampleRole", {
                    name: plan.preview.sampleRole.name,
                    eos: plan.preview.sampleRole.annualEndOfServiceCost,
                    risk: plan.preview.sampleRole.riskFactorPct,
                    extras: plan.preview.sampleRole.additionalCostsCount,
                  })}
                </li>
              ) : null}
            </ul>
            {plan.preview.unmappedCompensationFields.length > 0 ? (
              <p className="mt-3 text-amber-800 dark:text-amber-200">
                {t("previewUnmappedFields", {
                  fields: plan.preview.unmappedCompensationFields.join(", "),
                })}
              </p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
