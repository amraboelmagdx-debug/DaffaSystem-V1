import type {
  CommitResult,
  DependencyCheck,
  ImportAdapter,
  ImportChangeSummaryRow,
  ImportIssue,
  ImportPlanResult,
  ParsedSheet,
  ParsedWorkbook,
  TemplateSpec,
} from "@/lib/import-engine/types";
import { ciKey, num, bool } from "@/lib/import-engine/normalize";
import { findSheet } from "@/lib/import-engine/workbook";
import { buildRefSheet } from "@/lib/import-engine/reference-builder";
import { issue } from "@/lib/import-engine/dry-run";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useIncentivePlanStore } from "@/stores/use-incentive-plan-store";
import type {
  IncentiveLayer,
  IncentivePlan,
  LayerAllocationPolicy,
  PayoutFreeze,
} from "@/types/incentives";

interface InSnapshot {
  hrBusinessUnits: { id: string; name: string }[];
  activePlan: IncentivePlan | null;
  plans: IncentivePlan[];
  freezes: PayoutFreeze[];
}

interface InDeltas {
  /** Plan-level fields to merge with the active plan. */
  planPatch?: Partial<IncentivePlan>;
  /** Full layer set (replaces existing layers when present). */
  layers?: IncentiveLayer[];
}

const SHEET_NAMES = {
  planHeader: "Plan Header",
  layers: "Layers",
};

function loadSnapshot(): InSnapshot {
  const hr = useHrWorkforceStore.getState();
  const inc = useIncentivePlanStore.getState();
  return {
    hrBusinessUnits: hr.businessUnits.map((u) => ({ id: u.id, name: u.name })),
    activePlan: inc.getActivePlan(),
    plans: inc.plans,
    freezes: inc.freezes,
  };
}

function checkDependencies(): DependencyCheck[] {
  const hr = useHrWorkforceStore.getState();
  const inc = useIncentivePlanStore.getState();
  return [
    {
      moduleId: "hr-business-units",
      label: "HR Business Units",
      status: hr.businessUnits.length > 0 ? "satisfied" : "missing",
      detail:
        hr.businessUnits.length > 0
          ? `${hr.businessUnits.length} business unit(s) available.`
          : "Incentive plans are scoped per HR Business Unit — set one up first.",
    },
    {
      moduleId: "active-plan",
      label: "Active incentive plan",
      status: inc.getActivePlan() ? "satisfied" : "partial",
      detail: inc.getActivePlan()
        ? `Editing plan "${inc.getActivePlan()?.name ?? ""}".`
        : "Open the Sales Incentives module to load or create a plan before importing.",
    },
  ];
}

const PLAN_COLS: { key: string; label: string; required?: boolean; example?: string | number }[] = [
  { key: "name", label: "Plan name", example: "FY26 Plan" },
  { key: "currency", label: "Currency", example: "SAR" },
  { key: "effectiveFrom", label: "Effective from (ISO date)", example: "2026-01-01" },
  { key: "effectiveTo", label: "Effective to (ISO date)" },
  { key: "reservePct", label: "Reserve % of pool", example: 5 },
  { key: "stackingPolicy", label: "Stacking policy", example: "best" },
];

const LAYER_COLS: { key: string; label: string; required?: boolean; example?: string | number }[] = [
  { key: "key", label: "Layer key", required: true, example: "closer" },
  { key: "label", label: "Display label", required: true, example: "Closer" },
  { key: "sortOrder", label: "Sort order", required: true, example: 1 },
  { key: "defaultSplitPct", label: "Default split %", required: true, example: 30 },
  {
    key: "allocationPolicy",
    label: "Allocation policy",
    required: true,
    example: "equal",
  },
];

