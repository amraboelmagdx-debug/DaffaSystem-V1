import createMiddleware from "next-intl/middleware";
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "@/i18n/routing";

const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (supabaseUrl && supabaseKey) {
    const supabase = createServerClient(supabaseUrl, supabaseKey, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options as never);
          });
        },
      },
    });

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (process.env.NEXT_PUBLIC_REQUIRE_AUTH === "true") {
      const path = request.nextUrl.pathname;
      const isAuthCallback = path.startsWith("/auth/callback");
      const isLogin = /\/(en|ar)\/login(\/)?$/.test(path);
      if (isAuthCallback) {
        return response;
      }
      if (!user && !isLogin) {
        const locale = path.split("/")[1];
        const safeLocale = routing.locales.includes(locale as "en" | "ar")
          ? locale
          : routing.defaultLocale;
        const redirect = new URL(`/${safeLocale}/login`, request.url);
        redirect.searchParams.set("next", path);
        return NextResponse.redirect(redirect);
      }
      if (user && isLogin) {
        const locale = path.split("/")[1];
        const safeLocale = routing.locales.includes(locale as "en" | "ar")
          ? locale
          : routing.defaultLocale;
        return NextResponse.redirect(new URL(`/${safeLocale}`, request.url));
      }
    }
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/(ar|en)/:path*",
    "/((?!api|_next|_vercel|auth|.*\\..*).*)",
  ],
};
