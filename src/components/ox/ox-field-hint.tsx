"use client";

import { InsightBulb } from "@/components/planning/insight-bulb";

/** Inline operational hint — executive-friendly copy passed from parent or i18n. */
export function OxFieldHint({
  label,
  description,
  wide,
}: {
  label: string;
  description: string;
  wide?: boolean;
}) {
  return <InsightBulb label={label} description={description} wide={wide} />;
}
