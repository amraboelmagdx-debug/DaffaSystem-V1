import { describe, expect, it } from "vitest";
import {
  getJobRolesForTemplateBusinessUnit,
  getRoleAllocationsByPhase,
  getTemplateLinkedTiers,
  getTemplateTierPhasesOrdered,
} from "./selectors";
import { validateTemplateTierFamilyConsistency } from "./validation";
import { makeOperationalStressCatalog } from "./operational-stress-catalog";

describe("operational stress catalog (realistic multi-family / multi-BU)", () => {
  const cat = makeOperationalStressCatalog();

  it("models 15 templates across 4 families and 4 BUs", () => {
    expect(cat.serviceFamilies).toHaveLength(4);
    expect(cat.serviceTemplates).toHaveLength(15);
    const buSet = new Set(cat.serviceTemplates.map((t) => t.businessUnitId));
    expect(buSet.size).toBe(4);
  });

  it("keeps tier identity family-scoped (Tiny in Branding ≠ Tiny in Motion)", () => {
    const tinyBrand = cat.serviceTiers.find((t) => t.code === "TINY" && t.serviceFamilyId === "fam-brand");
    const tinyMotion = cat.serviceTiers.find((t) => t.code === "TINY" && t.serviceFamilyId === "fam-motion");
    expect(tinyBrand).toBeDefined();
    expect(tinyMotion).toBeDefined();
    expect(tinyBrand!.id).not.toBe(tinyMotion!.id);
  });

  it("exposes 16 tiers (4 families × 4 tier codes) without cross-family collision", () => {
    expect(cat.serviceTiers).toHaveLength(16);
    const byFam = new Map<string, number>();
    for (const t of cat.serviceTiers) {
      byFam.set(t.serviceFamilyId, (byFam.get(t.serviceFamilyId) ?? 0) + 1);
    }
    expect([...byFam.values()].every((n) => n === 4)).toBe(true);
  });

  it("links template tiers only within the same family", () => {
    for (const tt of cat.serviceTemplateTiers) {
      const issues = validateTemplateTierFamilyConsistency({
        templateTier: tt,
        templates: cat.serviceTemplates,
        tiers: cat.serviceTiers,
      });
      expect(issues, JSON.stringify(issues)).toHaveLength(0);
    }
  });

  it("filters HR roles for dropdowns by template business unit only", () => {
    const brandingTpl = cat.serviceTemplates.find((t) => t.id === "tpl-bi")!;
    const motionTpl = cat.serviceTemplates.find((t) => t.id === "tpl-exp")!;
    const brandRoles = getJobRolesForTemplateBusinessUnit({
      templateId: brandingTpl.id,
      templates: cat.serviceTemplates,
      roles: cat.roles,
    });
    const motionRoles = getJobRolesForTemplateBusinessUnit({
      templateId: motionTpl.id,
      templates: cat.serviceTemplates,
      roles: cat.roles,
    });
    expect(brandRoles.map((r) => r.id).sort()).toEqual(["jr-brand-cd", "jr-brand-des"]);
    expect(motionRoles.map((r) => r.id).sort()).toEqual(["jr-motion-ae", "jr-motion-mg"]);
  });

  it("expands phase depth as tiers grow (Tiny vs Mega path lengths)", () => {
    const ttTiny = cat.serviceTemplateTiers.find((x) => x.id === "tt-tpl-bi-TINY")!;
    const ttMega = cat.serviceTemplateTiers.find((x) => x.id === "tt-tpl-bi-MEGA")!;
    const tinyPhases = getTemplateTierPhasesOrdered({
      serviceTemplateTierId: ttTiny.id,
      templateTierPhases: cat.serviceTemplateTierPhases,
      phases: cat.deliveryPhases,
    });
    const megaPhases = getTemplateTierPhasesOrdered({
      serviceTemplateTierId: ttMega.id,
      templateTierPhases: cat.serviceTemplateTierPhases,
      phases: cat.deliveryPhases,
    });
    expect(tinyPhases.length).toBeLessThan(megaPhases.length);
  });

  it("scales aggregate role hours upward from Tiny → Mega for the same template", () => {
    const tplId = "tpl-bi";
    const tiers = ["TINY", "STANDARD", "BIG", "MEGA"] as const;
    const totals = tiers.map((code) => {
      const tt = cat.serviceTemplateTiers.find((x) => x.serviceTemplateId === tplId && x.id.endsWith(code))!;
      const phaseIds = cat.serviceTemplateTierPhases.filter((p) => p.serviceTemplateTierId === tt.id).map((p) => p.id);
      const byPhase = getRoleAllocationsByPhase(cat.serviceRoleAllocations);
      let sum = 0;
      for (const pid of phaseIds) {
        for (const row of byPhase[pid] ?? []) sum += row.allocatedHours;
      }
      return sum;
    });
    for (let i = 1; i < totals.length; i++) {
      expect(totals[i]).toBeGreaterThanOrEqual(totals[i - 1]);
    }
  });

  it("returns linked tiers only for the chosen template", () => {
    const linked = getTemplateLinkedTiers({
      serviceTemplateId: "tpl-pkg",
      templateTiers: cat.serviceTemplateTiers,
      tiers: cat.serviceTiers,
    });
    expect(linked.map((t) => t.code).sort()).toEqual(["BIG", "MEGA"]);
  });
});
