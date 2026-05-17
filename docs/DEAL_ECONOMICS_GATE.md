# Deal Economics readiness gate (foundation)

Companion to the readiness audit plan. Documents known divergences and the assistant economics context contract — **no runtime AI wiring yet**.

## Utilization: HR vs Sales Plan

Two independent utilization semantics exist today. Do not merge them in forecasting until a reconciliation layer is defined.

| Source | Field / mechanism | Meaning | Consumed by |
|--------|-------------------|---------|-------------|
| HR workforce | `utilizationRatePct` on BU overhead | Manual billable-capacity % for OH loading and loaded hourly rates | `deriveHrWorkforceModel` → service cost simulation → `evaluateServiceEconomics` |
| HR intelligence | `capacityUtilizationPct` | Dashboard narrative (workforce KPIs) | HR UI only — **not** planning or deal economics |
| Sales Plan | `CapacityModel` in `buildSalesPlanModel` | Heuristic from awards × complexity (`× 42` hours fudge) | Sales Plan wizard / `salesPlan.capacity.loadIndex` only |

**Implication:** Sales Plan capacity load is **not** HR billable hours. Deal economics quantity on lines does **not** yet consume phase hours or HR FTE capacity. Forecasting that mixes executive monthly grain with annual Sales Plan SAR without a bridge will double-count or mis-state capacity.

**Gate stance:** Document and test economics on HR-loaded rates; treat Sales Plan capacity as a separate planning heuristic until Phase 4+ forecast versions.

## Assistant economics context (JSON schema)

The assistant route does not yet evaluate economics server-side. When wiring Phase 6, send a **tenant-scoped** payload derived from `evaluateDealEconomics` (or a persisted `deal_economics_runs` row):

```json
{
  "schemaVersion": 1,
  "organizationId": "uuid",
  "hrBusinessUnitId": "hr-bu-id",
  "companyId": "planning-company-uuid",
  "dealId": "optional-client-id",
  "graph": {
    "organizationId": "uuid",
    "hrBusinessUnitId": "hr-bu-id",
    "companyId": "uuid",
    "templateId": "primary-template-id",
    "tierId": "primary-tier-id",
    "currency": "SAR",
    "revenueStreamId": "optional-stream-uuid",
    "dealId": "optional"
  },
  "graphEdges": [
    { "kind": "tenant", "organizationId": "uuid" },
    { "kind": "business_unit", "hrBusinessUnitId": "hr-bu-id", "companyId": "uuid" },
    { "kind": "service_template", "templateId": "tpl", "tierId": "tier" }
  ],
  "lineage": {
    "engineVersion": 1,
    "formulaVersion": 1,
    "serviceCatalogUpdatedAt": "ISO-8601",
    "hrCatalogUpdatedAt": "ISO-8601"
  },
  "rollupMeasures": {
    "deal.directCost": 0,
    "deal.loadedCost": 0,
    "deal.suggestedPrice": 0,
    "deal.totalQuantity": 0
  },
  "lines": [
    {
      "lineId": "line-1",
      "label": "Line label",
      "quantity": 1,
      "serviceTemplateId": "tpl",
      "serviceTierId": "tier",
      "measures": {
        "deal.directCost": 0,
        "deal.loadedCost": 0
      }
    }
  ],
  "warnings": [],
  "persistedRunId": "optional-uuid-from-deal_economics_runs"
}
```

Measure keys in `rollupMeasures` / line `measures` must match `MEASURE_ID` entries (`deal.*`, `serviceEconomics.*`). Use `dealEconomicsRollupAsMeasureValues` from `@/lib/deal-economics/deal-measures` when building this object.

**Security:** Never send cross-tenant catalog blobs; resolve catalogs server-side or from org-scoped API. Prefer `persistedRunId` for citations so HR/SA drift between sessions is auditable.

## API stub

`POST /api/platform/deal-economics/runs` — accepts `{ hrBusinessUnitId, input, result }` where `result.ok === true` and inserts into `deal_economics_runs` when Supabase is configured. Evaluation remains client-side until Calculator UI.
