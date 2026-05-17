export type HrCatalogPayload = Record<string, unknown>;

export type HrCatalogMeta = {
  organizationId: string;
  engineVersion: string | null;
  updatedAt: string;
};

export type FetchHrCatalogOk = {
  kind: "ok";
  catalog: HrCatalogPayload;
  meta: HrCatalogMeta;
};

export type FetchHrCatalogNotFound = {
  kind: "not_found";
};

export type FetchHrCatalogError = {
  kind: "error";
  status: number;
  message: string;
};

export type FetchHrCatalogResult = FetchHrCatalogOk | FetchHrCatalogNotFound | FetchHrCatalogError;

export async function fetchHrCatalog(): Promise<FetchHrCatalogResult> {
  try {
    const res = await fetch("/api/org/hr-catalog", {
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
      catalog?: HrCatalogPayload;
      meta?: HrCatalogMeta;
    };

    if (!body.catalog || typeof body.catalog !== "object" || !body.meta?.updatedAt) {
      return {
        kind: "error",
        status: res.status,
        message: "Invalid HR catalog response shape",
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
