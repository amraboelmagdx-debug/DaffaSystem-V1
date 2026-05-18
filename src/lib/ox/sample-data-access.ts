/** When true, sample-data panels stay visible even after linked units exist (dev/pilot). */
export function isSampleDataUxEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_ENABLE_SAMPLE_DATA === "true") return true;
  return process.env.NODE_ENV === "development";
}
