import { NextIntlClientProvider } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { LocaleHead } from "@/components/i18n/locale-head";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!routing.locales.includes(locale as "en" | "ar")) {
    notFound();
  }
  setRequestLocale(locale);
  const messages = await getMessages();
  const isAr = locale === "ar";

  return (
    <>
      <LocaleHead locale={locale} />
      <NextIntlClientProvider locale={locale} messages={messages}>
        <div
          className={isAr ? "min-h-screen font-cairo" : "min-h-screen font-sans"}
          dir={isAr ? "rtl" : "ltr"}
        >
          {children}
        </div>
      </NextIntlClientProvider>
    </>
  );
}