function buildTemplate(snapshot: InSnapshot, mode: "blank" | "export"): TemplateSpec {
  const planRows = mode === "export" && snapshot.activePlan
    ? [
        {
          name: snapshot.activePlan.name,
          currency: snapshot.activePlan.currency,
          effectiveFrom: snapshot.activePlan.effectiveFrom,
          effectiveTo: snapshot.activePlan.effectiveTo ?? "",
          reservePct: snapshot.activePlan.reservePct,
          stackingPolicy: snapshot.activePlan.stackingPolicy,
        },
      ]
    : undefined;

  const layerRows = mode === "export" && snapshot.activePlan
    ? snapshot.activePlan.layers.map((l) => ({
        key: l.key,
        label: l.label,
        sortOrder: l.sortOrder,
        defaultSplitPct: l.defaultSplitPct,
        allocationPolicy: l.allocationPolicy,
      }))
    : undefined;

  return {
    fileName: "incentives-import-template.xlsx",
    instructions: {
      title: "Incentives — import template",
      lines: [
        "This template targets the currently active incentive plan in the Sales Incentives module.",
        "Plan Header is a single-row sheet — fill only the cells you want to change.",
        "Layers fully replaces the layer set of the active plan. Make sure splits + reserve don't exceed 100%.",
        "Frozen payout periods will be preserved — see the Freezes reference sheet.",
      ],
    },
    referenceSheets: [
      buildRefSheet(
        "HR Business Units",
        snapshot.hrBusinessUnits.map((u) => ({ id: u.id, name: u.name }))
      ),
      buildRefSheet(
        "Existing Plans",
        snapshot.plans.map((p) => ({
          id: p.id,
          name: p.name,
          status: p.status,
          currency: p.currency,
        }))
      ),
      buildRefSheet(
        "Freezes (read-only)",
        snapshot.freezes.map((f) => ({
          businessUnit: f.hrBusinessUnitId,
          period: f.periodKey,
          reason: f.reason,
          frozenAt: f.frozenAt,
        }))
      ),
    ],
    sheets: [
      {
        name: SHEET_NAMES.planHeader,
        columns: PLAN_COLS,
        rows: planRows,
      },
      {
        name: SHEET_NAMES.layers,
        columns: LAYER_COLS,
        rows: layerRows,
      },
    ],
    validationNotes: [
      "Errors block the import.",
      "Layer splits + reserve % should not exceed 100%.",
      "Frozen periods cannot be edited — incoming changes that would mutate a frozen period are blocked.",
    ],
  };
}

function getCell(row: ParsedSheet["rows"][number], label: string): string {
  for (const [k, v] of Object.entries(row.values)) {
    if (ciKey(k.replace("*", "").trim()) === ciKey(label)) return (v ?? "").toString().trim();
  }
  return "";
}

const ALLOWED_ALLOC_POLICIES: LayerAllocationPolicy[] = [
  "equal",
  "by_headcount",
  "by_salary_weight",
  "manual_weights",
];

