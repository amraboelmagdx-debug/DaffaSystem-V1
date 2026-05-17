import type { EconomicsSyncResult } from "@/lib/platform-economics/types";

export type ParsedPlanningSyncResponse = EconomicsSyncResult & {
  authRequired?: boolean;
};

const DEFAULT_AUTH_MESSAGE =
  "Sign in required for planning projection sync (RLS uses your session).";

function emptySyncResult(organizationId = ""): EconomicsSyncResult {
  return {
    ok: false,
    organizationId,
    companiesUpserted: 0,
    linksUpserted: 0,
    streamsCreated: 0,
    streamsUpdated: 0,
    scenariosCreated: 0,
    companiesRetired: 0,
    errors: [],
  };
}

/** Normalize API / sync error payloads into a string array (never throws). */
export function coerceErrorMessages(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? [trimmed] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item) => coerceErrorMessages(item));
  }
  if (typeof value === "object") {
    const record = value as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim()) {
      return [record.error.trim()];
    }
    if (typeof record.message === "string" && record.message.trim()) {
      return [record.message.trim()];
    }
    if (Array.isArray(record.errors)) {
      return coerceErrorMessages(record.errors);
    }
    try {
      const json = JSON.stringify(value);
      if (json && json !== "{}") return [json];
    } catch {
      /* ignore */
    }
  }
  return [String(value)];
}

function readOrganizationId(body: unknown): string {
  if (body && typeof body === "object" && "organizationId" in body) {
    const id = (body as { organizationId: unknown }).organizationId;
    if (typeof id === "string") return id;
  }
  return "";
}

function readSyncOk(body: unknown, httpOk: boolean): boolean {
  if (body && typeof body === "object" && "ok" in body) {
    return Boolean((body as { ok: unknown }).ok);
  }
  return httpOk;
}

function readSyncCounters(body: unknown): Omit<
  EconomicsSyncResult,
  "ok" | "organizationId" | "errors"
> {
  const n = (key: keyof EconomicsSyncResult) => {
    if (body && typeof body === "object" && key in body) {
      const v = (body as Record<string, unknown>)[key];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
    return 0;
  };
  return {
    companiesUpserted: n("companiesUpserted"),
    linksUpserted: n("linksUpserted"),
    streamsCreated: n("streamsCreated"),
    streamsUpdated: n("streamsUpdated"),
    scenariosCreated: n("scenariosCreated"),
    companiesRetired: n("companiesRetired"),
  };
}

/**
 * Parse economics sync HTTP response into a stable EconomicsSyncResult shape.
 */
export function parsePlanningSyncResponse(
  res: Response,
  body: unknown
): ParsedPlanningSyncResponse {
  const organizationId = readOrganizationId(body);
  const base = emptySyncResult(organizationId);

  if (res.status === 401 || res.status === 403) {
    const messages = coerceErrorMessages(body);
    return {
      ...base,
      organizationId,
      ok: false,
      authRequired: true,
      errors: messages.length ? messages : [DEFAULT_AUTH_MESSAGE],
    };
  }

  if (!res.ok) {
    const messages = coerceErrorMessages(body);
    return {
      ...base,
      organizationId,
      ok: false,
      errors: messages.length
        ? messages
        : [`Planning sync failed (${res.status} ${res.statusText})`],
    };
  }

  const ok = readSyncOk(body, res.ok);
  const counters = readSyncCounters(body);
  const errors = coerceErrorMessages(
    body && typeof body === "object" && "errors" in body
      ? (body as { errors: unknown }).errors
      : body
  );

  if (!ok && errors.length === 0) {
    errors.push("Planning sync completed with errors.");
  }

  return {
    ...base,
    ...counters,
    organizationId,
    ok,
    errors,
  };
}
