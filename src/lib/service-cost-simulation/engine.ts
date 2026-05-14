import { getTemplateTierPhasesOrdered } from "@/lib/service-architecture/selectors";
import type {
  ServiceCostAssumptions,
  ServiceCostCatalogSlice,
  ServiceCostDeliverableBlock,
  ServiceCostPhaseBlock,
  ServiceCostSimulationInput,
  ServiceCostSimulationLine,
  ServiceCostSimulationResult,
  ServiceCostTotals,
} from "./types";

const EPS = 1e-9;

/** Phase-type hooks (QA / design / delivery lag) — multiplied by global coordination, management, and inefficiency outside. */
function phaseTypeHourFactor(phaseCode: string, assumptions: ServiceCostAssumptions): number {
  const c = phaseCode.toUpperCase();
  let f = 1;
  if (c.includes("QA")) f *= Math.max(EPS, assumptions.qaSensitivityFactor);
  if (c.includes("DES") || c.includes("DESIGN")) f *= Math.max(EPS, assumptions.designRevisionIntensityFactor);
  if (c.includes("DEL") || c.includes("DELIVERY")) f *= Math.max(EPS, assumptions.clientReviewLagFactor);
  return f;
}

function scenarioStack(scenario: ServiceCostSimulationInput["scenario"]): number {
  return (
    Math.max(EPS, scenario.hoursMultiplier) *
    Math.max(EPS, scenario.effortMultiplier) *
    Math.max(EPS, scenario.coordinationMultiplier) *
    Math.max(EPS, scenario.managementMultiplier)
  );
}

