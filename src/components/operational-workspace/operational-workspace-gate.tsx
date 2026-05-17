"use client";



import type { ReactNode } from "react";

import { useTranslations } from "next-intl";

import { usePathname } from "next/navigation";



import { Button } from "@/components/ui/button";

import { Link } from "@/i18n/navigation";

import { useOperationalWorkspace } from "@/hooks/use-operational-workspace";



type Props = {

  children: ReactNode;

  loadingLabel?: string;

};



export function OperationalWorkspaceGate({ children, loadingLabel }: Props) {

  const t = useTranslations("workspace");

  const pathname = usePathname();

  const {

    isHydrating,

    bootstrapError,

    authRequired,

    hrActiveBuCount,

    retryWorkspaceBootstrap,

  } = useOperationalWorkspace();



  const loginHref =

    pathname && pathname.length > 0

      ? `/login?next=${encodeURIComponent(pathname)}`

      : "/login";



  if (isHydrating) {

    return (

      <p className="py-12 text-center text-sm text-muted-foreground">

        {loadingLabel ?? t("hydrating")}

      </p>

    );

  }



  if (bootstrapError && hrActiveBuCount > 0) {

    return (

      <div className="mx-auto max-w-lg space-y-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">

        <p className="text-sm font-medium text-foreground">{t("syncFailedTitle")}</p>

        <p className="text-xs text-muted-foreground">{bootstrapError}</p>

        <div className="flex flex-wrap items-center justify-center gap-2">

          {authRequired ? (

            <Button type="button" size="sm" asChild>

              <Link href={loginHref}>{t("signIn")}</Link>

            </Button>

          ) : null}

          <Button

            type="button"

            size="sm"

            variant="secondary"

            onClick={() => void retryWorkspaceBootstrap()}

          >

            {t("retrySync")}

          </Button>

        </div>

      </div>

    );

  }



  return <>{children}</>;

}

