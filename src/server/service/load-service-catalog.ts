import { resolveHrCatalogSupabaseClient } from "@/server/hr/resolve-hr-catalog-supabase";

export type ServiceArchitectureCatalogRow = {
  organizationId: string;
  payload: Record<string, unknown>;
  engineVersion: string | null;
  updatedAt: string;
};

export async function loadServiceArchitectureCatalog(
  organizationId: string
): Promise<ServiceArchitectureCatalogRow | null> {
  const supabase = await resolveHrCatalogSupabaseClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from("service_architecture_catalog")
    .select("organization_id, payload, engine_version, updated_at")
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const payload =
    data.payload != null && typeof data.payload === "object" && !Array.isArray(data.payload)
      ? (data.payload as Record<string, unknown>)
      : {};

  return {
    organizationId: data.organization_id as string,
    payload,
    engineVersion: (data.engine_version as string | null) ?? null,
    updatedAt: data.updated_at as string,
  };
}
