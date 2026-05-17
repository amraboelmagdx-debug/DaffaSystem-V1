const UPLIFT_PREFIX = "efp-sa-pending-uplift-";

export function serviceCatalogUpliftSessionKey(organizationId: string): string {
  return `${UPLIFT_PREFIX}${organizationId}`;
}

export function markServiceCatalogPendingServerUplift(organizationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(serviceCatalogUpliftSessionKey(organizationId), "1");
}

export function clearServiceCatalogPendingServerUplift(organizationId: string): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(serviceCatalogUpliftSessionKey(organizationId));
}

export function isServiceCatalogPendingServerUplift(organizationId: string): boolean {
  if (typeof window === "undefined") return false;
  return window.sessionStorage.getItem(serviceCatalogUpliftSessionKey(organizationId)) === "1";
}
