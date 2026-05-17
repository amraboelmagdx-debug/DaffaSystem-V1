import { NextResponse } from "next/server";

export class TenantAuthError extends Error {
  readonly status = 401;

  constructor(message = "Authentication required") {
    super(message);
    this.name = "TenantAuthError";
  }
}

export class TenantForbiddenError extends Error {
  readonly status = 403;

  constructor(message = "Access denied for this organization") {
    super(message);
    this.name = "TenantForbiddenError";
  }
}

export class TenantConflictError extends Error {
  readonly status = 409;
  readonly code = "CONFLICT" as const;

  constructor(message = "Catalog was updated on the server; refresh and try again") {
    super(message);
    this.name = "TenantConflictError";
  }
}

export function tenantErrorResponse(err: unknown): NextResponse {
  if (err instanceof TenantAuthError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof TenantForbiddenError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof TenantConflictError) {
    return NextResponse.json({ error: err.message, code: err.code }, { status: err.status });
  }
  throw err;
}

export async function catchTenantErrors<T>(
  fn: () => Promise<T>
): Promise<T | NextResponse> {
  try {
    return await fn();
  } catch (err) {
    return tenantErrorResponse(err);
  }
}
