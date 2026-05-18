import { z } from "zod";

const salesPhaseWeightsSchema = z.object({
  lead_gen: z.number(),
  technical: z.number(),
  financial: z.number(),
  closing: z.number(),
});

export const incentivePlanSchema = z.object({
  id: z.string().min(1),
  organizationId: z.string().min(1),
  hrBusinessUnitId: z.string().min(1),
  companyId: z.string().optional(),
  version: z.number().int().positive(),
  status: z.enum(["draft", "active", "approved", "archived", "retired"]),
  name: z.string().min(1),
  currency: z.string().min(1),
  effectiveFrom: z.string(),
  effectiveTo: z.string().nullable().optional(),
  stackingPolicy: z.enum(["additive", "max_of", "multiplicative_cap"]),
  reservePct: z.number(),
  layers: z.array(z.record(z.unknown())),
  rules: z.array(z.record(z.unknown())),
  roleOverrides: z.array(z.record(z.unknown())),
  scorecard: z.record(z.unknown()),
  payoutDrivers: z.array(z.record(z.unknown())),
  revision: z.number().int(),
  approvedAt: z.string().nullable().optional(),
  approvedBy: z.string().nullable().optional(),
  governance: z.record(z.unknown()).optional(),
  stackingRules: z.record(z.unknown()).optional(),
  participantAssignments: z.array(z.record(z.unknown())).optional(),
  warningThresholds: z.record(z.unknown()).optional(),
});

export const incentiveSnapshotSchema = z.object({
  contractVersion: z.number(),
  engineVersion: z.number(),
  planId: z.string(),
  planVersion: z.number(),
  mode: z.enum(["simulation", "shadow_actual", "approved_payout"]),
  periodYear: z.number(),
  lines: z.array(z.record(z.unknown())),
  explainLines: z.array(z.record(z.unknown())),
  byLayer: z.record(z.number()),
  byParticipant: z.record(z.number()),
  byDeal: z.record(z.number()),
  companyTotalSar: z.number(),
  companyRetainedSar: z.number(),
  quarterly: z.array(z.record(z.unknown())),
  semiannual: z.array(z.record(z.unknown())),
  annual: z.record(z.unknown()),
  warnings: z.array(z.string()),
  optionsUsed: z.record(z.unknown()).optional(),
});

export const incentiveRunRecordSchema = z.object({
  id: z.string().min(1),
  planId: z.string().min(1),
  planVersion: z.number().int(),
  mode: z.enum(["simulation", "shadow_actual", "approved_payout"]),
  periodYear: z.number().int(),
  inputHash: z.string().min(1),
  runLifecycle: z
    .enum(["draft_run", "pending_approval", "approved", "superseded", "reconciled"])
    .optional(),
  lifecycle: z
    .enum([
      "accrued",
      "pending_approval",
      "approved",
      "scheduled",
      "paid",
      "frozen",
      "reversed",
    ])
    .optional(),
  frozenAt: z.string().nullable().optional(),
  supersedesRunId: z.string().nullable().optional(),
  dedupeKey: z.string().optional(),
  createdAt: z.string(),
  snapshot: incentiveSnapshotSchema,
});

export const simulatorPresetSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  count: z.number().int().min(1).max(50),
  referralPct: z.number().min(0).max(1),
  newClientPct: z.number().min(0).max(1),
  tierMix: z.record(z.number()),
});

export { salesPhaseWeightsSchema };
