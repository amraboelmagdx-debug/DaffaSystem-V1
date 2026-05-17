# HR Workforce & OH — مرجع النظام (System Reference)

وثيقة تجمع ما تم استخلاصه من الكود والمحادثات: بنية الوحدة، مسارات الحساب، واجهة المستخدم، الترجمة، والسلوك المتوقع. المشروع: **CRM-Dashboard** (Next.js 15، Webpack).

---

## 1. مكان الوحدة في المنتج

- **التبويبات (HR Workforce):** نظرة عامة (Dashboard) · الأدوار والتكاليف (Roles & costs / Operational workspace) · التنظيم والهيكل (Organization & structure) · الاستيراد (Import).
- **التخزين:** Zustand + `persist` (`efp-hr-workforce`) لـ وحدات الأعمال، الإدارات، الفرق، الأدوار، إعدادات HR العامة، إعدادات OH اليدوية لكل وحدة، اللقطات، سجلات الاستيراد.
- **المحرك:** طبقة `src/lib/hr-workforce/*` — لا ارتباط مباشر بمخطط المبيعات؛ وحدة مستقلة للتخطيط بالتكلفة والسعة.

---

## 2. نموذج البيانات (Domain)

### 2.1 الهيكل التشغيلي

| الكيان | الوصف |
|--------|--------|
| **Business unit** | وحدة أعمال؛ تحمل إعدادات OH يدوية (`ohManualByBusinessUnitId[buId]`). |
| **Department** | تابع لـ `businessUnitId`. |
| **Team** | اختياري؛ يُفعّل/يُعطّل عالميًا بـ `hrGlobalSettings.useTeamLevel`. |
| **Job role** | دور وظيفي: تعويض، عدد، نوع تشغيلي، بنود تكلفة إضافية، أرشفة، إلخ. |

### 2.2 الحقول المالية الأساسية للدور (`JobRole`)

- **لكل موظف (متوسطات):** `avgMonthlySalary`, `avgMonthlySocialInsurance`, سنوي ÷12: `annualMedicalInsurance`, `annualEndOfServiceCost`.
- **`employeeCount`:** عدد الموظفين في الصف؛ المحرك يستخدم `Math.floor` ولا يقبل سالبًا.
- **`riskFactorPct`:** يُطبَّق على **المجموع الفرعي قبل التقسيم على الساعات** (بعد إضافة البنود الإضافية، قبل تحويل الساعة).
- **`operationalRoleType`:** `delivery` | `indirect` — يؤثر على مخرجات OH (مثلاً FTE القابل للفوترة، تكوين OH المركّب).

### 2.3 بنود التكلفة الإضافية (`JobRoleAdditionalCost`)

| الحقل | المعنى |
|--------|--------|
| `costName` | اسم البند |
| `amount` | مبلغ نقدي أو **نسبة مئوية** حسب `costType` |
| `costType` | `fixed` \| `variable` \| `percentage` (في المحرك: الثابت والمتغير يُعاملان نفس الشكل شهريًا) |
| `recurring` | `monthly` \| `yearly` \| `one_time` — تحويل إلى مكافئ شهري: شهري كما هو؛ سنوي ومرة واحدة ÷12 **لكل موظف** |
| `percentageBasis` | عند النوع `percentage`: أساس النسبة (`salary_only`, `salary_plus_benefits`, `subtotal_before_risk`, `loaded_cost`, `custom`) |

**قاعدة محورية (بعد التصحيح):** مبالغ **Fixed / Variable** تُفترض **لكل موظف** لكل تكرار، ثم يُضرب المكافئ الشهري في **`employeeCount`** — بما يتماشى مع الراتب والمزايا الشهرية.

### 2.4 مخرجات تكلفة الدور (`RoleCostBreakdown`)

يُنتجها `computeRoleCostBreakdown` في `workforce-cost-engine.ts`:

- `monthlyBaseCost` = (راتب + تأمينات + طبي/12 + EOS/12) × العدد  
- `monthlyAdditionalCosts` = مجموع البنود الإضافية (شهريًا، قبل المخاطرة)  
- `monthlySubtotalBeforeRisk` = الأساس + الإضافات  
- `monthlyTotalCost` = الفرعي × (1 + risk%)  
- `standardHourlyCost` = `monthlyTotalCost / (ساعات العمل الشهرية للموظف × العدد)`  
- `ohAdjustedHourlyCost` = `standardHourlyCost + ohRatePerHour` (أو 0 عند تعطيل surcharge لدور معيّن)

