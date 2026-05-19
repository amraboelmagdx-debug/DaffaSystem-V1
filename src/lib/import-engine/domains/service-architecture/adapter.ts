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
import { ciKey } from "@/lib/import-engine/normalize";
import { findSheet } from "@/lib/import-engine/workbook";
import { buildRefSheet } from "@/lib/import-engine/reference-builder";
import { issue, makeIdIndex } from "@/lib/import-engine/dry-run";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";
import { useServiceArchitectureStore } from "@/stores/use-service-architecture-store";
import { newServiceId } from "@/lib/service-architecture/id";
import { flushServiceCatalogSync } from "@/lib/persistence/service-catalog-dual-write";
import type {
  DeliveryPhase,
  ServiceFamily,
  ServiceRoleAllocation,
  ServiceTemplate,
  ServiceTemplateTier,
  ServiceTemplateTierPhase,
  ServiceTier,
} from "@/types/service-architecture";

interface SaSnapshot {
  hrBusinessUnits: { id: string; name: string }[];
  hrRoles: { id: string; name: string; departmentId: string; businessUnitId: string }[];
  catalog: {
    families: ServiceFamily[];
    tiers: ServiceTier[];
    templates: ServiceTemplate[];
    templateTiers: ServiceTemplateTier[];
    phases: DeliveryPhase[];
    templateTierPhases: ServiceTemplateTierPhase[];
    allocations: ServiceRoleAllocation[];
  };
}

interface SaDeltas {
  families: ServiceFamily[];
  tiers: ServiceTier[];
  templates: ServiceTemplate[];
  templateTiers: ServiceTemplateTier[];
  phases: DeliveryPhase[];
  templateTierPhases: ServiceTemplateTierPhase[];
  allocations: ServiceRoleAllocation[];
}

const SHEET_NAMES = {
  families: "Service Families",
  tiers: "Service Tiers",
  templates: "Service Templates",
  templateTiers: "Template Tiers",
  phases: "Delivery Phases",
  templateTierPhases: "Template Tier Phases",
  allocations: "Role Allocations",
};

const FAMILY_COLS = ["id", "name *", "code *", "description"];
const TIER_COLS = ["serviceFamilyName *", "id", "name *", "code *", "description"];
const TEMPLATE_COLS = [
  "serviceFamilyName *",
  "businessUnitName *",
  "id",
  "name *",
  "code *",
  "description",
];
const TEMPLATE_TIER_COLS = ["templateName *", "tierName *"];
const PHASE_COLS = ["id", "name *", "code *", "description"];
const TEMPLATE_TIER_PHASE_COLS = [
  "templateName *",
  "tierName *",
  "phaseName *",
  "sortOrder *",
];
const ALLOC_COLS = [
  "templateName *",
  "tierName *",
  "phaseName *",
  "roleName *",
  "allocatedHours *",
  "notes",
];

function loadSnapshot(): SaSnapshot {
  const hr = useHrWorkforceStore.getState();
  const sa = useServiceArchitectureStore.getState();
  return {
    hrBusinessUnits: hr.businessUnits.map((u) => ({ id: u.id, name: u.name })),
    hrRoles: hr.roles.map((r) => ({
      id: r.id,
      name: r.name,
      departmentId: r.departmentId,
      businessUnitId: r.businessUnitId,
    })),
    catalog: {
      families: sa.serviceFamilies,
      tiers: sa.serviceTiers,
      templates: sa.serviceTemplates,
      templateTiers: sa.serviceTemplateTiers,
      phases: sa.deliveryPhases,
      templateTierPhases: sa.serviceTemplateTierPhases,
      allocations: sa.serviceRoleAllocations,
    },
  };
}

