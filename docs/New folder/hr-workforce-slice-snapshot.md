# HR workforce store — snapshot slice extraction (PR notes)

## Before / after responsibility

| Area | Before | After |
|------|--------|--------|
| Snapshot list + meta + JSON payloads | Inline in `use-hr-workforce-store.ts` | `createHrSnapshotSlice` in `src/stores/hr-workforce/slices/hr-snapshot-slice.ts` |
| Parse / migrate snapshot JSON (v1→v2, version defaults) | Same store file | `parseHrSnapshotPayload` in `src/lib/hr-workforce/snapshot-payload.ts` (pure lib) |
| OH/HR persist migrations shared by rehydrate + snapshot parse | Duplicated in store | `src/lib/hr-workforce/hr-workforce-persist-migrate.ts` |
| Full store TypeScript contract | Local `interface` in store | `src/stores/hr-workforce/hr-workforce-store-types.ts` |

Public API: `useHrWorkforceStore.getState().{saveSnapshot,restoreSnapshot,...}` unchanged. Re-exports: `parseHrSnapshotPayload`, `HrSnapshotRecord`, `HrSnapshotCompareResult`, `DEFAULT_HR_SETTINGS` remain available from `@/stores/use-hr-workforce-store` for backward compatibility.

## Persistence impact

- **None.** `partialize` still persists `snapshots` only; `lastSnapshotRestoreError` remains session-only (not in `partialize`).
- `merge` / `normalizePersistedState` unchanged in behavior; still reads `snapshots` from persisted partial state.
- `efp-hr-workforce` storage key unchanged.

## Rerender risk

- **Low.** Zustand store shape and selector keys are identical; components still subscribe with `useHrWorkforceStore((s) => s.snapshots)` etc.
- Object merge order: `...createHrSnapshotSlice(set, get, store)` is spread **before** core fields so core `businessUnits` / `roles` seeds do not override slice actions (no key overlap on conflicting initial state).

## Migration notes

- Callers may import `parseHrSnapshotPayload` from `@/lib/hr-workforce/snapshot-payload` directly (preferred for new code). Store re-export remains for existing imports.
- `DEFAULT_HR_SETTINGS` canonical definition moved to `hr-workforce-persist-migrate.ts`; store re-exports it.

## Tests

- Existing: `snapshot-restore.test.ts`, `snapshot-roundtrip.test.ts` (updated import path to `snapshot-payload`).
- Full `vitest run` green after extraction.

## Findings during extraction (for follow-up)

1. **`compareSnapshots`** runs `deriveWorkspaceProjection` twice in one call — acceptable for rare UX; if compare becomes hot, memoize per parsed payload id.
2. **`restoreSnapshot`** intentionally mutates org + roles + OH map outside the “slice” state keys — documented coupling until a future transactional boundary or command pattern.
3. **Repeated pattern:** any view that only needs `snapshots.length` or latest snapshot should use a narrow selector to avoid coupling to unrelated store updates (next performance pass).