---

## 3. محرك الأعباء OH

- **معدل OH للوحدة:** من `oh-engine.ts`: بسط سنوي ÷ ساعات فوترة فعّالة (مع الاستخدام والساعات الصافية وعدد القابل للفوترة).
- **ربط الدور بالمعدل:** `businessUnitId` → `ohByBusinessUnitId[buId].oh.ohRatePerHour`.
- **تكوين مركّب (composed):** قد يصفّر surcharge على أدوار غير مباشرة حسب `skipOhSurchargeOnNonBillable` في `selectors.ts`.
- **البسط السنوي:** `oh-numerator.ts` — تكوين يدوي، أسطر غير قوى عاملة، إلخ.

---

## 4. اشتقاق النموذج (`deriveHrWorkforceModel`)

الملف: `src/lib/hr-workforce/selectors.ts`.

1. لكل وحدة (ومعرفات زائدة من أدوار يتيمة): تشغيل OH + البسط.
2. `getOhRateForRole(r)` من وحدة الدور.
3. `computeAllRoleBreakdowns` لجميع الأدوار غير المؤرشفة → `breakdowns` و `breakdownByRoleId`.
4. **`operationalRoles`:** أدوار في سلسلة BU→Dept→(Team) نشطة حسب `isRoleInActiveOperationalStructure`.
5. **`dashboard` و `departmentAgg`:** من `buildWorkforceDashboardAggregates` و `aggregateByDepartment` على **الأدوار التشغيلية** و breakdowns المقابلة.

---

## 5. لوحة التحكم (Dashboard)

### 5.1 اختيار وحدة الأعمال

- الحالة: `selectedOhBuId`.
- **النطاق (Scoped):** مؤشرات KPI، مخططات الأقسام/الاستخدام/أغلى الأدوار/اتجاه اللقطات، حمل OH الشهري الهامشي، قوائم أثر OH والمخاطر، مزيج التسليم في بطاقة OH — كلها تُحسب من **`operationalRoles` التابعة للوحدة المختارة** وبناء aggregates/breakdowns لها.
- **المحفظة (Portfolio):** جدول لقطة OH **لجميع الوحدات** + مخطط أعمدة مقارنة **OH $/hr** بين الوحدات (عند وجود أكثر من وحدة)، في قسم منفصل أسفل النطاق المختار.

### 5.2 تفسير KPI «متوسط الساعة بعد الأعباء»

- **ليس** معدل OH الخام للوحدة (مثل ~41 ريال/ساعة في بطاقة ZAN).
- هو **متوسط مرجّح بالعدد** لـ `ohAdjustedHourlyCost` = تكلفة الساعة المحمّلة بعد توزيع الأعباء على نموذج التكلفة المباشرة.
- **المتوسط القياسي** في التلميح: متوسط `standardHourlyCost` (قبل طبقة OH في سعر الساعة).
- الفرق بين الاثنين غالبًا يقارب متوسط «حمولة OH لكل ساعة» على مزيج الأدوار؛ إذا كانت كل الأدوار تحت نفس معدل الوحدة، يقترب الفرق من معدل OH ذلك.

### 5.3 تلميحات KPI (لمبة)

- التلميحات أصبحت في **`InsightBulb`** (تلميح عند التمرير) بدل نص طويل داخل الكارت.
- نصوص محايدة عن «الدولار» حيث يلزم؛ المبالغ تعرض بعملة مساحة العمل.

### 5.4 جدول OH حسب الوحدة

- محاذاة **وسط** للرؤوس والخلايا مع `!text-center` لتجاوز `text-start` العام في `.app-data-table`.

---

## 6. التنظيم والهيكل (Organization)

### 6.1 الإدارات وقائمة الوحدة

- الدروب `deptBuId` يحدد **وحدة إضافة** إدارة جديدة.
- **جدول الإدارات** يعرض فقط `departments.filter(d => d.businessUnitId === deptBuId)` مع وصف ورسالة فراغ عند عدم وجود إدارات.

### 6.2 لقطات (Snapshots)

- حفظ/استعادة/مقارنة حمولة JSON (`parseHrSnapshotPayload`، إصدار v2).

---

## 7. مساحة الأدوار التشغيلية (Operational workspace)

- جدول الأدوار: تكلفة شهرية من `model.breakdownByRoleId.get(roleId)?.monthlyTotalCost`.
- حوار التعويضات: `HrRoleCompensationDialog` → `updateRole(id, patch)` يدمج `additionalCosts` وغيره.

