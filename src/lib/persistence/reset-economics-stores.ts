import { getImportSliceResetPayload } from "@/stores/hr-workforce/slices/hr-import-slice";
import { useHrWorkforceStore } from "@/stores/use-hr-workforce-store";

/**
 * Clears ephemeral import/session fields before tenant rehydrate.
 * Catalog arrays are replaced by `persist.rehydrate()` — do not wipe them here or the UI
 * can render with empty BUs/OH between clear and rehydrate (dashboard crash).
 */
export function clearInMemoryEconomicsBleed(): void {
  useHrWorkforceStore.setState({
    lastSnapshotRestoreError: null,
    ...getImportSliceResetPayload(),
  });
}
