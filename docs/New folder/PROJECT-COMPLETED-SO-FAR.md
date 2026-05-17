# ما تم إنجازه حتى الآن — Nexus Plan / CRM-Dashboard

**آخر تحديث للتوثيق:** 2026-05-12

هذا الملف يجمع **كل ما تم تنفيذه فعلياً** في المستودع حتى تاريخ التحديل أعلاه، بما في ذلك التطوير الأخير نحو **استبدال نماذج Excel** (مدخلات منظّمة، مصفوفة تدفق×فئة، ومحرك دفتر تخطيط).

للتفاصيل التحليلية لملف Excel الأصلي انظر: [`docs/ZAN-AMD-workbook-analysis.md`](./ZAN-AMD-workbook-analysis.md).  
لملخص عربي أقدم (قد يختلف عن المسارات الحالية) انظر أيضاً: [`PROJECT-OVERVIEW.ar.md`](../PROJECT-OVERVIEW.ar.md).

---

## 1) الهدف والمنتج

منصة **تخطيط إيرادات وتوقعات مبيعات** على مستوى المؤسسة، مع:

- لوحة تنفيذية، شركات، سيناريوهات، خط أنابيب، مصفوفة تخطيط، مساعد، إعدادات.
- **وضع تجريبي كامل** بدون Supabase، مع **مسار تكامل** عند ضبط مفاتيح البيئة.
- **ثنائية اللغة** (عربي / إنجليزي) مع RTL وخط Cairo للعربية.
- **محرك حسابات** يتوافق مع أنماط دفتر LOTF (هامش مركّب D16، هدف مبيعات، NP عند الهدف، ROI).

---

## 2) التقنية

| الطبقة | الاختيار |
|--------|----------|
| التطبيق | Next.js 15 (App Router)، TypeScript |
| الواجهة | Tailwind، مكوّنات Radix (أسلوب shadcn)، Framer Motion، Recharts |
| الحالة | Zustand + `persist` (شركات، فرص، مصفوفة فئات التدفق) |
| الجداول / نماذج | TanStack Table، React Hook Form + Zod |
| الترجمة | `next-intl`، مسارات تحت **`/[locale]`** (`en`, `ar`) |
| الخلفية | Supabase (`@supabase/ssr`) — اختياري |
| الاختبارات | Vitest (`npm run test`) |
| تصدير جداول | `xlsx`، `jspdf` + `jspdf-autotable` |
| لوحة أوامر | `cmdk` (⌘K / Ctrl+K) |
| سحب وإفلات (جاهز للاستخدام لاحقاً) | `@dnd-kit/*` |

**تشغيل التطوير:** `npm run dev` (Webpack، المنفذ الافتراضي **3001**؛ إن كان مشغولاً استخدم `npx next dev -p 3002`). للتجربة السريعة على أجهزة قوية: `npm run dev:turbo` (Turbopack).

---

## 3) التوجيه والمسارات

- الجذر يوجّه إلى locale (مثلاً `/en` أو `/ar`) عبر middleware و`next-intl`.
- الصفحات داخل غلاف لوحة التحكم تحت:  
  `src/app/[locale]/(dashboard)/…`

| المسار (مثال) | الوظيفة |
|----------------|---------|
| `/[locale]` | لوحة تنفيذية: KPIs، مخططات، مقارنة سيناريوهات، **صف إضافي لمؤشرات محرك الدفتر** |
| `/[locale]/companies` | الشركات |
| `/[locale]/forecasts` | التوقعات |
| `/[locale]/scenarios` | السيناريوهات |
| `/[locale]/pipeline` | خط الأنابيب |
| `/[locale]/grid` | **دفتر التخطيط + مصفوفة فترات** (استيراد/تصدير، جدول شهري) |
| `/[locale]/assistant` | المساعد |
| `/[locale]/settings` | الإعدادات |
| `/[locale]/login` | تسجيل الدخول (Supabase عند التفعيل) |

**غلاف التطبيق:** `AppShell` — تنقل مترجم، تبديل سمة، تبديل لغة، **لوحة أوامر**.

---

## 4) قاعدة البيانات (Supabase / PostgreSQL)

ملفات الهجرة تحت `supabase/migrations/`:

| الملف | المحتوى (باختصار) |
|--------|---------------------|
| `001_initial_schema.sql` | منظمات، أعضاء، شركات، تدفقات إيرادات، سيناريوهات، توقعات، فرص، RLS |
| `002_planning_engine.sql` | مصفوفة التخطيط، شرائح سوق، لقطات سيناريو، حقول إضافية للتخطيط |
| `003_revenue_stream_deal_tiers.sql` | جدول **`revenue_stream_deal_tier_lines`** (فئة × تدفق: هامش مساهمة، مزج، وزن كتلة LOTF-style) + RLS |

