import { SERVICE_ARCHITECTURE_ENGINE_VERSION } from "@/lib/service-architecture/workspace-versions";
import type { ServiceArchitectureCatalogPayload } from "@/server/validation/service-catalog-schema";

export type ServiceCatalogMeta = {
  organizationId: string;
  engineVersion: string | null;
  updatedAt: string;
};

export type PutServiceCatalogOk = {
  kind: "ok";
  meta: ServiceCatalogMeta;
};

export type PutServiceCatalogConflict = {
  kind: "conflict";
  message: string;
};

export type PutServiceCatalogValidation = {
  kind: "validation";
  status: number;
  message: string;
  details?: unknown;
};

export type PutServiceCatalogError = {
  kind: "error";
  status: number;
  message: string;
  retryable: boolean;
};

export type PutServiceCatalogResult =
  | PutServiceCatalogOk
  | PutServiceCatalogConflict
  | PutServiceCatalogValidation
  | PutServiceCatalogError;

export type PutServiceCatalogOptions = {
  catalog: ServiceArchitectureCatalogPayload;
  expectedUpdatedAt?: string | null;
  keepalive?: boolean;
};

function isRetryableStatus(status: number): boolean {
  return status === 0 || status >= 500 || status === 429;
}

export async function putServiceCatalog(
  options: PutServiceCatalogOptions
): Promise<PutServiceCatalogResult> {
  const { catalog, expectedUpdatedAt, keepalive } = options;

  try {
    const res = await fetch("/api/org/service-catalog", {
      method: "PUT",
      credentials: "include",
      cache: "no-store",
      keepalive: keepalive === true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalog,
        engineVersion: String(SERVICE_ARCHITECTURE_ENGINE_VERSION),
        ...(expectedUpdatedAt ? { expectedUpdatedAt } : {}),
      }),
    });

    if (res.status === 409) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : "Catalog conflict";
      return { kind: "conflict", message };
    }

    if (res.status === 422 || res.status === 424) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : "Validation failed";
      const details =
        typeof body === "object" && body !== null && "details" in body
          ? (body as { details: unknown }).details
          : undefined;
      return { kind: "validation", status: res.status, message, details };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        kind: "error",
        status: res.status,
        message: text || res.statusText || `HTTP ${res.status}`,
        retryable: isRetryableStatus(res.status),
      };
    }

    const body = (await res.json()) as { meta?: ServiceCatalogMeta };
    if (!body.meta?.updatedAt || !body.meta.organizationId) {
      return {
        kind: "error",
        status: res.status,
        message: "Invalid service catalog PUT response shape",
        retryable: false,
      };
    }

    return { kind: "ok", meta: body.meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { kind: "error", status: 0, message, retryable: true };
  }
}
