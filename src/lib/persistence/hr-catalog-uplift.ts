const UPLIFT_PREFIX = "efp-hr-pending-uplift-";

export function hrCatalogUpliftSessionKey(organizationId: string): string {
  return `${UPLIFT_PREFIX}${organizationId}`;
}

export function markHrCatalogPendingServerUplift(organizationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(hrCatalogUpliftSessionKey(organizationId), "1");
}

export function clearHrCatalogPendingServerUplift(organizationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(hrCatalogUpliftSessionKey(organizationId));
}

export function isHrCatalogPendingServerUplift(organizationId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(hrCatalogUpliftSessionKey(organizationId)) === "1";
}
