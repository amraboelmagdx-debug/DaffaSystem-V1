type ActiveOrganizationListener = (organizationId: string | null) => void;

/** Client hint only (not auth); used to resolve namespaced persist keys before async tenant fetch. */
const ACTIVE_ORG_CLIENT_HINT_KEY = "efp-active-org-client-hint";

let activeOrganizationId: string | null = null;
const listeners = new Set<ActiveOrganizationListener>();

function writeActiveOrganizationClientHint(organizationId: string | null): void {
  if (typeof window === "undefined") return;
  if (organizationId) {
    sessionStorage.setItem(ACTIVE_ORG_CLIENT_HINT_KEY, organizationId);
  } else {
    sessionStorage.removeItem(ACTIVE_ORG_CLIENT_HINT_KEY);
  }
}

export function getActiveOrganizationId(): string | null {
  return activeOrganizationId;
}

export function setActiveOrganizationId(organizationId: string | null): void {
  if (activeOrganizationId === organizationId) return;
  activeOrganizationId = organizationId;
  writeActiveOrganizationClientHint(organizationId);
  for (const listener of listeners) {
    listener(activeOrganizationId);
  }
}

/**
 * Restore active org from last successful tenant init (sync, before Zustand rehydrate).
 * Does not replace server membership checks.
 */
export function bootstrapActiveOrganizationFromClientHint(): string | null {
  if (typeof window === "undefined") return null;
  const hint = sessionStorage.getItem(ACTIVE_ORG_CLIENT_HINT_KEY);
  if (!hint) return null;
  if (!activeOrganizationId) {
    activeOrganizationId = hint;
  }
  return hint;
}

/** Dev-only: align client persist resolver with server DEV_TENANT_ID when set in .env.local. */
export function bootstrapActiveOrganizationFromPublicDevEnv(): string | null {
  if (process.env.NODE_ENV !== "development") return null;
  const devOrgId = process.env.NEXT_PUBLIC_DEV_TENANT_ID?.trim();
  if (!devOrgId) return null;
  if (!activeOrganizationId) {
    setActiveOrganizationId(devOrgId);
  }
  return devOrgId;
}

export function requireActiveOrganizationId(): string {
  if (!activeOrganizationId) {
    throw new Error("Active organization is not set");
  }
  return activeOrganizationId;
}

export function subscribeActiveOrganizationId(listener: ActiveOrganizationListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
