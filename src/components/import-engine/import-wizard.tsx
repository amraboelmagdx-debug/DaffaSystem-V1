"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Download, FileSpreadsheet, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Stepper, type StepperItem, type StepperStatus } from "@/components/ui/stepper";
import { FileDropzone } from "./file-dropzone";
import { DependencyChecklist } from "./dependency-checklist";
import { ValidationSummary } from "./validation-summary";
import { IssueTable } from "./issue-table";
import { CommitDialog } from "./commit-dialog";
import {
  buildTemplateBlob,
  downloadBlob,
  parseWorkbook,
  type CommitResult,
  type DependencyCheck,
  type ImportAdapter,
  type ImportPlanResult,
  type ParsedWorkbook,
} from "@/lib/import-engine";

type WizardStep = "download" | "upload" | "validate" | "preview" | "result";

interface ImportWizardProps<TSnapshot, TDeltas> {
  adapter: ImportAdapter<TSnapshot, TDeltas>;
  organizationId: string | null;
  organizationName: string | null;
}

export function ImportWizard<TSnapshot, TDeltas>({
  adapter,
  organizationId,
  organizationName,
}: ImportWizardProps<TSnapshot, TDeltas>) {
  const t = useTranslations("importEngine");
  const [step, setStep] = React.useState<WizardStep>("download");
  const [file, setFile] = React.useState<File | null>(null);
  const [workbook, setWorkbook] = React.useState<ParsedWorkbook | null>(null);
  const [plan, setPlan] = React.useState<ImportPlanResult<TDeltas> | null>(null);
  const [parseError, setParseError] = React.useState<string | null>(null);
  const [commitOpen, setCommitOpen] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [commitResult, setCommitResult] = React.useState<CommitResult | null>(null);

  const snapshot = adapter.loadSnapshot();
  const dependencies: DependencyCheck[] = adapter.checkDependencies();
  const dependencyBlocking = dependencies.some((d) => d.status === "missing");

  const onDownload = (mode: "blank" | "export") => {
    const spec = adapter.buildTemplate(snapshot, mode);
    const blob = buildTemplateBlob(spec);
    downloadBlob(blob, spec.fileName);
  };

  const onPickFile = async (f: File) => {
    setFile(f);
    setParseError(null);
    try {
      const buf = await f.arrayBuffer();
      const parsed = parseWorkbook(buf);
      setWorkbook(parsed);
      const result = adapter.planUpload(parsed, snapshot, {
        organizationId,
        organizationName,
        snapshot,
      });
      setPlan(result);
      setStep("validate");
    } catch (err) {
      setParseError(err instanceof Error ? err.message : String(err));
    }
  };

  const reset = () => {
    setFile(null);
    setWorkbook(null);
    setPlan(null);
    setParseError(null);
    setCommitResult(null);
    setStep("download");
  };

  const errors = plan?.issues.filter((i) => i.level === "error") ?? [];
  const canCommit = Boolean(plan?.deltas) && errors.length === 0;

  const onCommit = async () => {
    if (!plan?.deltas) return;
    setCommitting(true);
    try {
      const result = await adapter.commit(plan.deltas, {
        organizationId,
        organizationName,
        snapshot,
      });
      setCommitResult(result);
      setStep("result");
    } catch (err) {
      setCommitResult({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
      setStep("result");
    } finally {
      setCommitOpen(false);
      setCommitting(false);
    }
  };

  const stepDefs: { id: WizardStep; label: string }[] = [
    { id: "download", label: t("steps.download") },
    { id: "upload", label: t("steps.upload") },
    { id: "validate", label: t("steps.validate") },
    { id: "preview", label: t("steps.preview") },
    { id: "result", label: t("steps.result") },
  ];
  const stepperItems: StepperItem[] = stepDefs.map((it) => ({
    ...it,
    status: deriveStatus(it.id, step, commitResult),
  }));

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{adapter.label}</h1>
        <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Stepper items={stepperItems} activeId={step} />

      {step === "download" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("download.title")}</CardTitle>
            <CardDescription>{t("download.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <DependencyChecklist checks={dependencies} />
            {dependencyBlocking ? (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <p>{t("download.blocked")}</p>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                onClick={() => onDownload("blank")}
                disabled={dependencyBlocking}
              >
                <Download className="h-4 w-4" />
                {t("download.blank")}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => onDownload("export")}
                disabled={dependencyBlocking}
              >
                <FileSpreadsheet className="h-4 w-4" />
                {t("download.withCurrent")}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setStep("upload")}
                disabled={dependencyBlocking}
              >
                {t("download.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "upload" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("upload.title")}</CardTitle>
            <CardDescription>{t("upload.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <FileDropzone onFile={onPickFile} />
            {file ? (
              <p className="text-xs text-muted-foreground">
                {t("upload.selected", { name: file.name })}
              </p>
            ) : null}
            {parseError ? (
              <p className="text-sm text-destructive">{parseError}</p>
            ) : null}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("download")}
              >
                {t("common.back")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === "validate" && plan && workbook ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("validate.title")}</CardTitle>
            <CardDescription>
              {t("validate.descriptionFile", { name: file?.name ?? "—" })}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ValidationSummary
              issues={plan.issues}
              changeSummary={plan.changeSummary}
            />
            <IssueTable issues={plan.issues} />
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" onClick={reset}>
                {t("common.restart")}
              </Button>
              <Button
                type="button"
                onClick={() => setStep("preview")}
                disabled={!canCommit}
              >
                {t("validate.next")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "preview" && plan ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("preview.title")}</CardTitle>
            <CardDescription>{t("preview.description")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ValidationSummary issues={plan.issues} changeSummary={plan.changeSummary} />
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("validate")}
              >
                {t("common.back")}
              </Button>
              <Button
                type="button"
                onClick={() => setCommitOpen(true)}
                disabled={!canCommit}
              >
                {t("preview.commit")}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {step === "result" && commitResult ? (
        <Card
          className={
            commitResult.ok
              ? "border-emerald-500/40 bg-emerald-500/5"
              : "border-destructive/40 bg-destructive/5"
          }
        >
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              {commitResult.ok ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <AlertCircle className="h-4 w-4 text-destructive" />
              )}
              {commitResult.ok ? t("result.success") : t("result.failure")}
            </CardTitle>
            <CardDescription>
              {commitResult.error ?? t("result.summary")}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {commitResult.appliedSummary?.length ? (
              <ul className="space-y-1 text-xs">
                {commitResult.appliedSummary.map((r) => (
                  <li key={r.entity} className="flex justify-between">
                    <span>{r.entity}</span>
                    <span className="tabular-nums text-muted-foreground">
                      +{r.inserts} / ~{r.updates}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <Button type="button" onClick={reset}>
              {t("result.again")}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <CommitDialog
        open={commitOpen}
        onOpenChange={setCommitOpen}
        onConfirm={() => void onCommit()}
        title={t("commitDialog.title")}
        description={t("commitDialog.description")}
        confirmLabel={t("commitDialog.confirm")}
        cancelLabel={t("common.cancel")}
        changeSummary={plan?.changeSummary}
        busy={committing}
      />
    </div>
  );
}

function deriveStatus(
  id: WizardStep,
  current: WizardStep,
  commitResult: CommitResult | null
): StepperStatus {
  const order: WizardStep[] = ["download", "upload", "validate", "preview", "result"];
  const idx = order.indexOf(id);
  const cur = order.indexOf(current);
  if (id === current) return "current";
  if (idx < cur) return "complete";
  if (id === "result" && commitResult && !commitResult.ok) return "error";
  return "pending";
}
