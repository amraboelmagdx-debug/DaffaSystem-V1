/**
 * Serializes tenant economics hydration (Strict Mode double effects, parallel mounts).
 * Prevents overlapping prepare/finish/bootstrap pipelines that deadlock on shared flush chains.
 */
let hydrationTail: Promise<void> = Promise.resolve();

export async function coalesceEconomicsHydration(
  _orgId: string,
  run: () => Promise<void>
): Promise<void> {
  const task = hydrationTail.then(
    () => run(),
    () => run()
  );
  hydrationTail = task.then(
    () => undefined,
    () => undefined
  );
  await task;
}
