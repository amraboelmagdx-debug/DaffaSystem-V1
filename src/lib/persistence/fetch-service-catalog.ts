export type ServiceCatalogPayload = Record<string, unknown>;

export type ServiceCatalogMeta = {
  organizationId: string;
  engineVersion: string | null;
  updatedAt: string;
};

export type FetchServiceCatalogOk = {
  kind: "ok";
  catalog: ServiceCatalogPayload;
  meta: ServiceCatalogMeta;
};

export type FetchServiceCatalogNotFound = {
  kind: "not_found";
};

export type FetchServiceCatalogError = {
  kind: "error";
  status: number;
  message: string;
};

export type FetchServiceCatalogResult =
  | FetchServiceCatalogOk
  | FetchServiceCatalogNotFound
  | FetchServiceCatalogError;

export async function fetchServiceCatalog(): Promise<FetchServiceCatalogResult> {
  try {
    const res = await fetch("/api/org/service-catalog", {
      credentials: "include",
      cache: "no-store",
    });

    if (res.status === 404) {
      return { kind: "not_found" };
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return {
        kind: "error",
        status: res.status,
        message: text || res.statusText || `HTTP ${res.status}`,
      };
    }

    const body = (await res.json()) as {
      catalog?: ServiceCatalogPayload;
      meta?: ServiceCatalogMeta;
    };

    if (!body.catalog || typeof body.catalog !== "object" || !body.meta?.updatedAt) {
      return {
        kind: "error",
        status: res.status,
        message: "Invalid service catalog response shape",
      };
    }

    return {
      kind: "ok",
      catalog: body.catalog,
      meta: body.meta,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return { kind: "error", status: 0, message };
  }
}
