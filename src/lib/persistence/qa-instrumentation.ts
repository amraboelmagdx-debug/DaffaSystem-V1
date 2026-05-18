/** Dev + staging QA panel, persistence truth, and pilot banners. */
export function isQaInstrumentationEnabled(): boolean {
  if (process.env.NEXT_PUBLIC_SHOW_QA_PANEL === "true") return true;
  return process.env.NODE_ENV === "development";
}