---

## 8. الترجمة (next-intl)

- `src/i18n/request.ts`: تحميل `messages/{locale}.json` + دمج افتراضي لبعض مفاتيح `hrWorkforce` الناقصة (مثل مفاتيح لوحة الـ dashboard بعد التوسيع) لتفادي `MISSING_MESSAGE`.
- مفاتيح جديدة/محدثة تشمل: شرح محفظة الـ dashboard، تلميحات KPI، أسس نسبة البنود الإضافية (`costPctBasisLabel`, `pctBasis_*`)، فلتر جدول الإدارات، إلخ.

---

## 9. ملفات رئيسية (خريطة سريعة)

| المسار | الدور |
|--------|--------|
| `src/stores/use-hr-workforce-store.ts` | الحالة، CRUD، persist، `normalizePersistedState`، `additionalCosts` الافتراضي `[]` |
| `src/lib/hr-workforce/workforce-cost-engine.ts` | التكلفة الشهرية، البنود الإضافية، الساعة القياسية/بعد OH |
| `src/lib/hr-workforce/selectors.ts` | `deriveHrWorkforceModel` |
| `src/lib/hr-workforce/aggregates.ts` | KPI aggregates، تجميع حسب الإدارة |
| `src/lib/hr-workforce/oh-engine.ts` | معدل OH |
| `src/lib/hr-workforce/oh-numerator.ts` | بسط OH السنوي |
| `src/lib/hr-workforce/structure-utils.ts` | FTE الفعّال، صلاحية الدور في الهيكل |
| `src/components/hr-workforce/hr-workforce-dashboard-view.tsx` | لوحة التحكم، KPI، أقسام Portfolio |
| `src/components/hr-workforce/hr-workforce-dashboard-charts.tsx` | ECharts؛ مكوّن منفصل لمقارنة OH بين الوحدات |
| `src/components/hr-workforce/hr-workforce-organization-view.tsx` | الهيكل، OH اليدوي، اللقطات، جدول الإدارات المصفّى |
| `src/components/hr-workforce/hr-workforce-operational-workspace.tsx` | شبكة الأدوار، فتح حوار التعويضات |
| `src/components/hr-workforce/hr-role-compensation-dialog.tsx` | حقول التعويض + بنود إضافية + أساس النسبة |
| `messages/en.json` / `messages/ar.json` | النصوص |
| `src/app/globals.css` | `.app-data-table` — محاذاة رؤوس الجداول الافتراضية |

---

## 10. قوائم أثر OH على الـ Dashboard

- ترتيب أدوار حسب حمل OH الهامشي؛ عند التعادل ترتيب أبجدي بالاسم ثم `id`.
- قائمة قابلة للطي: صف مضغوط + توسيع للتفاصيل (وحدة، معدل، FTE، ساعات شهرية).

---

## 11. اختبارات وحدة ذات صلة

- `src/lib/hr-workforce/workforce-cost-engine.test.ts`: تحويل سنوي، المخاطرة، نسبة إضافية، **Fixed × headcount**، **Yearly ÷12 × headcount**.

---

## 12. ملاحظات تشغيلية

- بعد تغييرات الرسائل أو التخزين: حذف `.next` وإعادة `npm run dev` إذا ظهرت رسائل مفاتيح قديمة في الكاش.
- **استيراد Excel:** تنسيق اختياري للبنود الإضافية في قالب الاستيراد (انظر `templateHintBody` في الترجمة).

---

## 13. ملخص قواعد الأعمال (للمستخدم النهائي)

1. الراتب والمزايا **لكل موظف**؛ العدد في الشبكة يضربها.  
2. البنود الإضافية **Fixed/Variable** بنفس فكرة «لكل موظف» ثم × العدد.  
3. **النسبة المئوية** تُحسب على الأساس المختار في الواجهة.  
4. **معدل OH** على مستوى الوحدة يُضاف **كريال/ساعة** على السعر القياسي للساعة بعد التحميل الكامل للتعويضات والمخاطرة.  
5. **لوحة التحكم** تعكس الوحدة المختارة؛ المقارنة بين الوحدات في أسفل الصفحة.

---

*آخر تحديث للوثيقة يعكس حالة الكود والقرارات المتفق عليها في جلسات التطوير؛ عند تغيير المحرك أو الواجهة يُفضّل مراجعة الملفات المذكورة أعلاه.*
