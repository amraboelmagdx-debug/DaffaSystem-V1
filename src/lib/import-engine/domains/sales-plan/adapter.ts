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
import { useWorkspaceStore } from "@/stores/use-workspace-store";
import { isScenarioGovernanceEditable } from "@/lib/planning/scenario";
import type {
  DemoCompany,
  DemoRevenueStream,
} from "@/types/domain";

interface SpSnapshot {
  hrBusinessUnits: { id: string; name: string }[];
  organizationId: string;
  companies: DemoCompany[];
  streams: DemoRevenueStream[];
  /** Active scenario id per company for governance check. */
  scenarioGovernanceById: Record<
    string,
    { status: string; editable: boolean; companyId: string; name: string }
  >;
}

interface SpDeltas {
  companies: DemoCompany[];
  streams: DemoRevenueStream[];
}

const SHEET_NAMES = {
  companies: "Companies",
  streams: "Revenue Streams",
};

function newPlanningId(prefix = "plan"): string {
  const uuid =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}_${uuid}`;
}

function loadSnapshot(): SpSnapshot {
  const hr = useHrWorkforceStore.getState();
  const ws = useWorkspaceStore.getState();
  const scenarioGovernanceById: SpSnapshot["scenarioGovernanceById"] = {};
  const bundles =
    (ws as unknown as { scenarioBundles?: Record<string, unknown> }).scenarioBundles ?? {};
  for (const [scenarioId, bundle] of Object.entries(bundles)) {
    if (!bundle || typeof bundle !== "object") continue;
    const b = bundle as { companyId: string; name: string; governance?: unknown };
    const editable = isScenarioGovernanceEditable(
      (b.governance as Parameters<typeof isScenarioGovernanceEditable>[0]) ?? null
    );
    scenarioGovernanceById[scenarioId] = {
      status:
        (b.governance && typeof b.governance === "object" && "status" in b.governance
          ? String((b.governance as { status?: string }).status ?? "draft")
          : "draft"),
      editable,
      companyId: b.companyId,
      name: b.name,
    };
  }

  const firstOrg = ws.companies[0]?.organizationId ?? "";

  return {
    hrBusinessUnits: hr.businessUnits.map((u) => ({ id: u.id, name: u.name })),
    organizationId: firstOrg,
    companies: ws.companies,
    streams: ws.streams,
    scenarioGovernanceById,
  };
}

function checkDependencies(): DependencyCheck[] {
  const hr = useHrWorkforceStore.getState();
  return [
    {
      moduleId: "hr-business-units",
      label: "HR Business Units",
      status: hr.businessUnits.length > 0 ? "satisfied" : "missing",
      detail:
        hr.businessUnits.length > 0
          ? `${hr.businessUnits.length} business unit(s) available to link to companies.`
          : "Each planning company must link to an HR Business Unit. Create them in HR first.",
    },
  ];
}

const COMPANY_COLS: { key: string; label: string; required?: boolean; example?: string | number }[] = [
  { key: "hrBusinessUnitName", label: "Business Unit (HR)", required: true, example: "ZAN" },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Display name", example: "ZAN Saudi" },
  { key: "fixedCostsMonthly", label: "Fixed costs (monthly)", example: 250000 },
  { key: "growthTargetPct", label: "Growth target %", example: 20 },
  { key: "marginTargetPct", label: "Margin target %", example: 35 },
  { key: "npTargetPct", label: "Net profit target %", example: 20 },
  { key: "revenueMonthly", label: "Revenue (monthly)", example: 1000000 },
  { key: "contributionMarginPct", label: "Contribution margin %", example: 60 },
  { key: "marketSegments", label: "Market segments (comma)", example: "Enterprise, SMB" },
];

const STREAM_COLS = [
  { key: "companyHrBusinessUnitName", label: "Company / BU (HR)", required: true, example: "ZAN" },
  { key: "id", label: "Id (leave blank for new)" },
  { key: "name", label: "Stream name", required: true, example: "Managed services" },
  { key: "contributionMarginPct", label: "Contribution margin %", example: 55 },
  { key: "revenueWeight", label: "Revenue weight", example: 0.4 },
  { key: "avgDealSize", label: "Avg deal size", example: 150000 },
  { key: "growthRatePct", label: "Growth rate %", example: 18 },
  { key: "conversionRatePct", label: "Conversion rate %", example: 25 },
  { key: "salesCycleDays", label: "Sales cycle (days)", example: 60 },
];

function buildTemplate(snapshot: SpSnapshot, mode: "blank" | "export"): TemplateSpec {
  const buByIdName = new Map(snapshot.hrBusinessUnits.map((u) => [u.id, u.name]));

  const companyRows = mode === "export"
    ? snapshot.companies.map((c) => ({
        hrBusinessUnitName: c.hrBusinessUnitId
          ? buByIdName.get(c.hrBusinessUnitId) ?? ""
          : "",
        id: c.id,
        name: c.name,
        fixedCostsMonthly: c.fixedCostsMonthly,
        growthTargetPct: c.growthTargetPct,
        marginTargetPct: c.marginTargetPct,
        npTargetPct: c.npTargetPct,
        revenueMonthly: c.revenueMonthly,
        contributionMarginPct: c.contributionMarginPct,
        marketSegments: (c.marketSegments ?? []).join(", "),
      }))
    : undefined;

  const streamRows = mode === "export"
    ? snapshot.streams.map((s) => {
        const company = snapshot.companies.find((c) => c.id === s.companyId);
        return {
          companyHrBusinessUnitName: company?.hrBusinessUnitId
            ? buByIdName.get(company.hrBusinessUnitId) ?? ""
            : "",
          id: s.id,
          name: s.name,
          contributionMarginPct: s.contributionMarginPct,
          revenueWeight: s.revenueWeight,
          avgDealSize: s.avgDealSize,
          growthRatePct: s.growthRatePct,
          conversionRatePct: s.conversionRatePct,
          salesCycleDays: s.salesCycleDays,
        };
      })
    : undefined;

  return {
    fileName: "sales-plan-import-template.xlsx",
    instructions: {
      title: "Sales Plan — import template",
      lines: [
        "This template targets the canonical Sales Plan entities: Companies (1 per BU) and Revenue Streams.",
        "Each Company must reference an HR Business Unit by name — see the reference sheet.",
        "Streams are scoped to a Company (looked up via the same BU name).",
        "Locked or archived scenarios will be skipped — see the warnings panel after upload.",
      ],
    },
    referenceSheets: [
      buildRefSheet(
        "HR Business Units",
        snapshot.hrBusinessUnits.map((u) => ({ id: u.id, name: u.name })),
        { columnOrder: ["id", "name"] }
      ),
      buildRefSheet(
        "Existing Companies",
        snapshot.companies.map((c) => ({
          id: c.id,
          name: c.name,
          businessUnit: c.hrBusinessUnitId ? buByIdName.get(c.hrBusinessUnitId) ?? "" : "",
        }))
      ),
      buildRefSheet(
        "Existing Streams",
        snapshot.streams.map((s) => {
          const company = snapshot.companies.find((c) => c.id === s.companyId);
          return {
            id: s.id,
            name: s.name,
            company: company?.name ?? "",
          };
        })
      ),
      buildRefSheet(
        "Scenarios",
        Object.entries(snapshot.scenarioGovernanceById).map(([id, g]) => ({
          id,
          name: g.name,
          status: g.status,
          editable: g.editable ? "yes" : "no",
        }))
      ),
    ],
    sheets: [
      {
        name: SHEET_NAMES.companies,
        columns: COMPANY_COLS,
        rows: companyRows,
      },
      {
        name: SHEET_NAMES.streams,
        columns: STREAM_COLS,
        rows: streamRows,
      },
    ],
    validationNotes: [
      "Errors block the import.",
      "Updates against a locked or archived scenario will produce a warning and be skipped.",
    ],
  };
}

function getCell(row: ParsedSheet["rows"][number], label: string): string {
  for (const [k, v] of Object.entries(row.values)) {
    if (ciKey(k.replace("*", "").trim()) === ciKey(label)) return (v ?? "").toString().trim();
  }
  return "";
}

function planUpload(workbook: ParsedWorkbook, snapshot: SpSnapshot): ImportPlanResult<SpDeltas> {
  const issues: ImportIssue[] = [];
  const buByName = new Map(snapshot.hrBusinessUnits.map((u) => [ciKey(u.name), u]));
  const companyById = new Map(snapshot.companies.map((c) => [c.id, c]));
  const companyByBuId = new Map(
    snapshot.companies
      .filter((c) => c.hrBusinessUnitId)
      .map((c) => [c.hrBusinessUnitId!, c])
  );

  const deltas: SpDeltas = { companies: [], streams: [] };
  const counts = {
    companies: { inserts: 0, updates: 0 },
    streams: { inserts: 0, updates: 0 },
  };

  const companySheet = findSheet(workbook, SHEET_NAMES.companies);
  if (companySheet) {
    for (const row of companySheet.rows) {
      const buName = getCell(row, "Business Unit (HR)");
      if (!buName) {
        issues.push(
          issue("error", "Company row requires an HR Business Unit name.", {
            sheet: companySheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const bu = buByName.get(ciKey(buName));
      if (!bu) {
        issues.push(
          issue("error", `Unknown HR Business Unit "${buName}".`, {
            sheet: companySheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const idCell = getCell(row, "Id (leave blank for new)");
      const existing = idCell ? companyById.get(idCell) : companyByBuId.get(bu.id);
      const company: DemoCompany = {
        id: existing?.id ?? idCell ?? newPlanningId("co"),
        name: getCell(row, "Display name") || existing?.name || bu.name,
        organizationId: existing?.organizationId ?? snapshot.organizationId,
        hrBusinessUnitId: bu.id,
        fixedCostsMonthly: num(
          getCell(row, "Fixed costs (monthly)"),
          existing?.fixedCostsMonthly ?? 0
        ),
        growthTargetPct: num(getCell(row, "Growth target %"), existing?.growthTargetPct ?? 0),
        marginTargetPct: num(getCell(row, "Margin target %"), existing?.marginTargetPct ?? 0),
        npTargetPct: num(getCell(row, "Net profit target %"), existing?.npTargetPct ?? 0),
        revenueMonthly: num(getCell(row, "Revenue (monthly)"), existing?.revenueMonthly ?? 0),
        contributionMarginPct: num(
          getCell(row, "Contribution margin %"),
          existing?.contributionMarginPct ?? 0
        ),
        marketSegments: getCell(row, "Market segments (comma)")
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean),
        opportunityTiers: existing?.opportunityTiers,
      };
      deltas.companies.push(company);
      if (existing) counts.companies.updates += 1;
      else counts.companies.inserts += 1;
    }
  }

  const streamSheet = findSheet(workbook, SHEET_NAMES.streams);
  if (streamSheet) {
    for (const row of streamSheet.rows) {
      const buName = getCell(row, "Company / BU (HR)");
      const name = getCell(row, "Stream name");
      if (!buName || !name) {
        issues.push(
          issue("error", "Revenue stream requires Company / BU name and Stream name.", {
            sheet: streamSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const bu = buByName.get(ciKey(buName));
      if (!bu) {
        issues.push(
          issue("error", `Unknown HR Business Unit "${buName}".`, {
            sheet: streamSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const company =
        companyByBuId.get(bu.id) ?? deltas.companies.find((c) => c.hrBusinessUnitId === bu.id);
      if (!company) {
        issues.push(
          issue(
            "error",
            `No planning company found for "${buName}" — add it to the Companies sheet first.`,
            {
              sheet: streamSheet.name,
              rowIndex: row.rowIndex,
              code: "unresolved_ref",
            }
          )
        );
        continue;
      }
      const idCell = getCell(row, "Id (leave blank for new)");
      const existing = idCell
        ? snapshot.streams.find((s) => s.id === idCell)
        : snapshot.streams.find(
            (s) => s.companyId === company.id && ciKey(s.name) === ciKey(name)
          );
      const stream: DemoRevenueStream = {
        id: existing?.id ?? idCell ?? newPlanningId("stream"),
        companyId: company.id,
        name,
        hrDepartmentId: existing?.hrDepartmentId ?? null,
        serviceTemplateId: existing?.serviceTemplateId ?? null,
        serviceFamilyId: existing?.serviceFamilyId ?? null,
        contributionMarginPct: num(
          getCell(row, "Contribution margin %"),
          existing?.contributionMarginPct ?? 0
        ),
        revenueWeight: num(getCell(row, "Revenue weight"), existing?.revenueWeight ?? 0),
        avgDealSize: num(getCell(row, "Avg deal size"), existing?.avgDealSize ?? 0),
        growthRatePct: num(getCell(row, "Growth rate %"), existing?.growthRatePct ?? 0),
        conversionRatePct: num(getCell(row, "Conversion rate %"), existing?.conversionRatePct ?? 0),
        salesCycleDays: num(getCell(row, "Sales cycle (days)"), existing?.salesCycleDays ?? 0),
      };
      deltas.streams.push(stream);
      if (existing) counts.streams.updates += 1;
      else counts.streams.inserts += 1;
    }
  }

  // Governance warning: any scenario for an affected company that is locked/archived.
  const affectedCompanyIds = new Set(deltas.companies.map((c) => c.id));
  for (const [, gov] of Object.entries(snapshot.scenarioGovernanceById)) {
    if (!affectedCompanyIds.has(gov.companyId)) continue;
    if (gov.editable) continue;
    issues.push(
      issue(
        "warning",
        `Scenario "${gov.name}" (${gov.status}) is non-editable — its overlays will not be touched by this import.`,
        { code: "scenario_locked" }
      )
    );
  }

  const changeSummary: ImportChangeSummaryRow[] = [
    { entity: "Companies", inserts: counts.companies.inserts, updates: counts.companies.updates },
    { entity: "Revenue Streams", inserts: counts.streams.inserts, updates: counts.streams.updates },
  ];

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues, changeSummary, deltas: ok ? deltas : undefined };
}

async function commit(deltas: SpDeltas): Promise<CommitResult> {
  const ws = useWorkspaceStore.getState();
  const upsertById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const map = new Map(existing.map((it) => [it.id, it]));
    for (const it of incoming) {
      const prev = map.get(it.id);
      map.set(it.id, prev ? { ...prev, ...it } : it);
    }
    return Array.from(map.values());
  };
  useWorkspaceStore.setState({
    companies: upsertById(ws.companies, deltas.companies),
    streams: upsertById(ws.streams, deltas.streams),
  });
  return {
    ok: true,
    appliedSummary: [
      { entity: "Companies", inserts: 0, updates: deltas.companies.length },
      { entity: "Revenue Streams", inserts: 0, updates: deltas.streams.length },
    ],
  };
}

export const salesPlanImportAdapter: ImportAdapter<SpSnapshot, SpDeltas> = {
  id: "sales-plan",
  label: "Sales Plan",
  dependsOn: ["hr-workforce"],
  loadSnapshot,
  checkDependencies,
  buildTemplate,
  planUpload: (workbook, snapshot) => planUpload(workbook, snapshot),
  commit,
};

// Helpers also exported for tests
export const _internal = { bool };
