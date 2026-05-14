import type { CommercialMarginThresholds, PricingModelId, PricingModelSpec } from "./types";
import { DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS } from "./defaults";

export interface CommercialPricingPresetImportRow {
  pricingModelId?: string;
  /** JSON string for model-specific fields, e.g. {"markupPct":40} */
  modelParamsJson?: string;
  riskIdsCsv?: string;
  commercialScenarioId?: string;
  minGrossMarginPct?: string;
  minContributionMarginPct?: string;
  pricingSafetyContributionMarginPct?: string;
}

export interface CommercialPricingPresetImportIssue {
  rowIndex: number;
  field: keyof CommercialPricingPresetImportRow | "row";
  message: string;
}

export interface CommercialPricingPresetBundle {
  model: PricingModelSpec;
  riskIds: string[];
  commercialScenarioId: string;
  thresholds: CommercialMarginThresholds;
}

function parseModel(modelIdRaw: string, paramsJson: string): { ok: true; model: PricingModelSpec } | { ok: false; message: string } {
  const modelId = (modelIdRaw ?? "").trim() as PricingModelId;
  const allowed: PricingModelId[] = [
    "cost_plus",
    "value_based",
    "retainer_oriented",
    "strategic_account",
    "market_penetration",
    "premium_positioning",
  ];
  if (!allowed.includes(modelId)) {
    return { ok: false, message: `Unknown pricingModelId: ${modelIdRaw}` };
  }
  let extra: Record<string, unknown> = {};
  if (paramsJson?.trim()) {
    try {
      extra = JSON.parse(paramsJson) as Record<string, unknown>;
    } catch {
      return { ok: false, message: "modelParamsJson is not valid JSON" };
    }
  }
  switch (modelId) {
    case "cost_plus":
      return {
        ok: true,
        model: { modelId, markupPct: Number(extra.markupPct ?? 35) },
      };
    case "value_based":
      return {
        ok: true,
        model: { modelId, valueMultiplier: Number(extra.valueMultiplier ?? 1.35) },
      };
    case "retainer_oriented":
      return {
        ok: true,
        model: { modelId, coverageBufferPct: Number(extra.coverageBufferPct ?? 20) },
      };
    case "strategic_account":
      return {
        ok: true,
        model: {
          modelId,
          baseMarkupPct: Number(extra.baseMarkupPct ?? 30),
          relationshipDiscountPct: Number(extra.relationshipDiscountPct ?? 5),
        },
      };
    case "market_penetration":
      return {
        ok: true,
        model: { modelId, loadedToPriceMultiplier: Number(extra.loadedToPriceMultiplier ?? 1.1) },
      };
    case "premium_positioning":
      return {
        ok: true,
        model: { modelId, loadedToPriceMultiplier: Number(extra.loadedToPriceMultiplier ?? 1.5) },
      };
    default:
      return { ok: false, message: "Unsupported model" };
  }
}

/**
 * Single-row preview merge for pricing presets (future CSV/Excel row).
 */
export function buildCommercialPricingPresetImportPreview(
  row: CommercialPricingPresetImportRow
): { valid: boolean; issues: CommercialPricingPresetImportIssue[]; bundle?: CommercialPricingPresetBundle } {
  const issues: CommercialPricingPresetImportIssue[] = [];
  const rowIndex = 1;
  const mid = (row.pricingModelId ?? "").trim();
  if (!mid) issues.push({ rowIndex, field: "pricingModelId", message: "pricingModelId is required" });

  const parsed = parseModel(mid, row.modelParamsJson ?? "{}");
  if (!parsed.ok) issues.push({ rowIndex, field: "modelParamsJson", message: parsed.message });

  const scenarioId = (row.commercialScenarioId ?? "").trim();
  if (!scenarioId) issues.push({ rowIndex, field: "commercialScenarioId", message: "commercialScenarioId is required" });

  const riskIds = (row.riskIdsCsv ?? "")
    .split(/[,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  const num = (v: string | undefined, fallback: number) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : fallback;
  };

  const thresholds: CommercialMarginThresholds = {
    minGrossMarginPct: num(row.minGrossMarginPct, DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS.minGrossMarginPct),
    minContributionMarginPct: num(
      row.minContributionMarginPct,
      DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS.minContributionMarginPct
    ),
    pricingSafetyContributionMarginPct: num(
      row.pricingSafetyContributionMarginPct,
      DEFAULT_COMMERCIAL_MARGIN_THRESHOLDS.pricingSafetyContributionMarginPct
    ),
  };

  if (issues.length > 0 || !parsed.ok) {
    return { valid: false, issues };
  }

  return {
    valid: true,
    issues: [],
    bundle: {
      model: parsed.model,
      riskIds,
      commercialScenarioId: scenarioId,
      thresholds,
    },
  };
}