export function simulateServiceDeliveryCost(input: ServiceCostSimulationInput): ServiceCostSimulationResult {
  const { catalog, roles, breakdownByRoleId, serviceTemplateId, serviceTierId, assumptions, scenario } = input;
  const warnings: string[] = [];

  const template = catalog.serviceTemplates.find((t) => t.id === serviceTemplateId);
  const tier = catalog.serviceTiers.find((t) => t.id === serviceTierId);
  if (!template) return { ok: false, errors: ["Service template not found"] };
  if (!tier) return { ok: false, errors: ["Service tier not found"] };
  if (template.serviceFamilyId !== tier.serviceFamilyId) {
    return { ok: false, errors: ["Tier does not belong to the template's service family"] };
  }

  const templateTier = catalog.serviceTemplateTiers.find(
    (tt) => tt.serviceTemplateId === template.id && tt.serviceTierId === tier.id
  );
  if (!templateTier) {
    return { ok: false, errors: ["Template and tier are not linked (ServiceTemplateTier missing)"] };
  }

  const roleById = new Map(roles.map((r) => [r.id, r]));
  const ordered = getTemplateTierPhasesOrdered({
    serviceTemplateTierId: templateTier.id,
    templateTierPhases: catalog.serviceTemplateTierPhases,
    phases: catalog.deliveryPhases,
  });

  const phases: ServiceCostPhaseBlock[] = [];
  const scenarioFactor = scenarioStack(scenario);
  const assumptionStack =
    Math.max(EPS, assumptions.deliveryInefficiencyFactor) *
    Math.max(EPS, assumptions.coordinationLoadFactor) *
    Math.max(EPS, assumptions.managementLoadFactor);

  let totalBaseHours = 0;
  let totalEffectiveHours = 0;
  let totalDirect = 0;
  let totalLoaded = 0;

  for (const row of ordered) {
    const phaseCode = row.phaseCode;
    const phaseTypeFactor = phaseTypeHourFactor(phaseCode, assumptions);
    const phaseFactor = phaseTypeFactor * assumptionStack;

    const allocations = catalog.serviceRoleAllocations.filter(
      (a) => a.serviceTemplateTierPhaseId === row.id
    );

    const lines: ServiceCostSimulationLine[] = [];

    for (const alloc of allocations) {
      const baseHours = Math.max(0, Number(alloc.allocatedHours) || 0);
      totalBaseHours += baseHours;

      const role = roleById.get(alloc.jobRoleId);
      if (!role || role.archived) {
        warnings.push(`Allocation ${alloc.id}: role ${alloc.jobRoleId} missing or archived — cost treated as zero.`);
        lines.push({
          allocationId: alloc.id,
          jobRoleId: alloc.jobRoleId,
          roleName: role?.name ?? "(unknown role)",
          baseHours,
          phaseHourFactor: phaseFactor,
          assumptionStackFactor: assumptionStack,
          scenarioStackFactor: scenarioFactor,
          effectiveHours: 0,
          standardHourlyCost: 0,
          ohAdjustedHourlyCost: 0,
          directCost: 0,
          loadedCost: 0,
          ohContribution: 0,
          factorExplanation: ["Role unresolved — no economics applied"],
        });
        continue;
      }
      if (role.businessUnitId !== template.businessUnitId) {
        warnings.push(
          `Allocation ${alloc.id}: role ${alloc.jobRoleId} is outside template business unit — cost treated as zero.`
        );
        lines.push({
          allocationId: alloc.id,
          jobRoleId: alloc.jobRoleId,
          roleName: role.name,
          baseHours,
          phaseHourFactor: phaseFactor,
          assumptionStackFactor: assumptionStack,
          scenarioStackFactor: scenarioFactor,
          effectiveHours: 0,
          standardHourlyCost: 0,
          ohAdjustedHourlyCost: 0,
          directCost: 0,
          loadedCost: 0,
          ohContribution: 0,
          factorExplanation: ["Business unit mismatch — BU isolation enforced"],
        });
        continue;
      }

      const br = breakdownByRoleId.get(alloc.jobRoleId);
      if (!br) {
        warnings.push(`Allocation ${alloc.id}: no workforce cost breakdown for role ${alloc.jobRoleId}.`);
        lines.push({
          allocationId: alloc.id,
          jobRoleId: alloc.jobRoleId,
          roleName: role.name,
          baseHours,
          phaseHourFactor: phaseFactor,
          assumptionStackFactor: assumptionStack,
          scenarioStackFactor: scenarioFactor,
          effectiveHours: 0,
          standardHourlyCost: 0,
          ohAdjustedHourlyCost: 0,
          directCost: 0,
          loadedCost: 0,
          ohContribution: 0,
          factorExplanation: ["Missing HR cost breakdown for role"],
        });
        continue;
      }

      const effectiveHours = baseHours * phaseFactor * scenarioFactor;
      const directCost = effectiveHours * br.standardHourlyCost;
      const loadedCost = effectiveHours * br.ohAdjustedHourlyCost;
      const ohContribution = loadedCost - directCost;

      totalEffectiveHours += effectiveHours;
      totalDirect += directCost;
      totalLoaded += loadedCost;

      const factorExplanation = [
        `Phase-type × global assumption stack: ×${phaseFactor.toFixed(4)} (includes QA/design/delivery hooks where applicable)`,
        `Scenario stack: ×${scenarioFactor.toFixed(4)}`,
      ];

      lines.push({
        allocationId: alloc.id,
        jobRoleId: alloc.jobRoleId,
        roleName: role.name,
        baseHours,
        phaseHourFactor: phaseFactor,
        assumptionStackFactor: assumptionStack,
        scenarioStackFactor: scenarioFactor,
        effectiveHours,
        standardHourlyCost: br.standardHourlyCost,
        ohAdjustedHourlyCost: br.ohAdjustedHourlyCost,
        directCost,
        loadedCost,
        ohContribution,
        factorExplanation,
      });
    }

    const phaseDirectTotal = lines.reduce((s, l) => s + l.directCost, 0);
    const phaseLoadedTotal = lines.reduce((s, l) => s + l.loadedCost, 0);
    const phaseOhContribution = lines.reduce((s, l) => s + l.ohContribution, 0);
    const phaseEffectiveHours = lines.reduce((s, l) => s + l.effectiveHours, 0);

    phases.push({
      serviceTemplateTierPhaseId: row.id,
      deliveryPhaseId: row.deliveryPhaseId,
      phaseName: row.phaseName,
      phaseCode: row.phaseCode,
      sortOrder: row.sortOrder,
      lines,
      phaseDirectTotal,
      phaseLoadedTotal,
      phaseOhContribution,
      phaseEffectiveHours,
    });
  }

  const roleMap = new Map<string, ServiceCostSimulationLine[]>();
  for (const p of phases) {
    for (const l of p.lines) {
      const list = roleMap.get(l.jobRoleId) ?? [];
      list.push(l);
      roleMap.set(l.jobRoleId, list);
    }
  }

  const rolesRollup = [...roleMap.entries()].map(([jobRoleId, ls]) => {
    const roleName = ls[0]?.roleName ?? jobRoleId;
    return {
      jobRoleId,
      roleName,
      effectiveHours: ls.reduce((s, x) => s + x.effectiveHours, 0),
      directCost: ls.reduce((s, x) => s + x.directCost, 0),
      loadedCost: ls.reduce((s, x) => s + x.loadedCost, 0),
      ohContribution: ls.reduce((s, x) => s + x.ohContribution, 0),
    };
  });

  const deliverablesByPhase = new Map<string, typeof catalog.serviceDeliverables>();
  for (const d of catalog.serviceDeliverables) {
    const list = deliverablesByPhase.get(d.serviceTemplateTierPhaseId) ?? [];
    list.push(d);
    deliverablesByPhase.set(d.serviceTemplateTierPhaseId, list);
  }

  const deliverables: ServiceCostDeliverableBlock[] = [];
  for (const p of phases) {
    const ds = deliverablesByPhase.get(p.serviceTemplateTierPhaseId) ?? [];
    const share = ds.length > 0 ? 1 / ds.length : 0;
    for (const d of ds) {
      deliverables.push({
        deliverableId: d.id,
        name: d.name,
        code: d.code,
        serviceTemplateTierPhaseId: p.serviceTemplateTierPhaseId,
        shareOfPhase: share,
        effectiveHours: p.phaseEffectiveHours * share,
        directCost: p.phaseDirectTotal * share,
        loadedCost: p.phaseLoadedTotal * share,
        contributingPhaseName: p.phaseName,
        contributingPhaseCode: p.phaseCode,
      });
    }
  }

  const implicitWrapLoadedCost = Math.max(0, totalLoaded) * Math.max(0, assumptions.implicitWrapLoadedCostFraction);
  const totalsFixed: ServiceCostTotals = {
    totalBaseHours,
    totalEffectiveHours,
    totalDirectCost: totalDirect,
    totalLoadedCost: totalLoaded + implicitWrapLoadedCost,
    totalOhContribution: totalLoaded - totalDirect + implicitWrapLoadedCost,
    implicitWrapLoadedCost,
  };

  return {
    ok: true,
    templateId: template.id,
    templateName: template.name,
    templateCode: template.code,
    businessUnitId: template.businessUnitId,
    tierId: tier.id,
    tierName: tier.name,
    tierCode: tier.code,
    serviceTemplateTierId: templateTier.id,
    assumptions: { ...assumptions },
    scenario: { ...scenario },
    phases,
    roles: rolesRollup.sort((a, b) => b.loadedCost - a.loadedCost),
    deliverables,
    totals: totalsFixed,
    warnings,
  };
}
