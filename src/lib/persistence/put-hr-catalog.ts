import { HR_WORKFORCE_ENGINE_VERSION } from "@/lib/hr-workforce/workspace-versions";
import type { HrWorkforceCatalogPayload } from "@/server/validation/hr-catalog-schema";

export type HrCatalogMeta = {
  organizationId: string;
  engineVersion: string | null;
  updatedAt: string;
};

export type PutHrCatalogOk = {
  kind: "ok";
  meta: HrCatalogMeta;
};

export type PutHrCatalogConflict = {
  kind: "conflict";
  message: string;
};

export type PutHrCatalogValidation = {
  kind: "validation";
  status: number;
  message: string;
  details?: unknown;
};

export type PutHrCatalogError = {
  kind: "error";
  status: number;
  message: string;
  retryable: boolean;
};

export type PutHrCatalogResult =
  | PutHrCatalogOk
  | PutHrCatalogConflict
  | PutHrCatalogValidation
  | PutHrCatalogError;

export type PutHrCatalogOptions = {
  catalog: HrWorkforceCatalogPayload;
  expectedUpdatedAt?: string | null;
  keepalive?: boolean;
};

function isRetryableStatus(status: number): boolean {
  return status === 0 || status >= 500 || status === 429;
}

export async function putHrCatalog(options: PutHrCatalogOptions): Promise<PutHrCatalogResult> {
  const { catalog, expectedUpdatedAt, keepalive } = options;

  try {
    const res = await fetch("/api/org/hr-catalog", {
      method: "PUT",
      credentials: "include",
      cache: "no-store",
      keepalive: keepalive === true,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        catalog,
        engineVersion: String(HR_WORKFORCE_ENGINE_VERSION),
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

    if (res.status === 422) {
      const body = await res.json().catch(() => ({}));
      const message =
        typeof body === "object" && body !== null && "error" in body
          ? String((body as { error: unknown }).error)
          : "Validation failed";
      const details =
        typeof body === "object" && body !== null && "details" in body
          ? (body as { details: unknown }).details
          : undefined;
      return { kind: "validation", status: 422, message, details };
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

    const body = (await res.json()) as { meta?: HrCatalogMeta };
    if (!body.meta?.updatedAt || !body.meta.organizationId) {
      return {
        kind: "error",
        status: res.status,
        message: "Invalid HR catalog PUT response shape",
        retryable: false,
      };
    }

    return { kind: "ok", meta: body.meta };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { kind: "error", status: 0, message, retryable: true };
  }
}
