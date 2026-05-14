# Service Architecture Import Foundation

This module includes import-ready, pure TypeScript helpers in `src/lib/service-architecture/import-plan.ts`.

## Scope

- Validates row-shaped input (`ServiceCatalogImportRow[]`)
- Produces normalized rows (trim/uppercase code normalization)
- Deduplicates entities by stable codes where available
- Returns preview totals before any store mutation
- Builds a plan payload that can be applied later by UI or API layers

## Current flow

1. Validate required fields for each row.
2. Normalize all code/name/business-unit values.
3. Build in-memory entities:
   - `ServiceFamily`
   - `ServiceTier`
   - `ServiceTemplate`
   - `ServiceTemplateTier`
   - `DeliveryPhase`
   - `ServiceTemplateTierPhase`
   - `ServiceDeliverable`
4. Return:
   - `valid`
   - `issues`
   - `preview`
   - `normalizedRows`
   - `plan`

## Notes

- No Excel upload UI is required in this phase.
- The function is import-pipeline friendly and side-effect free.
- Future UI can consume this for **validate → preview → normalize** workflows.

