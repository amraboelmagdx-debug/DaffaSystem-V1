/**
 * Central rules for HR workforce dev-disk persistence and the `/api/dev/hr-workforce-disk` route.
 *
 * Production safety: disk mirror must never read/write HR JSON from the filesystem in production,
 * and the browser must not call that API in production builds (even if mis-routed).
 */

/** True on Vercel production deployment. */
function isVercelProduction(): boolean {
  return process.env.VERCEL_ENV === "production";
}

/**
 * Server-only: whether GET/PUT/DELETE on `/api/dev/hr-workforce-disk` are allowed.
 * Never allowed when `NODE_ENV === "production"` or on Vercel production.
 */
export function isHrWorkforceDiskApiAllowedOnServer(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (isVercelProduction()) return false;
  if (process.env.NODE_ENV === "development") return true;
  return process.env.HR_WORKFORCE_DISK_SYNC === "1";
}

/**
 * Client bundle: whether hybrid storage may call the dev disk API.
 * Restricted to development builds only — `HR_WORKFORCE_DISK_SYNC` does not enable
 * client-side disk calls in production bundles (prevents accidental exposure surface).
 */
export function isHrWorkforceHybridDiskMirrorEnabledOnClient(): boolean {
  if (process.env.NODE_ENV !== "development") return false;
  // Tenant namespaced keys must not share one global dev disk file across orgs.
  const namespaced =
    process.env.NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST !== "false" &&
    process.env.NEXT_PUBLIC_TENANT_NAMESPACED_PERSIST !== "0";
  if (namespaced) return false;
  return true;
}
