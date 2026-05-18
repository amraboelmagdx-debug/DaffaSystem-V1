"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import type { IncentivePlan } from "@/types/incentives";
import type { DemoCompany } from "@/types/domain";
import type { JobRole } from "@/types/hr-workforce";
import type { ServiceTemplate } from "@/types/service-architecture";
import type { OpportunityTierDefinition } from "@/types/sales-plan";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { validateIncentivePlan } from "@/lib/incentives/validate-plan";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";
import { IncentivePlanEditor } from "@/components/incentives/incentive-plan-editor";
import { DesignTeamHrPanel } from "@/components/incentives/design/design-team-hr-panel";
import { DesignTierProfilesPanel } from "@/components/incentives/design/design-tier-profiles-panel";
import { DesignCommissionsPanel } from "@/components/incentives/design/design-commissions-panel";
import { DesignBdPhasesPanel } from "@/components/incentives/design/design-bd-phases-panel";
import { DesignScorecardPanel } from "@/components/incentives/design/design-scorecard-panel";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const DESIGN_SECTIONS = [
  "team",
  "tiers",
  "commissions",
  "phases",
  "scorecard",
  "governance",
] as const;

type DesignSection = (typeof DESIGN_SECTIONS)[number];

export function IncentiveDesignStudio({
  plan,
  company,
  hrBuId,
  roles,
  products,
  wizardCells,
  serviceTemplates,
  periodFrozen,
  onApprove,
  onArchive,
  onCompanyTiersChange,
}: {
  plan: IncentivePlan;
  company: DemoCompany;
  hrBuId: string;
  roles: JobRole[];
  products: { id: string; name: string; serviceTemplateId?: string | null }[];
  wizardCells: Record<string, { avgDealValueSar: number; exists?: boolean }>;
  serviceTemplates: ServiceTemplate[];
  periodFrozen?: boolean;
  onApprove?: () => void;
  onArchive?: () => void;
  onCompanyTiersChange?: (tiers: OpportunityTierDefinition[]) => void;
}) {
  const t = useTranslations("incentives");
  const savePlan = useIncentivePlanStore((s) => s.savePlan);
  const [draft, setDraft] = useState<IncentivePlan>(plan);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [openSection, setOpenSection] = useState<DesignSection | null>("team");

  useEffect(() => {
    setDraft(plan);
    setDirty(false);
  }, [plan.id, plan.version, plan.revision]);

  const patch = useCallback((p: Partial<IncentivePlan>) => {
    setDraft((d) => ({ ...d, ...p, revision: d.revision }));
    setDirty(true);
  }, []);

  const handleSave = async () => {
    const errors = validateIncentivePlan(draft);
    if (errors.length) return;
    setSaving(true);
    const next = {
      ...draft,
      version: draft.version + 1,
      revision: draft.revision + 1,
    };
    const ok = await savePlan(next);
    setSaving(false);
    if (ok) setDirty(false);
  };

  const validationErrors = validateIncentivePlan(draft);

  const sectionLabel = (id: DesignSection) => {
    switch (id) {
      case "team":
        return t("designTabTeam");
      case "tiers":
        return t("designTabTiers");
      case "commissions":
        return t("designTabCommissions");
      case "phases":
        return t("designTabPhases");
      case "scorecard":
        return t("designTabScorecard");
      case "governance":
        return t("tabGovernance");
    }
  };

  const renderSection = (id: DesignSection) => {
    switch (id) {
      case "team":
        return <DesignTeamHrPanel plan={draft} roles={roles} hrBuId={hrBuId} onChange={patch} />;
      case "tiers":
        return (
          <DesignTierProfilesPanel
            plan={draft}
            company={company}
            products={products}
            wizardCells={wizardCells}
            serviceTemplates={serviceTemplates}
            onChange={patch}
            onCompanyTiersChange={onCompanyTiersChange}
          />
        );
      case "commissions":
        return <DesignCommissionsPanel plan={draft} onChange={patch} />;
      case "phases":
        return <DesignBdPhasesPanel plan={draft} onChange={patch} />;
      case "scorecard":
        return <DesignScorecardPanel plan={draft} onChange={patch} />;
      case "governance":
        return (
          <IncentivePlanEditor
            plan={draft}
            periodFrozen={periodFrozen}
            onApprove={onApprove}
            onArchive={onArchive}
          />
        );
    }
  };

  return (
    <Card className="border-border/60 bg-card/60 backdrop-blur">
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 pb-2">
        <CardTitle className="text-base">{t("designStudioTitle")}</CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            onClick={() => void handleSave()}
            disabled={saving || !dirty || validationErrors.length > 0 || periodFrozen}
          >
            {saving ? t("saving") : t("savePlan")}
          </Button>
          {dirty ? <Badge variant="secondary">{t("unsavedChanges")}</Badge> : null}
          {validationErrors.length ? (
            <span className="text-xs text-destructive">{validationErrors[0]}</span>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {DESIGN_SECTIONS.map((id) => {
          const isOpen = openSection === id;
          return (
            <div
              key={id}
              className="rounded-lg border border-border/50 overflow-hidden"
            >
              <button
                type="button"
                className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-start text-sm font-medium hover:bg-muted/40"
                onClick={() => setOpenSection(isOpen ? null : id)}
                aria-expanded={isOpen}
              >
                {sectionLabel(id)}
                <ChevronDown
                  className={cn(
                    "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              {isOpen ? <div className="border-t border-border/50 p-3">{renderSection(id)}</div> : null}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
