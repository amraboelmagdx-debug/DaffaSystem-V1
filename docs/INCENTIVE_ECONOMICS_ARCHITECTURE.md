# Sales Team Incentive Economics — Canonical Architecture

**Status:** Approved for implementation (Wave 0–3 in repo).  
**Bounded context:** Sales incentive accrual and payout simulation — **not** HR payroll.

## Summary

BU-scoped **IncentivePlan** versions drive deterministic **IncentiveRun** executions that emit immutable **IncentiveSnapshot** records with explain trees. Inputs: HR org graph, Sales Plan opportunity tiers, planning scenarios, and (future) CRM fact events. Outputs: layer/person/deal/period rollups with audit metadata.

## Global defaults

| Policy | Default |
|--------|---------|
| Tier keys | `tiny`, `standard`, `big`, `mega` (`OpportunityTierKey`) |
| Sales phases | `lead_gen`, `technical`, `financial`, `closing` (sum = 1) |
| Stacking (referral × tier × client) | `multiplicative_cap` |
| Deal pool basis | `percent_of_margin` when margin supplied, else `percent_of_deal_value` |
| Max payout | 15% of margin (BU-overridable per rule) |
| Payout cadence | Monthly accrual, quarterly cash pay (lag configurable per driver) |

## BU-configurable

- SAR tier thresholds (`OpportunityTierDefinition[]` on company)
- Rule rates, layer splits, role overrides
- Scorecard component weights and targets
- Payout driver schedules

## Wave boundaries

| Wave | Deliverable |
|------|-------------|
| 0 | This doc + `src/types/incentives.ts` |
| 1 | `evaluateIncentiveRun` + vitest (simulation-only) |
| 2–3 | `/sales-incentives` UI + scorecard bridge |
| 2a–3 (governance) | `EvaluateIncentiveRunOptions`, plan/run API stubs, explain UI, tier profile resolver, fact projector |
| 7 | `incentive_fact_events` contract + idempotent ingest |
| 8+ | CRM SoT, payroll export (out of scope here) |

## Governance operationalization (Wave 2a–3)

- **Engine v2** — Feature flags in `EvaluateIncentiveRunOptions` (`applyReserve`, `applyPhaseWeights`, `usePayoutDrivers`, etc.). All `false` preserves v1 totals; v2 records `engineVersion: 2` on snapshots.
- **Plans** — `GET/POST /api/incentives/plans`, `GET/PUT /api/incentives/plans/[id]` with in-memory tenant store (`src/server/incentives/incentive-store.ts`). Client: `useIncentivePlanStore`.
- **Runs & freeze** — `GET/POST /api/incentives/runs`, `GET/POST /api/incentives/freezes` (409 when period frozen).
- **Tiers** — `resolveOpportunityTierProfile` (service+bu → bu → company overlay → defaults); `demoOpportunityToIncentiveDeal(opp, company)`.
- **CRM seam** — `fact-to-deal-projector` projects `opportunity_created` / `order_signed` into `IncentiveDealInput`; `shadow_actual` run mode on `/sales-incentives`.
- **Reconciliation** — Compare `shadow_actual` snapshots to `simulation` by `inputHash` / period; freeze blocks rerun for BU+period.

## Integration boundaries

- **HR:** org + payroll cost — not payout SoT
- **Sales Plan:** quota / annual targets for scorecard
- **Planning scenarios:** simulation context only
- **Deal economics:** optional margin cap on pool
- **CRM (future):** opportunity lifecycle facts

## Code map

- Types: [`src/types/incentives.ts`](../src/types/incentives.ts), [`src/types/incentive-facts.ts`](../src/types/incentive-facts.ts)
- Engine: [`src/lib/incentives/`](../src/lib/incentives/)
- UI: [`src/app/[locale]/(dashboard)/sales-incentives/`](../src/app/[locale]/(dashboard)/sales-incentives/)
- Tier alignment: [`src/lib/planning/opportunity-tier-display.ts`](../src/lib/planning/opportunity-tier-display.ts)

## Design Studio (Design | Operate)

- **Design** tab: editable plan — HR indirect assignments, per-service tier bands (median/mean + force), referral rates by tier, layer matrix (tier × recognition driver), BD phase weights, scorecard components, manager team rule, governance.
- **Operate** tab: existing overview/forecast/mix/compare/explain/history plus **Scenario lab** (synthetic mix, attainment sliders, quarterly/half rollups, preset save).
- Engine v2 reads `referralRateByTier`, `layerMatrix`, `managerTeamRule`, `bdPhasePolicy`, and `participantAssignments` when derived options enable those flags.

## Production hardening (persistence + trust)

### Persistence (Supabase `013_incentive_operations.sql`)

| Table | Role |
|-------|------|
| `incentive_plans` | Mutable plan document per BU |
| `incentive_plan_versions` | Immutable approved versions |
| `incentive_runs` | Run metadata + `dedupe_key` unique per org |
| `incentive_snapshots` | Immutable `snapshot_json` per run |
| `incentive_payout_freezes` | Blocks rerun for BU+period |
| `incentive_override_audit` | Append-only override log |
| `incentive_simulator_presets` | Named mix presets |

Server: `persist-incentive-plan.ts`, `persist-incentive-run.ts` via `resolveHrCatalogSupabaseClient()`. Memory fallback in `incentive-store.ts` when Supabase is unavailable.

### Lifecycle

- Plan: `draft` → `approved` → `archived` (API: `/plans/[id]/approve`, `/archive`)
- Run: `draft_run` | `superseded` | `reconciled` (`run_lifecycle` on `IncentiveRunRecord`)
- Line payout: `IncentivePayoutLifecycleState` on snapshot lines

### Forecast bridge

`dealsFromForwardForecast` and `scorecardAttainmentFromEconomicsMeasures` consume `useEconomicsGraph` / forward forecast — no duplicate forecasting math in the incentive module.

### Operational warnings

Deterministic codes (`NP_EXPOSURE_HIGH`, `MEGA_CONCENTRATION`, etc.) in `operational-warnings.ts`, configurable via `plan.warningThresholds`.

See also [PROJECT-ARCHITECTURE-AUDIT.md](../PROJECT-ARCHITECTURE-AUDIT.md) Appendix G.
