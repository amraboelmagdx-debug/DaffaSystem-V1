import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const ACTIVE_ORG_COOKIE = "efp-active-org";

export async function readActiveOrganizationId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(ACTIVE_ORG_COOKIE)?.value?.trim();
  return value || null;
}

export function setActiveOrganizationCookie(
  response: NextResponse,
  organizationId: string
): void {
  const secure = process.env.NODE_ENV === "production";
  response.cookies.set(ACTIVE_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
