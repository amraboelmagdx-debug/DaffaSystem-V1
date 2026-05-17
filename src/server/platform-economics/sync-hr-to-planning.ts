import { computeBusinessUnitMonthlyWorkforceCost } from "@/lib/platform-economics/bu-monthly-cost";
import {
  ECONOMICS_SYNC_SOURCE,
  ECONOMICS_SYNC_VERSION,
  type EconomicsSyncResult,
} from "@/lib/platform-economics/types";
import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";
import { loadHrWorkforceCatalog } from "@/server/hr/load-hr-catalog";
import { hrWorkforceCatalogPayloadSchema } from "@/server/validation/hr-catalog-schema";

function companyMetadata(base: Record<string, unknown> | null | undefined) {
  return base && typeof base === "object" && !Array.isArray(base) ? { ...base } : {};
}

export async function syncHrCatalogToPlanningWorkspace(
  organizationId: string
): Promise<EconomicsSyncResult> {
  const errors: string[] = [];
  const supabase = await createRouteSupabaseClient();
  if (!supabase) {
    return {
      ok: false,
      organizationId,
      companiesUpserted: 0,
      linksUpserted: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      scenariosCreated: 0,
      companiesRetired: 0,
      errors: ["Supabase is not configured."],
    };
  }

  const row = await loadHrWorkforceCatalog(organizationId);
  const parsed = row?.payload
    ? hrWorkforceCatalogPayloadSchema.safeParse(row.payload)
  : null;
  if (!parsed?.success) {
    return {
      ok: false,
      organizationId,
      companiesUpserted: 0,
      linksUpserted: 0,
      streamsCreated: 0,
      streamsUpdated: 0,
      scenariosCreated: 0,
      companiesRetired: 0,
      errors: ["HR catalog missing or invalid."],
    };
  }

  const catalog = parsed.data;
  const activeBus = catalog.businessUnits.filter((b) => b.isActive);
  const activeBuIds = new Set(activeBus.map((b) => b.id));

  const { data: linkRows, error: linkErr } = await supabase
    .from("company_hr_unit_links")
    .select("company_id, hr_business_unit_id")
    .eq("organization_id", organizationId);
  if (linkErr) errors.push(linkErr.message);

  const linkByHrId = new Map(
    (linkRows ?? []).map((r) => [r.hr_business_unit_id as string, r.company_id as string])
  );

  const { data: existingCompanies, error: coErr } = await supabase
    .from("companies")
    .select("id, name, metadata, fixed_costs_monthly, growth_target_pct, margin_target_pct, np_target_pct, baseline_revenue_monthly")
    .eq("organization_id", organizationId);
  if (coErr) errors.push(coErr.message);

  const companyById = new Map((existingCompanies ?? []).map((c) => [c.id as string, c]));

  let companiesUpserted = 0;
  let linksUpserted = 0;
  let streamsCreated = 0;
  let streamsUpdated = 0;
  let scenariosCreated = 0;

  for (const bu of activeBus) {
    const monthlyCost = computeBusinessUnitMonthlyWorkforceCost({
      businessUnitId: bu.id,
      roles: catalog.roles,
      businessUnits: catalog.businessUnits,
      departments: catalog.departments,
      teams: catalog.teams,
      hrGlobalSettings: catalog.hrGlobalSettings,
      ohManualByBusinessUnitId: catalog.ohManualByBusinessUnitId,
    });

    let companyId = linkByHrId.get(bu.id);
    const meta = {
      syncSource: ECONOMICS_SYNC_SOURCE,
      syncVersion: ECONOMICS_SYNC_VERSION,
      operationalKind: "hr_business_unit" as const,
      hrBusinessUnitId: bu.id,
      hrRetiredAt: null as string | null,
    };

    if (companyId && companyById.has(companyId)) {
      const existing = companyById.get(companyId)!;
      const prevMeta = companyMetadata(existing.metadata as Record<string, unknown>);
      const { error: upErr } = await supabase
        .from("companies")
        .update({
          name: bu.name,
          code: bu.code ?? null,
          fixed_costs_monthly: monthlyCost,
          metadata: { ...prevMeta, ...meta },
        })
        .eq("id", companyId);
      if (upErr) errors.push(upErr.message);
      else companiesUpserted += 1;
    } else {
      const { data: inserted, error: insErr } = await supabase
        .from("companies")
        .insert({
          organization_id: organizationId,
          name: bu.name,
          code: bu.code ?? null,
          fixed_costs_monthly: monthlyCost,
          growth_target_pct: 0.15,
          margin_target_pct: 0.38,
          np_target_pct: 0.12,
          baseline_revenue_monthly: 0,
          market_segments: [],
          metadata: meta,
        })
        .select("id")
        .single();
      if (insErr || !inserted) {
        errors.push(insErr?.message ?? "Company insert failed");
        continue;
      }
      companyId = inserted.id as string;
      companiesUpserted += 1;
    }

    if (!companyId) continue;

    const { error: linkUpErr } = await supabase.from("company_hr_unit_links").upsert(
      {
        organization_id: organizationId,
        company_id: companyId,
        hr_business_unit_id: bu.id,
        last_synced_at: new Date().toISOString(),
      },
      { onConflict: "organization_id,hr_business_unit_id" }
    );
    if (linkUpErr) errors.push(linkUpErr.message);
    else linksUpserted += 1;
    linkByHrId.set(bu.id, companyId);

    const depts = catalog.departments.filter((d) => d.businessUnitId === bu.id && d.isActive);
    const { data: existingStreams } = await supabase
      .from("revenue_streams")
      .select("id, name, metadata")
      .eq("company_id", companyId);

    const streamByDeptId = new Map<string, string>();
    for (const s of existingStreams ?? []) {
      const m = companyMetadata(s.metadata as Record<string, unknown>);
      const deptId = m.hrDepartmentId as string | undefined;
      if (deptId) streamByDeptId.set(deptId, s.id as string);
    }

    const n = Math.max(depts.length, 1);
    for (const dept of depts) {
      const existingStreamId = streamByDeptId.get(dept.id);
      if (existingStreamId) {
        const existing = (existingStreams ?? []).find((s) => s.id === existingStreamId);
        if (existing && String(existing.name ?? "") !== dept.name) {
          const { error: renameErr } = await supabase
            .from("revenue_streams")
            .update({ name: dept.name })
            .eq("id", existingStreamId);
          if (renameErr) errors.push(renameErr.message);
          else streamsUpdated += 1;
        }
        continue;
      }
      const weight = 1 / n;
      const { error: stErr } = await supabase.from("revenue_streams").insert({
        company_id: companyId,
        name: dept.name,
        contribution_margin_pct: 0.38,
        revenue_weight: weight,
        avg_deal_size: 0,
        growth_rate_pct: 0.1,
        conversion_rate_pct: 0.2,
        sales_cycle_days: 60,
        metadata: {
          syncSource: ECONOMICS_SYNC_SOURCE,
          hrDepartmentId: dept.id,
          hrBusinessUnitId: bu.id,
        },
      });
      if (stErr) errors.push(stErr.message);
      else streamsCreated += 1;
    }

    const { data: scenarios } = await supabase
      .from("scenarios")
      .select("id")
      .eq("company_id", companyId)
      .limit(1);
    if (!scenarios?.length) {
      const { error: scErr } = await supabase.from("scenarios").insert({
        company_id: companyId,
        name: "Baseline",
        is_baseline: true,
        assumptions: {
          syncSource: ECONOMICS_SYNC_SOURCE,
          npTargetPct: 0.12,
          revenueMixAdj: 0,
          conversionRateAdj: 0,
          fixedCostAdj: 0,
          growthAdj: 0,
          pipelineWeightAdj: 0,
        },
      });
      if (scErr) errors.push(scErr.message);
      else scenariosCreated += 1;
    }
  }

  let companiesRetired = 0;
  for (const [hrId, companyId] of linkByHrId) {
    if (activeBuIds.has(hrId)) continue;
    await supabase.from("company_hr_unit_links").delete().eq("organization_id", organizationId).eq("hr_business_unit_id", hrId);
    const co = companyById.get(companyId);
    const prevMeta = companyMetadata(co?.metadata as Record<string, unknown>);
    await supabase
      .from("companies")
      .update({
        metadata: {
          ...prevMeta,
          hrRetiredAt: new Date().toISOString(),
          hrBusinessUnitId: hrId,
        },
      })
      .eq("id", companyId);
    companiesRetired += 1;
  }

  return {
    ok: errors.length === 0,
    organizationId,
    companiesUpserted,
    linksUpserted,
    streamsCreated,
    streamsUpdated,
    scenariosCreated,
    companiesRetired,
    errors,
  };
}
