/** Stable local ids for service-architecture entities. */
export function newServiceId(prefix = "svc"): string {
  const uuid =
    typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto
      ? globalThis.crypto.randomUUID()
      : `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  return `${prefix}_${uuid}`;
}

