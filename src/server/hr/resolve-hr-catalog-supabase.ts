import { createDevServiceRoleClient } from "@/lib/supabase/dev-service-role";
import { createRouteSupabaseClient } from "@/lib/supabase/route-handler";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Prefer the session-bound route client (RLS enforced). When there is no auth
 * session, fall back to the dev service-role client (local only) so dev tenant
 * bypass can still read/write the catalog row.
 */
export async function resolveHrCatalogSupabaseClient(): Promise<SupabaseClient | null> {
  const route = await createRouteSupabaseClient();

  if (route) {
    let user: { id: string } | null = null;
    try {
      const result = await route.auth.getUser();
      user = result.data.user ?? null;
    } catch {
      user = null;
    }

    if (user) return route;

    const admin = createDevServiceRoleClient();
    if (admin) return admin;
    return route;
  }

  // Anon client unavailable (missing NEXT_PUBLIC_*); dev service-role may still be configured.
  return createDevServiceRoleClient();
}
