# HR workforce store — import / importLogs slice (PR notes)

## Scope (this PR)

### Included in `createHrImportSlice`

| Responsibility | Notes |
|----------------|--------|
| `importLogs` + `pushImportLog` / `deleteImportLog` / `clearAllImportLogs` | Same behavior as before (cap 100 logs). |
| Import **session** state (ephemeral) | `importSessionFileName`, `headers`, `rows`, `columnMap`, `errors`, `plan`, `importSessionLastDryRunAt`. |
| `importSessionLoadParsed` | Called after client-side workbook parse (keeps `xlsx` parsing out of the store). |
| `importSessionSetColumnMapping` | Column picker updates. |
| `importSessionRunDryRun` | Runs pure `buildImportPlan` using **current** `businessUnits` / `departments` / `teams` / `defaultCurrency` from the same flat store via `get()` — orchestration read, not a second store mutating another slice. |
| `importSessionClearAfterSuccessfulCommit` | Clears session after successful commit. |
| `getImportSliceResetPayload` | Used by `resetModule` to clear logs + session in one object spread. |

### Explicitly **not** moved (orchestration / core)

- `applyImportDeltas` — still mutates structure, roles, and OH maps in `use-hr-workforce-store.ts`.
- Workbook parsing (`parseWorkbookFirstSheet`) — remains in the import view (I/O + heavy deps).
- Entity merge / normalization beyond `buildImportPlan` output — unchanged.

## Dependency notes

- `hr-import-slice.ts` imports `buildImportPlan` from `@/lib/hr-workforce/import-dry-run` (pure).
- `importSessionRunDryRun` reads org state from `get()`; **no** direct imports from `hr-snapshot-slice` or future structure slice files — avoids slice-to-slice module coupling.

## Persistence impact

- **`partialize` unchanged:** only `importLogs` is persisted (same key `efp-hr-workforce`).
- **Session fields are never persisted** (large `rows`, transient UI). Reload always starts with empty import session.
- **`merge`:** unchanged; persisted partial state still has no import session keys, so defaults from `create()` remain after rehydrate.

## Rerender / selector observations

- `HrWorkforceImportView` uses **multiple** `useHrWorkforceStore((s) => s.x)` selectors so edits to unrelated HR fields (e.g. roles grid elsewhere) do not necessarily rerender the import screen.
- **Trade-off:** stable action references are fine in Zustand; if we later see subscription churn, consider `useShallow` for a grouped `{ fileName, headers, rows, ... }` selector.

## Selector duplication findings

- None new beyond existing patterns. Import view no longer reads `businessUnits` / `departments` / `teams` for dry-run (slice reads via `get()` inside `importSessionRunDryRun`), reducing duplicate selectors in that component.

## Tests

- `src/stores/hr-workforce/slices/hr-import-slice.test.ts` — reset payload shape.
- Full `vitest run` expected green.