---

## 5) واجهات API

| المسار | الغرض |
|--------|--------|
| `GET /api/planning/workspace` | تحميل مساحة التخطيط من Supabase عند التوفر؛ يتضمن **`deal_tier_lines`** (صفوف `revenue_stream_deal_tier_lines`) مع التدفقات |
| `POST /api/planning/export` | تصدير xlsx / csv / pdf |
| `POST /api/planning/import` | استيراد من Excel/CSV |
| `POST /api/planning/matrix/cell` | تحديث خلية في مصفوفة التخطيط |
| `POST /api/assistant` | مساعد (نقطة توسعة لنموذج لغوي) |

---

## 6) المحركات والحسابات

| الملف | الدور |
|--------|--------|
| `src/lib/planning/workbook-engine.ts` | هامش مركّب (كتل D16 / مزج)، هدف مبيعات `Fixed/(CM−NP%)`، NP عند الهدف، ROI؛ دوال `pickBlendedMargin`, `computeWorkbookTargets` |
| `src/lib/calculations/engine.ts` | محرك التوقعات، السيناريو، تنسيق عملة حسب locale، مكوّنات P&L |
| `src/lib/calculations/pipeline.ts` | تغطية الأنابيب، صحة الأنابيب، إيراد مرجّح |

**اختبارات ذهبية:** `src/lib/planning/workbook-engine.test.ts` (Vitest).

---

## 7) البيانات التجريبية والحالة المحلية

- `src/data/demo-seed.ts` — شركات، تدفقات، سيناريوهات، فرص، سلاسل شهرية تجريبية.
- `src/data/default-tier-lines.ts` — **صفوف افتراضية** لتدفق×فئة (tiny/standard/big/mega) مع وزن كتلة يطابق `revenueWeight`.
- `src/stores/use-workspace-store.ts` — شركة/سيناريو مختاران، شركات وفرص قابلة للتعديل، **`tierLineOverrides`** لمصفوفة الفئات مع **persist**.

---

## 8) واجهة «أفضل من Excel» (ما تم ربطه بالواجهة)

- **`PlanningWorkbookPanel`** (`src/components/planning/planning-workbook-panel.tsx`):  
  مدخلات ثابتة شهرية، عرض هدف NP من السيناريو، جداول تعديل **CM% / Mix% / حصة المحفظة%** لكل تدفق، شريط مؤشرات مشتقة فورية، إعادة ضبط للمصفوفة.
- مدمج في **`/[locale]/grid`** فوق جدول الفترات الشهرية.
- **لوحة تنفيذية:** صف KPI إضافي يعكس نفس أرقام الدفتر (مرتبط بـ `tierLineOverrides`).

**الترجمة:** مفاتيح `planning.*` في `messages/en.json` و `messages/ar.json`.

---

## 9) وثائق أخرى في المستودع

| الملف | الموضوع |
|--------|---------|
| `docs/ZAN-AMD-workbook-analysis.md` | تحليل عكسي لملف Excel ZAN/AMD وربطه بالمخطط والمحرك |
| `PROJECT-OVERVIEW.ar.md` | ملخص عربي أقدم للمشروع (قد لا يعكس كل المسارات `[locale]` الحالية) |

---

## 10) ما لم يُغلق بالكامل بعد (اتجاه العمل القادم)

- ربط **كامل CRUD** لمصفوفة الفئات مع PostgreSQL (قراءة `deal_tier_lines` من الـ API ودمجها مع الـ store، وحفظ PATCH/UPSERT من الواجهة).
- استيراد تلقائي من ورقة LOTF إلى `revenue_stream_deal_tier_lines`.
- واجهة سيناريوهات متقدمة (فرع، مقارنة، تاريخ) فوق `scenario_snapshots`.
- استخدام `@dnd-kit` في مصفوفة التخطيط عند الحاجة.

---

## 11) أوامر مفيدة

```bash
npm run dev      # تطوير (المنفذ 3001 في package.json)
npm run build    # بناء إنتاج
npm run test     # Vitest
npm run lint     # ESLint
```

---

# English summary (same scope)

**Nexus Plan** is a Next.js 15 enterprise forecasting app with **bilingual UI** (`/[locale]/en|ar`), **Supabase-ready** PostgreSQL schema (migrations `001`–`003`), a **workbook-aligned planning engine** (`workbook-engine.ts`), planning **REST APIs** (workspace including `deal_tier_lines`, import/export, matrix cell), **Vitest** coverage for workbook math, and a **PlanningWorkbookPanel** on the grid page plus **dashboard KPI row** driven by stream×tier state persisted in Zustand. Demo mode works without Supabase; full DB sync for tier lines remains the next integration slice.

---

*نهاية الملف.*