function checkDependencies(): DependencyCheck[] {
  const hr = useHrWorkforceStore.getState();
  const checks: DependencyCheck[] = [];
  checks.push({
    moduleId: "hr-business-units",
    label: "HR Business Units",
    status: hr.businessUnits.length > 0 ? "satisfied" : "missing",
    detail:
      hr.businessUnits.length > 0
        ? `${hr.businessUnits.length} business unit(s) available for template lookups.`
        : "Add at least one HR business unit before defining service templates.",
  });
  checks.push({
    moduleId: "hr-roles",
    label: "HR Roles",
    status: hr.roles.length > 0 ? "satisfied" : "partial",
    detail:
      hr.roles.length > 0
        ? `${hr.roles.length} HR role(s) available for allocations.`
        : "You can import service structure now and add role allocations after HR roles exist.",
  });
  return checks;
}

function nowIso(): string {
  return new Date().toISOString();
}

function newMeta() {
  const t = nowIso();
  return {
    lifecycle: "draft" as const,
    version: 1,
    createdAt: t,
    updatedAt: t,
  };
}

/** Coherent sample rows for blank templates (linked across sheets). */
function buildBlankSaExampleRows(snapshot: SaSnapshot) {
  const buName = snapshot.hrBusinessUnits[0]?.name ?? "Your Business Unit";
  const roleName = snapshot.hrRoles[0]?.name ?? "Senior Engineer";

  const familyName = "Managed Services";
  const familyCode = "MSV";
  const tierName = "Standard";
  const tierCode = "STD";
  const templateName = "Standard Delivery Package";
  const templateCode = "SDP";
  const phaseName = "Discovery";
  const phaseCode = "DISC";

  return {
    families: [
      {
        id: "",
        name: familyName,
        code: familyCode,
        description: "Example family — edit or delete this row before import",
      },
    ],
    tiers: [
      {
        serviceFamilyName: familyName,
        id: "",
        name: tierName,
        code: tierCode,
        description: "Example tier linked to the family above",
      },
    ],
    templates: [
      {
        serviceFamilyName: familyName,
        businessUnitName: buName,
        id: "",
        name: templateName,
        code: templateCode,
        description: "Example template — Business Unit must exist in HR (see Reference sheet)",
      },
    ],
    templateTiers: [
      {
        templateName,
        tierName,
      },
    ],
    phases: [
      {
        id: "",
        name: phaseName,
        code: phaseCode,
        description: "Example reusable delivery phase",
      },
    ],
    templateTierPhases: [
      {
        templateName,
        tierName,
        phaseName,
        sortOrder: 1,
      },
    ],
    allocations: [
      {
        templateName,
        tierName,
        phaseName,
        roleName,
        allocatedHours: 40,
        notes: "Example — role name must match HR Roles reference sheet",
      },
    ],
  };
}

