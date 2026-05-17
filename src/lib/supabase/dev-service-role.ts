import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Local development only: service-role client for server catalog I/O when the
 * route has no Supabase Auth session (dev tenant bypass). Bypasses RLS — use
 * logged-in requests to verify RLS on the API path.
 */
export function createDevServiceRoleClient(): SupabaseClient | null {
  if (process.env.NODE_ENV === "production") return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) return null;

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
