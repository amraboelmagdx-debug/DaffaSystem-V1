import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export async function createRouteSupabaseClient() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  if (!url || !key) return null;
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          /* ignore in route when read-only */
        }
      },
    },
  });
}