function buildTemplate(snapshot: SaSnapshot, mode: "blank" | "export"): TemplateSpec {
  const buByIdName = new Map(snapshot.hrBusinessUnits.map((u) => [u.id, u.name]));
  const familyByIdName = new Map(snapshot.catalog.families.map((f) => [f.id, f.name]));
  const tierByIdName = new Map(snapshot.catalog.tiers.map((t) => [t.id, t.name]));
  const templateByIdName = new Map(snapshot.catalog.templates.map((t) => [t.id, t.name]));
  const phaseByIdName = new Map(snapshot.catalog.phases.map((p) => [p.id, p.name]));
  const tttById = new Map(snapshot.catalog.templateTiers.map((tt) => [tt.id, tt]));
  const tttpById = new Map(snapshot.catalog.templateTierPhases.map((p) => [p.id, p]));

  const blankExamples = buildBlankSaExampleRows(snapshot);

  const familyRows =
    mode === "export"
      ? snapshot.catalog.families.map((f) => ({
          id: f.id,
          name: f.name,
          code: f.code,
          description: f.description ?? "",
        }))
      : blankExamples.families;
  const tierRows =
    mode === "export"
      ? snapshot.catalog.tiers.map((tt) => ({
          serviceFamilyName: familyByIdName.get(tt.serviceFamilyId) ?? "",
          id: tt.id,
          name: tt.name,
          code: tt.code,
          description: tt.description ?? "",
        }))
      : blankExamples.tiers;
  const templateRows =
    mode === "export"
      ? snapshot.catalog.templates.map((t) => ({
          serviceFamilyName: familyByIdName.get(t.serviceFamilyId) ?? "",
          businessUnitName: buByIdName.get(t.businessUnitId) ?? "",
          id: t.id,
          name: t.name,
          code: t.code,
          description: t.description ?? "",
        }))
      : blankExamples.templates;
  const templateTierRows =
    mode === "export"
      ? snapshot.catalog.templateTiers.map((tt) => ({
          templateName: templateByIdName.get(tt.serviceTemplateId) ?? "",
          tierName: tierByIdName.get(tt.serviceTierId) ?? "",
        }))
      : blankExamples.templateTiers;
  const phaseRows =
    mode === "export"
      ? snapshot.catalog.phases.map((p) => ({
          id: p.id,
          name: p.name,
          code: p.code,
          description: p.description ?? "",
        }))
      : blankExamples.phases;
  const templateTierPhaseRows =
    mode === "export"
      ? snapshot.catalog.templateTierPhases.map((p) => {
          const ttt = tttById.get(p.serviceTemplateTierId);
          return {
            templateName: ttt ? templateByIdName.get(ttt.serviceTemplateId) ?? "" : "",
            tierName: ttt ? tierByIdName.get(ttt.serviceTierId) ?? "" : "",
            phaseName: phaseByIdName.get(p.deliveryPhaseId) ?? "",
            sortOrder: p.sortOrder,
          };
        })
      : blankExamples.templateTierPhases;
  const allocRows =
    mode === "export"
      ? snapshot.catalog.allocations.map((a) => {
          const tttp = tttpById.get(a.serviceTemplateTierPhaseId);
          const ttt = tttp ? tttById.get(tttp.serviceTemplateTierId) : undefined;
          const role = snapshot.hrRoles.find((r) => r.id === a.jobRoleId);
          return {
            templateName: ttt ? templateByIdName.get(ttt.serviceTemplateId) ?? "" : "",
            tierName: ttt ? tierByIdName.get(ttt.serviceTierId) ?? "" : "",
            phaseName: tttp ? phaseByIdName.get(tttp.deliveryPhaseId) ?? "" : "",
            roleName: role?.name ?? "",
            allocatedHours: a.allocatedHours,
            notes: a.notes ?? "",
          };
        })
      : blankExamples.allocations;

  return {
    fileName: "service-architecture-import-template.xlsx",
    instructions: {
      title: "Service Architecture — import template",
      lines: [
        "Fill data sheets bottom-up: Service Families → Service Tiers → Service Templates → Template Tiers → Delivery Phases → Template Tier Phases → Role Allocations.",
        "Each data sheet includes one example row (row 2) showing how columns link together — replace values or delete that row before import.",
        "Business Units and Roles come from HR — they must exist there first. Reference sheets show what's currently available.",
        "The example uses your first HR Business Unit and Role when present; otherwise placeholder names are shown.",
        "Lookup is case-insensitive on name. Leave Id blank to insert new entities.",
        "Role Allocations are sparse — only fill rows where a role contributes hours to that phase.",
      ],
    },
    referenceSheets: [
      buildRefSheet(
        "HR Business Units",
        snapshot.hrBusinessUnits.map((u) => ({ id: u.id, name: u.name })),
        { columnOrder: ["id", "name"] }
      ),
      buildRefSheet(
        "HR Roles",
        snapshot.hrRoles.map((r) => ({ id: r.id, name: r.name })),
        { columnOrder: ["id", "name"] }
      ),
      buildRefSheet(
        "Existing Service Families",
        snapshot.catalog.families.map((f) => ({ id: f.id, name: f.name, code: f.code }))
      ),
      buildRefSheet(
        "Existing Service Templates",
        snapshot.catalog.templates.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          businessUnit: buByIdName.get(t.businessUnitId) ?? "",
          family: familyByIdName.get(t.serviceFamilyId) ?? "",
        }))
      ),
    ],
    sheets: [
      {
        name: SHEET_NAMES.families,
        columns: FAMILY_COLS.map((c) => parseCol(c)),
        rows: familyRows,
      },
      {
        name: SHEET_NAMES.tiers,
        columns: TIER_COLS.map((c) => parseCol(c)),
        rows: tierRows,
      },
      {
        name: SHEET_NAMES.templates,
        columns: TEMPLATE_COLS.map((c) => parseCol(c)),
        rows: templateRows,
      },
      {
        name: SHEET_NAMES.templateTiers,
        description: "Pairs a Service Template with allowed Service Tiers.",
        columns: TEMPLATE_TIER_COLS.map((c) => parseCol(c)),
        rows: templateTierRows,
      },
      {
        name: SHEET_NAMES.phases,
        columns: PHASE_COLS.map((c) => parseCol(c)),
        rows: phaseRows,
      },
      {
        name: SHEET_NAMES.templateTierPhases,
        description: "Ordered phase list per template+tier selection.",
        columns: TEMPLATE_TIER_PHASE_COLS.map((c) => parseCol(c)),
        rows: templateTierPhaseRows,
      },
      {
        name: SHEET_NAMES.allocations,
        description: "Role-hours per template/tier/phase.",
        columns: ALLOC_COLS.map((c) => parseCol(c)),
        rows: allocRows,
      },
    ],
    validationNotes: [
      "Errors block import. Warnings allow you to proceed.",
      "Example row chain: Managed Services → Standard tier → Standard Delivery Package → Discovery phase → 40h allocation.",
      "Each Template lives under one Business Unit and one Family.",
      "Role Allocations require HR roles to already exist.",
    ],
  };
}

