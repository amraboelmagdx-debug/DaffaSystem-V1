"use client";

import { useTranslations } from "next-intl";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("login");
  const params = useParams<{ locale: string }>();
  const searchParams = useSearchParams();
  const locale = params?.locale ?? "en";
  const router = useRouter();
  const nextPath = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const supabase = createClient();

  const signIn = async () => {
    if (!supabase) {
      setMessage(t("configure"));
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setMessage(error?.message ?? "OK");
    if (!error) {
      if (nextPath && nextPath.startsWith("/")) {
        router.replace(nextPath);
      } else {
        router.replace("/");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/40 p-6">
      <Card className="w-full max-w-md border-border/60 bg-card/80 shadow-xl backdrop-blur">
        <CardHeader>
          <CardTitle className="text-2xl">{t("title")}</CardTitle>
          <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{t("email")}</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">{t("password")}</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button className="w-full" onClick={signIn}>
            {t("continue")}
          </Button>
          {message && <p className="text-xs text-muted-foreground">{message}</p>}
          <Link
            href="/"
            locale={locale as "en" | "ar"}
            className="block text-center text-xs text-primary underline"
          >
            {t("demo")}
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
