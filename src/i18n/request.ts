import { getRequestConfig } from "next-intl/server";
import type { AbstractIntlMessages } from "next-intl";
import { routing } from "./routing";

const HR_DASH_BU_DEFAULTS: Record<"en" | "ar", Record<string, string>> = {
  en: {
    dashBuSelectorHint: "KPIs, charts, trend, and role lists below follow this unit.",
    dashBuScopeHeading: "{bu}",
    dashBuScopeDesc:
      "Headcount, cost, department mix, top roles, OH load, risk list, and snapshot trend are scoped to this unit’s operational roles only.",
    dashPortfolioSectionTitle: "Portfolio & unit comparison",
    dashPortfolioSectionDesc:
      "Org-wide OH inputs and rates: compare every business unit in one table, then the bar chart when you have more than one unit.",
    dashPortfolioOhChartDesc:
      "Resolved OH $/hr side-by-side for each unit (same engine as Organization → HR & OH).",
    deptTableBuFilterDesc:
      "The table lists only departments for the business unit selected in the dropdown above.",
    deptTableEmptyForBu: "No departments for this unit yet — add one with “New department”.",
  },
  ar: {
    dashBuSelectorHint: "المؤشرات والمخططات والاتجاه والقوائم أدناه تتبع هذه الوحدة.",
    dashBuScopeHeading: "{bu}",
    dashBuScopeDesc:
      "العدد والتكلفة وتوزيع الإدارات وأغلى الأدوار وحمل الأعباء وقائمة المخاطر واتجاه اللقطات — كلها ضمن أدوار هذه الوحدة التشغيلية فقط.",
    dashPortfolioSectionTitle: "المحفظة ومقارنة الوحدات",
    dashPortfolioSectionDesc:
      "مدخلات ومعدلات الأعباء على مستوى المؤسسة: جدول لكل وحدة أعمال، ثم مخطط الأعمدة عند وجود أكثر من وحدة.",
    dashPortfolioOhChartDesc:
      "معدل أعباء $/ساعة لكل وحدة جنبًا إلى جنب (نفس المحرك كالتنظيم → الموارد والأعباء).",
    deptTableBuFilterDesc: "الجدول يعرض إدارات وحدة الأعمال المختارة في القائمة أعلاه فقط.",
    deptTableEmptyForBu: "لا توجد إدارات لهذه الوحدة بعد — أضف إدارة بزر «إدارة جديدة».",
  },
};

function mergeHrWorkforceDashDefaults(
  messages: Record<string, unknown>,
  locale: "en" | "ar"
): Record<string, unknown> {
  const hw = messages.hrWorkforce;
  if (!hw || typeof hw !== "object" || Array.isArray(hw)) {
    return messages;
  }
  const current = hw as Record<string, unknown>;
  const defaults = HR_DASH_BU_DEFAULTS[locale];
  const patched: Record<string, unknown> = { ...current };
  for (const [key, value] of Object.entries(defaults)) {
    if (patched[key] == null || patched[key] === "") {
      patched[key] = value;
    }
  }
  return { ...messages, hrWorkforce: patched };
}

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;
  if (!locale || !routing.locales.includes(locale as "en" | "ar")) {
    locale = routing.defaultLocale;
  }
  const raw = (await import(`../../messages/${locale}.json`)).default as Record<string, unknown>;
  const messages = mergeHrWorkforceDashDefaults(raw, locale as "en" | "ar") as AbstractIntlMessages;
  return {
    locale,
    messages,
  };
});