function parseCol(spec: string) {
  const required = spec.includes("*");
  const key = spec.replace("*", "").trim();
  return { key, label: key, required };
}

function getCell(row: ParsedSheet["rows"][number], header: string): string {
  // Locate the actual header from the parsed sheet that matches our column key.
  // We look at the row.values keys for a case-insensitive label match (strip "*").
  for (const [k, v] of Object.entries(row.values)) {
    const norm = ciKey(k.replace("*", "").trim());
    if (norm === ciKey(header)) return (v ?? "").toString().trim();
  }
  return "";
}

function planUpload(workbook: ParsedWorkbook, snapshot: SaSnapshot): ImportPlanResult<SaDeltas> {
  const issues: ImportIssue[] = [];
  const buByName = new Map(snapshot.hrBusinessUnits.map((u) => [ciKey(u.name), u]));
  const hrRoleByName = new Map(snapshot.hrRoles.map((r) => [ciKey(r.name), r]));
  const familyById = makeIdIndex(snapshot.catalog.families);
  const tierById = makeIdIndex(snapshot.catalog.tiers);
  const templateById = makeIdIndex(snapshot.catalog.templates);
  const phaseById = makeIdIndex(snapshot.catalog.phases);

  // Working name indexes — they get updated as we ingest new rows.
  const families = new Map<string, ServiceFamily>();
  for (const f of snapshot.catalog.families) families.set(ciKey(f.name), f);
  const tiersByFamilyName = new Map<string, ServiceTier>();
  for (const t of snapshot.catalog.tiers) {
    const family = familyById.get(t.serviceFamilyId);
    if (family) tiersByFamilyName.set(`${ciKey(family.name)}::${ciKey(t.name)}`, t);
  }
  const templates = new Map<string, ServiceTemplate>();
  for (const t of snapshot.catalog.templates) templates.set(ciKey(t.name), t);
  const phases = new Map<string, DeliveryPhase>();
  for (const p of snapshot.catalog.phases) phases.set(ciKey(p.name), p);
  const tttByTemplateTier = new Map<string, ServiceTemplateTier>();
  for (const tt of snapshot.catalog.templateTiers) {
    const tmpl = templateById.get(tt.serviceTemplateId);
    const tier = tierById.get(tt.serviceTierId);
    if (tmpl && tier) {
      tttByTemplateTier.set(`${ciKey(tmpl.name)}::${ciKey(tier.name)}`, tt);
    }
  }
  const tttpByKey = new Map<string, ServiceTemplateTierPhase>();
  for (const ttp of snapshot.catalog.templateTierPhases) {
    const ttt = snapshot.catalog.templateTiers.find((tt) => tt.id === ttp.serviceTemplateTierId);
    if (!ttt) continue;
    const tmpl = templateById.get(ttt.serviceTemplateId);
    const tier = tierById.get(ttt.serviceTierId);
    const phase = phaseById.get(ttp.deliveryPhaseId);
    if (tmpl && tier && phase) {
      tttpByKey.set(
        `${ciKey(tmpl.name)}::${ciKey(tier.name)}::${ciKey(phase.name)}`,
        ttp
      );
    }
  }

  const deltas: SaDeltas = {
    families: [],
    tiers: [],
    templates: [],
    templateTiers: [],
    phases: [],
    templateTierPhases: [],
    allocations: [],
  };
  const counts = {
    family: { inserts: 0, updates: 0 },
    tier: { inserts: 0, updates: 0 },
    template: { inserts: 0, updates: 0 },
    templateTier: { inserts: 0, updates: 0 },
    phase: { inserts: 0, updates: 0 },
    tttp: { inserts: 0, updates: 0 },
    alloc: { inserts: 0, updates: 0 },
  };

  const familiesSheet = findSheet(workbook, SHEET_NAMES.families);
  if (familiesSheet) {
    for (const row of familiesSheet.rows) {
      const name = getCell(row, "name");
      const code = getCell(row, "code");
      if (!name || !code) {
        issues.push(
          issue("error", "Service family requires name and code.", {
            sheet: familiesSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const idCell = getCell(row, "id");
      const existing = idCell ? familyById.get(idCell) : families.get(ciKey(name));
      if (existing) {
        const updated: ServiceFamily = {
          ...existing,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description") || existing.description,
          updatedAt: nowIso(),
        };
        deltas.families.push(updated);
        families.set(ciKey(updated.name), updated);
        counts.family.updates += 1;
      } else {
        const created: ServiceFamily = {
          id: idCell || newServiceId("svc_family"),
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description"),
          ...newMeta(),
        };
        deltas.families.push(created);
        families.set(ciKey(created.name), created);
        counts.family.inserts += 1;
      }
    }
  }

  const tiersSheet = findSheet(workbook, SHEET_NAMES.tiers);
  if (tiersSheet) {
    for (const row of tiersSheet.rows) {
      const familyName = getCell(row, "serviceFamilyName");
      const name = getCell(row, "name");
      const code = getCell(row, "code");
      if (!familyName || !name || !code) {
        issues.push(
          issue("error", "Service tier requires family, name, and code.", {
            sheet: tiersSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const family = families.get(ciKey(familyName));
      if (!family) {
        issues.push(
          issue("error", `Unknown service family "${familyName}".`, {
            sheet: tiersSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const key = `${ciKey(family.name)}::${ciKey(name)}`;
      const idCell = getCell(row, "id");
      const existing = idCell ? tierById.get(idCell) : tiersByFamilyName.get(key);
      if (existing) {
        const updated: ServiceTier = {
          ...existing,
          serviceFamilyId: family.id,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description") || existing.description,
          updatedAt: nowIso(),
        };
        deltas.tiers.push(updated);
        tiersByFamilyName.set(key, updated);
        counts.tier.updates += 1;
      } else {
        const created: ServiceTier = {
          id: idCell || newServiceId("svc_tier"),
          serviceFamilyId: family.id,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description"),
          ...newMeta(),
        };
        deltas.tiers.push(created);
        tiersByFamilyName.set(key, created);
        counts.tier.inserts += 1;
      }
    }
  }

  const templatesSheet = findSheet(workbook, SHEET_NAMES.templates);
  if (templatesSheet) {
    for (const row of templatesSheet.rows) {
      const familyName = getCell(row, "serviceFamilyName");
      const buName = getCell(row, "businessUnitName");
      const name = getCell(row, "name");
      const code = getCell(row, "code");
      if (!familyName || !buName || !name || !code) {
        issues.push(
          issue("error", "Service template requires family, BU, name, and code.", {
            sheet: templatesSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const family = families.get(ciKey(familyName));
      const bu = buByName.get(ciKey(buName));
      if (!family) {
        issues.push(
          issue("error", `Unknown family "${familyName}" — define it in Service Families first.`, {
            sheet: templatesSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      if (!bu) {
        issues.push(
          issue("error", `Unknown business unit "${buName}" — must exist in HR.`, {
            sheet: templatesSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const idCell = getCell(row, "id");
      const existing = idCell ? templateById.get(idCell) : templates.get(ciKey(name));
      if (existing) {
        const updated: ServiceTemplate = {
          ...existing,
          serviceFamilyId: family.id,
          businessUnitId: bu.id,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description") || existing.description,
          updatedAt: nowIso(),
        };
        deltas.templates.push(updated);
        templates.set(ciKey(updated.name), updated);
        counts.template.updates += 1;
      } else {
        const created: ServiceTemplate = {
          id: idCell || newServiceId("svc_template"),
          serviceFamilyId: family.id,
          businessUnitId: bu.id,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description"),
          ...newMeta(),
        };
        deltas.templates.push(created);
        templates.set(ciKey(created.name), created);
        counts.template.inserts += 1;
      }
    }
  }

  const templateTiersSheet = findSheet(workbook, SHEET_NAMES.templateTiers);
  if (templateTiersSheet) {
    for (const row of templateTiersSheet.rows) {
      const tmplName = getCell(row, "templateName");
      const tierName = getCell(row, "tierName");
      if (!tmplName || !tierName) continue;
      const tmpl = templates.get(ciKey(tmplName));
      if (!tmpl) {
        issues.push(
          issue("error", `Unknown template "${tmplName}".`, {
            sheet: templateTiersSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      // Tier may be from any family within this template's family.
      const familyName = familiesById(families).get(tmpl.serviceFamilyId);
      const tier = familyName
        ? tiersByFamilyName.get(`${ciKey(familyName)}::${ciKey(tierName)}`)
        : undefined;
      if (!tier) {
        issues.push(
          issue("error", `Tier "${tierName}" not found in family of template "${tmplName}".`, {
            sheet: templateTiersSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const key = `${ciKey(tmpl.name)}::${ciKey(tier.name)}`;
      const existing = tttByTemplateTier.get(key);
      if (existing) {
        counts.templateTier.updates += 1;
        continue;
      }
      const created: ServiceTemplateTier = {
        id: newServiceId("svc_tmpl_tier"),
        serviceTemplateId: tmpl.id,
        serviceTierId: tier.id,
        ...newMeta(),
      };
      deltas.templateTiers.push(created);
      tttByTemplateTier.set(key, created);
      counts.templateTier.inserts += 1;
    }
  }

  const phasesSheet = findSheet(workbook, SHEET_NAMES.phases);
  if (phasesSheet) {
    for (const row of phasesSheet.rows) {
      const name = getCell(row, "name");
      const code = getCell(row, "code");
      if (!name || !code) {
        issues.push(
          issue("error", "Delivery phase requires name and code.", {
            sheet: phasesSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const idCell = getCell(row, "id");
      const existing = idCell ? phaseById.get(idCell) : phases.get(ciKey(name));
      if (existing) {
        const updated: DeliveryPhase = {
          ...existing,
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description") || existing.description,
          updatedAt: nowIso(),
        };
        deltas.phases.push(updated);
        phases.set(ciKey(updated.name), updated);
        counts.phase.updates += 1;
      } else {
        const created: DeliveryPhase = {
          id: idCell || newServiceId("svc_phase"),
          name,
          code: code.toUpperCase(),
          description: getCell(row, "description"),
          ...newMeta(),
        };
        deltas.phases.push(created);
        phases.set(ciKey(created.name), created);
        counts.phase.inserts += 1;
      }
    }
  }

  const tttpSheet = findSheet(workbook, SHEET_NAMES.templateTierPhases);
  if (tttpSheet) {
    for (const row of tttpSheet.rows) {
      const tmplName = getCell(row, "templateName");
      const tierName = getCell(row, "tierName");
      const phaseName = getCell(row, "phaseName");
      const sortOrder = Number(getCell(row, "sortOrder") ?? "");
      if (!tmplName || !tierName || !phaseName) {
        issues.push(
          issue("error", "Template tier phase requires template, tier and phase.", {
            sheet: tttpSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const tttKey = `${ciKey(tmplName)}::${ciKey(tierName)}`;
      const ttt = tttByTemplateTier.get(tttKey);
      const phase = phases.get(ciKey(phaseName));
      if (!ttt) {
        issues.push(
          issue("error", `Template/tier "${tmplName} / ${tierName}" not found — add it under Template Tiers.`, {
            sheet: tttpSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      if (!phase) {
        issues.push(
          issue("error", `Unknown phase "${phaseName}".`, {
            sheet: tttpSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const key = `${ciKey(tmplName)}::${ciKey(tierName)}::${ciKey(phaseName)}`;
      const existing = tttpByKey.get(key);
      if (existing) {
        const updated: ServiceTemplateTierPhase = {
          ...existing,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : existing.sortOrder,
          updatedAt: nowIso(),
        };
        deltas.templateTierPhases.push(updated);
        tttpByKey.set(key, updated);
        counts.tttp.updates += 1;
      } else {
        const created: ServiceTemplateTierPhase = {
          id: newServiceId("svc_tmpl_tier_phase"),
          serviceTemplateTierId: ttt.id,
          deliveryPhaseId: phase.id,
          sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
          ...newMeta(),
        };
        deltas.templateTierPhases.push(created);
        tttpByKey.set(key, created);
        counts.tttp.inserts += 1;
      }
    }
  }

  const allocSheet = findSheet(workbook, SHEET_NAMES.allocations);
  if (allocSheet) {
    for (const row of allocSheet.rows) {
      const tmplName = getCell(row, "templateName");
      const tierName = getCell(row, "tierName");
      const phaseName = getCell(row, "phaseName");
      const roleName = getCell(row, "roleName");
      const hours = Number(getCell(row, "allocatedHours") ?? "");
      if (!tmplName || !tierName || !phaseName || !roleName) {
        issues.push(
          issue("error", "Role allocation requires template, tier, phase, and role.", {
            sheet: allocSheet.name,
            rowIndex: row.rowIndex,
          })
        );
        continue;
      }
      const tttp = tttpByKey.get(
        `${ciKey(tmplName)}::${ciKey(tierName)}::${ciKey(phaseName)}`
      );
      const role = hrRoleByName.get(ciKey(roleName));
      if (!tttp) {
        issues.push(
          issue(
            "error",
            `No template/tier/phase row found for ${tmplName} / ${tierName} / ${phaseName}.`,
            {
              sheet: allocSheet.name,
              rowIndex: row.rowIndex,
              code: "unresolved_ref",
            }
          )
        );
        continue;
      }
      if (!role) {
        issues.push(
          issue("error", `Unknown HR role "${roleName}" — add it in HR first.`, {
            sheet: allocSheet.name,
            rowIndex: row.rowIndex,
            code: "unresolved_ref",
          })
        );
        continue;
      }
      const existing = snapshot.catalog.allocations.find(
        (a) => a.serviceTemplateTierPhaseId === tttp.id && a.jobRoleId === role.id
      );
      if (existing) {
        const updated: ServiceRoleAllocation = {
          ...existing,
          allocatedHours: Math.max(0, Number.isFinite(hours) ? hours : 0),
          notes: getCell(row, "notes") || existing.notes,
          updatedAt: nowIso(),
        };
        deltas.allocations.push(updated);
        counts.alloc.updates += 1;
      } else {
        const created: ServiceRoleAllocation = {
          id: newServiceId("svc_alloc"),
          serviceTemplateTierPhaseId: tttp.id,
          jobRoleId: role.id,
          allocatedHours: Math.max(0, Number.isFinite(hours) ? hours : 0),
          notes: getCell(row, "notes"),
          ...newMeta(),
        };
        deltas.allocations.push(created);
        counts.alloc.inserts += 1;
      }
    }
  }

  const changeSummary: ImportChangeSummaryRow[] = [
    { entity: "Service Families", inserts: counts.family.inserts, updates: counts.family.updates },
    { entity: "Service Tiers", inserts: counts.tier.inserts, updates: counts.tier.updates },
    { entity: "Service Templates", inserts: counts.template.inserts, updates: counts.template.updates },
    { entity: "Template Tiers", inserts: counts.templateTier.inserts, updates: counts.templateTier.updates },
    { entity: "Delivery Phases", inserts: counts.phase.inserts, updates: counts.phase.updates },
    { entity: "Template Tier Phases", inserts: counts.tttp.inserts, updates: counts.tttp.updates },
    { entity: "Role Allocations", inserts: counts.alloc.inserts, updates: counts.alloc.updates },
  ];

  const ok = !issues.some((i) => i.level === "error");
  return { ok, issues, changeSummary, deltas: ok ? deltas : undefined };
}

function familiesById(map: Map<string, ServiceFamily>): Map<string, string> {
  // Returns familyId → familyName
  const result = new Map<string, string>();
  for (const family of map.values()) result.set(family.id, family.name);
  return result;
}

async function commit(deltas: SaDeltas, context: { organizationId: string | null }): Promise<CommitResult> {
  const upsertById = <T extends { id: string }>(existing: T[], incoming: T[]): T[] => {
    const map = new Map(existing.map((it) => [it.id, it]));
    for (const it of incoming) {
      const prev = map.get(it.id);
      map.set(it.id, prev ? { ...prev, ...it } : it);
    }
    return Array.from(map.values());
  };
  const sa = useServiceArchitectureStore.getState();
  useServiceArchitectureStore.setState({
    serviceFamilies: upsertById(sa.serviceFamilies, deltas.families),
    serviceTiers: upsertById(sa.serviceTiers, deltas.tiers),
    serviceTemplates: upsertById(sa.serviceTemplates, deltas.templates),
    serviceTemplateTiers: upsertById(sa.serviceTemplateTiers, deltas.templateTiers),
    deliveryPhases: upsertById(sa.deliveryPhases, deltas.phases),
    serviceTemplateTierPhases: upsertById(sa.serviceTemplateTierPhases, deltas.templateTierPhases),
    serviceRoleAllocations: upsertById(sa.serviceRoleAllocations, deltas.allocations),
  });

  if (context.organizationId) {
    try {
      await flushServiceCatalogSync(context.organizationId, { skipExpectedUpdatedAt: true });
    } catch {
      /* the persist bar surfaces sync retries */
    }
  }

  return {
    ok: true,
    appliedSummary: [
      { entity: "Service Families", inserts: 0, updates: deltas.families.length },
      { entity: "Service Tiers", inserts: 0, updates: deltas.tiers.length },
      { entity: "Service Templates", inserts: 0, updates: deltas.templates.length },
      { entity: "Template Tiers", inserts: deltas.templateTiers.length, updates: 0 },
      { entity: "Delivery Phases", inserts: 0, updates: deltas.phases.length },
      { entity: "Template Tier Phases", inserts: 0, updates: deltas.templateTierPhases.length },
      { entity: "Role Allocations", inserts: 0, updates: deltas.allocations.length },
    ],
  };
}

export const serviceArchitectureImportAdapter: ImportAdapter<SaSnapshot, SaDeltas> = {
  id: "service-architecture",
  label: "Service Architecture",
  dependsOn: ["hr-workforce"],
  loadSnapshot,
  checkDependencies,
  buildTemplate,
  planUpload: (workbook, snapshot) => planUpload(workbook, snapshot),
  commit,
};