function planUpload(workbook: ParsedWorkbook, snapshot: InSnapshot): ImportPlanResult<InDeltas> {
  const issues: ImportIssue[] = [];
  const deltas: InDeltas = {};
  const counts = {
    plan: 0,
    layers: { inserts: 0, updates: 0 },
  };

  if (!snapshot.activePlan) {
    issues.push(
      issue("error", "No active incentive plan loaded — open Sales Incentives, pick a BU, then come back.", {
        code: "no_active_plan",
      })
    );
    return {
      ok: false,
      issues,
      changeSummary: [],
    };
  }

  const planSheet = findSheet(workbook, SHEET_NAMES.planHeader);
  if (planSheet && planSheet.rows.length > 0) {
    const row = planSheet.rows[0];
    const patch: Partial<IncentivePlan> = {};
    const name = getCell(row, "Plan name");
    if (name) patch.name = name;
    const currency = getCell(row, "Currency");
    if (currency) patch.currency = currency;
    const effFrom = getCell(row, "Effective from (ISO date)");
    if (effFrom) patch.effectiveFrom = effFrom;
    const effTo = getCell(row, "Effective to (ISO date)");
    if (effTo) patch.effectiveTo = effTo;
    const reservePctRaw = getCell(row, "Reserve % of pool");
    if (reservePctRaw) patch.reservePct = num(reservePctRaw, snapshot.activePlan.reservePct);
    const stacking = getCell(row, "Stacking policy");
    if (stacking) patch.stackingPolicy = stacking as IncentivePlan["stackingPolicy"];
    if (Object.keys(patch).length > 0) {
      deltas.planPatch = patch;
      counts.plan = 1;
    }
  }

  const layersSheet = findSheet(workbook, SHEET_NAMES.layers);
  if (layersSheet && layersSheet.rows.length > 0) {
    const layers: IncentiveLayer[] = [];
    let runningSplit = 0;
    const existingByKey = new Map(snapshot.activePlan.layers.map((l) => [l.key, l]));
    for (const row of layersSheet.rows) {
      const key = getCell(row, "Layer key");
      const label = getCell(row, "Display label");
      if (!key || !label) {
        issues.push(
          issue("error", "Layer row requires key and label.", {
            sheet: layersSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const policyRaw = getCell(row, "Allocation policy").toLowerCase() as LayerAllocationPolicy;
      if (!ALLOWED_ALLOC_POLICIES.includes(policyRaw)) {
        issues.push(
          issue(
            "error",
            `Unknown allocation policy "${policyRaw}". Use one of: ${ALLOWED_ALLOC_POLICIES.join(", ")}`,
            { sheet: layersSheet.name, rowIndex: row.rowIndex }
          )
        );
        continue;
      }
      const splitPct = num(getCell(row, "Default split %"), 0);
      runningSplit += splitPct;
      const existing = existingByKey.get(key);
      layers.push({
        id: existing?.id ?? `${key}_${Date.now()}`,
        key,
        label,
        sortOrder: num(getCell(row, "Sort order"), layers.length + 1),
        defaultSplitPct: splitPct,
        allocationPolicy: policyRaw,
      });
      if (existing) counts.layers.updates += 1;
      else counts.layers.inserts += 1;
    }
    const reserve = deltas.planPatch?.reservePct ?? snapshot.activePlan.reservePct;
    if (runningSplit + reserve > 100.01) {
      issues.push(
        issue(
          "warning",
          `Layer splits (${runningSplit.toFixed(1)}%) + reserve (${reserve}%) exceed 100%.`,
          { sheet: layersSheet.name }
        )
      );
    }
    if (layers.length) {
      deltas.layers = layers;
    }
  }

  // Freeze warning if the plan's BU has any active freeze.
  if (snapshot.activePlan) {
    const buFreezes = snapshot.freezes.filter(
      (f) => f.hrBusinessUnitId === snapshot.activePlan!.hrBusinessUnitId
    );
    if (buFreezes.length) {
      issues.push(
        issue(
          "warning",
          `Active plan's BU has ${buFreezes.length} payout freeze(s). Frozen periods will not be re-paid.`,
          { code: "freeze_present" }
        )
      );
    }
  }

  const changeSummary: ImportChangeSummaryRow[] = [
    { entity: "Plan header", inserts: 0, updates: counts.plan },
    { entity: "Layers", inserts: counts.layers.inserts, updates: counts.layers.updates },
  ];

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues, changeSummary, deltas: ok ? deltas : undefined };
}

async function commit(deltas: InDeltas): Promise<CommitResult> {
  const inc = useIncentivePlanStore.getState();
  const active = inc.getActivePlan();
  if (!active) return { ok: false, error: "No active incentive plan to update." };
  const next: IncentivePlan = {
    ...active,
    ...(deltas.planPatch ?? {}),
    layers: deltas.layers ?? active.layers,
  };
  const ok = await inc.savePlan(next);
  if (!ok) {
    return {
      ok: false,
      error: inc.lastPersistError?.message ?? "Save failed",
    };
  }
  return {
    ok: true,
    appliedSummary: [
      {
        entity: "Plan header",
        inserts: 0,
        updates: deltas.planPatch ? 1 : 0,
      },
      {
        entity: "Layers",
        inserts: deltas.layers?.length ?? 0,
        updates: 0,
      },
    ],
  };
}

export const incentivesImportAdapter: ImportAdapter<InSnapshot, InDeltas> = {
  id: "incentives",
  label: "Incentives",
  dependsOn: ["hr-workforce"],
  loadSnapshot,
  checkDependencies,
  buildTemplate,
  planUpload: (workbook, snapshot) => planUpload(workbook, snapshot),
  commit,
};

// expose `bool` so it isn't a dead import flagged by linter
export const _internal = { bool };
