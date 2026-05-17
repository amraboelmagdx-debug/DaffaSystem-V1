import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";
import { TenantConflictError } from "@/server/tenant/errors";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

export type SaveServiceArchitectureCatalogInput = {
  organizationId: string;
  userId: string;
  catalog: ServiceArchitectureCatalogPayload;
  engineVersion: string;
  expectedUpdatedAt?: string;
};

export type SaveServiceArchitectureCatalogResult = {
  organizationId: string;
  engineVersion: string;
  updatedAt: string;
};

function parseTimestampMs(iso: string): number | null {
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

function timestampsMatch(a: string, b: string): boolean {
  const aMs = parseTimestampMs(a);
  const bMs = parseTimestampMs(b);
  if (aMs == null || bMs == null) return a === b;
  return aMs === bMs;
}

export async function saveServiceArchitectureCatalog(
  input: SaveServiceArchitectureCatalogInput
): Promise<SaveServiceArchitectureCatalogResult> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured");
  }

  const { organizationId, userId, catalog, engineVersion, expectedUpdatedAt } = input;

  if (expectedUpdatedAt) {
    const { data: existing, error: loadError } = await supabase
      .from("service_architecture_catalog")
      .select("updated_at")
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (loadError) {
      throw new Error(loadError.message);
    }

    if (existing?.updated_at) {
      const serverUpdatedAt = existing.updated_at as string;
      if (!timestampsMatch(expectedUpdatedAt, serverUpdatedAt)) {
        throw new TenantConflictError();
      }
    }
  }

  const { data, error } = await supabase
    .from("service_architecture_catalog")
    .upsert(
      {
        organization_id: organizationId,
        payload: catalog,
        engine_version: engineVersion,
        updated_by: userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "organization_id" }
    )
    .select("organization_id, engine_version, updated_at")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Failed to save service architecture catalog");
  }

  return {
    organizationId: data.organization_id as string,
    engineVersion: (data.engine_version as string) ?? engineVersion,
    updatedAt: data.updated_at as string,
  };
}
