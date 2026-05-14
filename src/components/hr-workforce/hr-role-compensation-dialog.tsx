"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  AdditionalCostType,
  EmploymentType,
  JobRole,
  JobRoleAdditionalCost,
  PercentageCostBasis,
  RecurringType,
} from "@/types/hr-workforce";
import { newHrId } from "@/lib/hr-workforce/id";
import { InsightBulb } from "@/components/planning/insight-bulb";

const EMP_TYPES: EmploymentType[] = ["full_time", "part_time", "contractor", "freelancer"];
const COST_TYPES: AdditionalCostType[] = ["fixed", "variable", "percentage"];
const RECURRING: RecurringType[] = ["monthly", "yearly", "one_time"];
const PCT_BASES: PercentageCostBasis[] = [
  "salary_only",
  "salary_plus_benefits",
  "subtotal_before_risk",
  "loaded_cost",
  "custom",
];

export function HrRoleCompensationDialog({
  open,
  role,
  onOpenChange,
  onSave,
}: {
  open: boolean;
  role: JobRole | null;
  onOpenChange: (open: boolean) => void;
  onSave: (patch: Partial<JobRole>) => void;
}) {
  const t = useTranslations("hrWorkforce");
  const [employmentType, setEmploymentType] = useState<EmploymentType>("full_time");
  const [currency, setCurrency] = useState("SAR");
  const [avgMonthlySalary, setAvgMonthlySalary] = useState(0);
  const [avgMonthlySocialInsurance, setAvgMonthlySocialInsurance] = useState(0);
  const [annualMedicalInsurance, setAnnualMedicalInsurance] = useState(0);
  const [annualEndOfServiceCost, setAnnualEndOfServiceCost] = useState(0);
  const [riskFactorPct, setRiskFactorPct] = useState(0);
  const [additionalCosts, setAdditionalCosts] = useState<JobRoleAdditionalCost[]>([]);

  useEffect(() => {
    if (!open || !role) return;
    setEmploymentType(role.employmentType);
    setCurrency(role.currency || "SAR");
    setAvgMonthlySalary(role.avgMonthlySalary);
    setAvgMonthlySocialInsurance(role.avgMonthlySocialInsurance);
    setAnnualMedicalInsurance(role.annualMedicalInsurance);
    setAnnualEndOfServiceCost(role.annualEndOfServiceCost);
    setRiskFactorPct(role.riskFactorPct);
    setAdditionalCosts(role.additionalCosts.map((c) => ({ ...c })));
  }, [open, role]);

  if (!role) return null;

  const handleSave = () => {
    const normalizedCosts: JobRoleAdditionalCost[] = additionalCosts.map((c) => {
      const id = c.id || newHrId("cost");
      const recurring = (c.recurring ?? "monthly") as RecurringType;
      const amount = Number.isFinite(c.amount) ? c.amount : 0;
      if (c.costType === "percentage") {
        return {
          id,
          costName: c.costName,
          amount,
          costType: "percentage" as const,
          recurring,
          percentageBasis: (c.percentageBasis ?? "salary_plus_benefits") as PercentageCostBasis,
        };
      }
      return {
        id,
        costName: c.costName,
        amount,
        costType: c.costType,
        recurring,
      };
    });
    onSave({
      employmentType,
      currency: currency.slice(0, 3).toUpperCase(),
      avgMonthlySalary,
      avgMonthlySocialInsurance,
      annualMedicalInsurance,
      annualEndOfServiceCost,
      riskFactorPct,
      additionalCosts: normalizedCosts,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <div className="flex flex-wrap items-start justify-between gap-3 pe-6">
            <div className="min-w-0 flex-1 space-y-1">
              <DialogTitle>{t("roleCostDialogTitle")}</DialogTitle>
              <p className="text-sm text-muted-foreground">{t("roleCostDialogIntro")}</p>
              <p className="text-sm font-medium text-foreground">{role.name}</p>
            </div>
            <InsightBulb wide label={t("bulbRoleCostFieldsTitle")} description={t("bulbRoleCostFieldsBody")} />
          </div>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("colType")}</Label>
            <Select value={employmentType} onValueChange={(v) => setEmploymentType(v as EmploymentType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMP_TYPES.map((et) => (
                  <SelectItem key={et} value={et}>
                    {t(`emp_${et}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{t("defaultCurrency")}</Label>
            <Input value={currency} onChange={(e) => setCurrency(e.target.value)} maxLength={3} />
          </div>
          <div className="space-y-1">
            <Label>{t("colSalary")}</Label>
            <Input
              type="number"
              value={avgMonthlySalary}
              onChange={(e) => setAvgMonthlySalary(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("colSI")}</Label>
            <Input
              type="number"
              value={avgMonthlySocialInsurance}
              onChange={(e) => setAvgMonthlySocialInsurance(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("colMedical")}</Label>
            <Input
              type="number"
              value={annualMedicalInsurance}
              onChange={(e) => setAnnualMedicalInsurance(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1">
            <Label>{t("colEos")}</Label>
            <Input
              type="number"
              value={annualEndOfServiceCost}
              onChange={(e) => setAnnualEndOfServiceCost(Number(e.target.value) || 0)}
            />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label>{t("colRisk")}</Label>
            <Input type="number" value={riskFactorPct} onChange={(e) => setRiskFactorPct(Number(e.target.value) || 0)} />
          </div>
        </div>

        <div className="space-y-3 border-t border-border/60 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <Label className="text-base">{t("roleCostAdditionalSection")}</Label>
              <InsightBulb wide label={t("bulbRoleCostExtraTitle")} description={t("bulbRoleCostExtraBody")} />
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() =>
                setAdditionalCosts((prev) => [
                  ...prev,
                  {
                    id: newHrId("cost"),
                    costName: "",
                    amount: 0,
                    costType: "fixed",
                    recurring: "monthly",
                  },
                ])
              }
            >
              {t("addCostRow")}
            </Button>
          </div>
          <div className="space-y-3">
            {additionalCosts.map((c, idx) => (
              <div key={c.id} className="grid gap-2 rounded-md border border-border/50 p-3 sm:grid-cols-12">
                <div className="space-y-1 sm:col-span-4">
                  <Label className="text-xs">{t("costName")}</Label>
                  <Input
                    value={c.costName}
                    onChange={(e) =>
                      setAdditionalCosts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, costName: e.target.value } : x))
                      )
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("costAmount")}</Label>
                  <Input
                    type="number"
                    value={c.amount}
                    onChange={(e) =>
                      setAdditionalCosts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, amount: Number(e.target.value) || 0 } : x))
                      )
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-3">
                  <Label className="text-xs">{t("costTypeLabel")}</Label>
                  <Select
                    value={c.costType}
                    onValueChange={(v) => {
                      const ct = v as AdditionalCostType;
                      setAdditionalCosts((prev) =>
                        prev.map((x, i) => {
                          if (i !== idx) return x;
                          if (ct === "percentage") {
                            return {
                              ...x,
                              costType: ct,
                              percentageBasis: x.percentageBasis ?? "salary_plus_benefits",
                            };
                          }
                          const { percentageBasis: _b, ...rest } = x;
                          return { ...rest, costType: ct };
                        })
                      );
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COST_TYPES.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {t(`costType_${ct}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label className="text-xs">{t("costRecurringLabel")}</Label>
                  <Select
                    value={c.recurring ?? "monthly"}
                    onValueChange={(v) =>
                      setAdditionalCosts((prev) =>
                        prev.map((x, i) => (i === idx ? { ...x, recurring: v as RecurringType } : x))
                      )
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RECURRING.map((r) => (
                        <SelectItem key={r} value={r}>
                          {t(`recurring_${r}`)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end sm:col-span-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => setAdditionalCosts((prev) => prev.filter((_, i) => i !== idx))}
                  >
                    {t("dialogRemoveRow")}
                  </Button>
                </div>
                {c.costType === "percentage" ? (
                  <div className="space-y-1 border-t border-border/40 pt-2 sm:col-span-12">
                    <Label className="text-xs">{t("costPctBasisLabel")}</Label>
                    <Select
                      value={c.percentageBasis ?? "salary_plus_benefits"}
                      onValueChange={(v) =>
                        setAdditionalCosts((prev) =>
                          prev.map((x, i) =>
                            i === idx ? { ...x, percentageBasis: v as PercentageCostBasis } : x
                          )
                        )
                      }
                    >
                      <SelectTrigger className="max-w-md">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PCT_BASES.map((pb) => (
                          <SelectItem key={pb} value={pb}>
                            {t(`pctBasis_${pb}`)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-border/60 pt-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("dialogCancel")}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t("dialogSave")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
