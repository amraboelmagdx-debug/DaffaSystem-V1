import { validateStreamServiceTemplateLink } from "@/lib/deal-economics/validate-integrity";
import { catalogSliceFromStore } from "@/lib/service-cost-simulation/hr-input";
import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import { loadServiceArchitectureCatalog } from "@/server/service/load-service-catalog";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";
import { serviceArchitectureCatalogPayloadSchema } from "@/server/validation/service-catalog-schema";

export type LinkStreamToServiceInput = {
  organizationId: string;
  streamId: string;
  serviceTemplateId?: string | null;
  serviceFamilyId?: string | null;
};

export type LinkStreamToServiceResult =
  | { ok: true; streamId: string; metadata: Record<string, unknown> }
  | { ok: false; status: number; message: string };

function streamMetadata(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return { ...(raw as Record<string, unknown>) };
  }
  return {};
}

function parseSaPayload(payload: Record<string, unknown>): ServiceArchitectureCatalogPayload | null {
  const parsed = serviceArchitectureCatalogPayloadSchema.safeParse(payload);
  return parsed.success ? parsed.data : null;
}

async function validateSaRefs(
  organizationId: string,
  serviceTemplateId?: string | null,
  serviceFamilyId?: string | null
): Promise<string | null> {
  if (!serviceTemplateId && !serviceFamilyId) return null;

  const row = await loadServiceArchitectureCatalog(organizationId);
  const catalog = row ? parseSaPayload(row.payload) : null;
  if (!catalog) {
    return "Service architecture catalog not found for this organization";
  }

  if (serviceFamilyId) {
    const family = catalog.serviceFamilies.find((f) => f.id === serviceFamilyId);
    if (!family) return `Unknown service family id: ${serviceFamilyId}`;
  }

  if (serviceTemplateId) {
    const template = catalog.serviceTemplates.find((t) => t.id === serviceTemplateId);
    if (!template) return `Unknown service template id: ${serviceTemplateId}`;
    if (serviceFamilyId && template.serviceFamilyId !== serviceFamilyId) {
      return "Service template does not belong to the specified family";
    }
  }

  return null;
}

async function resolveStreamHrBusinessUnitId(
  organizationId: string,
  companyId: string,
  streamMetadata: Record<string, unknown>
): Promise<string | null> {
  const fromMeta = streamMetadata.hrBusinessUnitId;
  if (typeof fromMeta === "string" && fromMeta.length > 0) return fromMeta;

  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) return null;

  const { data: link } = await supabase
    .from("company_hr_unit_links")
    .select("hr_business_unit_id")
    .eq("organization_id", organizationId)
    .eq("company_id", companyId)
    .maybeSingle();

  const hrId = link?.hr_business_unit_id;
  return typeof hrId === "string" && hrId.length > 0 ? hrId : null;
}

export async function linkRevenueStreamToService(
  input: LinkStreamToServiceInput
): Promise<LinkStreamToServiceResult> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 500, message: "Supabase client is not configured" };
  }

  const refError = await validateSaRefs(
    input.organizationId,
    input.serviceTemplateId,
    input.serviceFamilyId
  );
  if (refError) {
    return { ok: false, status: 422, message: refError };
  }

  const { data: stream, error: loadErr } = await supabase
    .from("revenue_streams")
    .select("id, company_id, metadata")
    .eq("id", input.streamId)
    .maybeSingle();

  if (loadErr || !stream) {
    return { ok: false, status: 404, message: "Revenue stream not found" };
  }

  const { data: company, error: coErr } = await supabase
    .from("companies")
    .select("organization_id")
    .eq("id", stream.company_id as string)
    .maybeSingle();

  if (coErr || !company || company.organization_id !== input.organizationId) {
    return { ok: false, status: 403, message: "Stream does not belong to this organization" };
  }

  const prev = streamMetadata(stream.metadata);

  if (input.serviceTemplateId) {
    const row = await loadServiceArchitectureCatalog(input.organizationId);
    const catalogPayload = row ? parseSaPayload(row.payload) : null;
    if (!catalogPayload) {
      return {
        ok: false,
        status: 422,
        message: "Service architecture catalog not found for this organization",
      };
    }
    const streamBuId = await resolveStreamHrBusinessUnitId(
      input.organizationId,
      stream.company_id as string,
      prev
    );
    const buErr = validateStreamServiceTemplateLink(
      catalogSliceFromStore(catalogPayload),
      input.serviceTemplateId,
      streamBuId
    );
    if (buErr) {
      return { ok: false, status: 422, message: buErr };
    }
  }

  const metadata: Record<string, unknown> = { ...prev };

  if (input.serviceTemplateId === null) {
    delete metadata.serviceTemplateId;
  } else if (input.serviceTemplateId) {
    metadata.serviceTemplateId = input.serviceTemplateId;
  }

  if (input.serviceFamilyId === null) {
    delete metadata.serviceFamilyId;
  } else if (input.serviceFamilyId) {
    metadata.serviceFamilyId = input.serviceFamilyId;
  }

  const { error: updateErr } = await supabase
    .from("revenue_streams")
    .update({ metadata })
    .eq("id", input.streamId);

  if (updateErr) {
    return { ok: false, status: 500, message: updateErr.message };
  }

  return { ok: true, streamId: input.streamId, metadata };
}
