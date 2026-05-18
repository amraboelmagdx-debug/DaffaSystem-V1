"use client";

import { useTranslations } from "next-intl";
import type {
  CommissionRateGridEntry,
  IncentiveLayerMatrixEntry,
  IncentivePlan,
} from "@/types/incentives";
import type { OpportunityTierKey } from "@/types/sales-plan";
import {
  OPPORTUNITY_TIER_KEYS,
  buildDefaultLayerMatrix,
  getCashSplitPct,
  getOrderSplitPct,
  setCashSplitPct,
  setOrderSplitPct,
  sumLayerMatrixForTier,
} from "@/lib/incentives/plan-matrix";
import { validateIncentivePlan } from "@/lib/incentives/validate-plan";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export function DesignCommissionsPanel({
  plan,
  onChange,
}: {
  plan: IncentivePlan;
  onChange: (patch: Partial<IncentivePlan>) => void;
}) {
  const t = useTranslations("incentives");
  const rateGrid = plan.commissionRateGrid ?? [];
  const referrerShare = plan.referrerShareOfCommission ?? 0.5;
  const errors = validateIncentivePlan(plan);

  const setReferrerShare = (pct: number) => {
    onChange({ referrerShareOfCommission: pct / 100 });
  };

  const patchMatrix = (next: IncentiveLayerMatrixEntry[]) => {
    onChange({ layerMatrix: next });
  };

  const resetMatrix = () => onChange({ layerMatrix: buildDefaultLayerMatrix(plan) });

  const upsertGridRow = (row: CommissionRateGridEntry) => {
    const rest = rateGrid.filter((r) => r.id !== row.id);
    onChange({ commissionRateGrid: [...rest, row] });
  };

  const addGridRow = () => {
    const layer = plan.layers.find((l) => l.key === "closer") ?? plan.layers[0];
    if (!layer) return;
    upsertGridRow({
      id: `grid-${Date.now()}`,
      tierKey: "standard",
      layerKey: layer.key,
      stage: "order",
      clientType: "new_client",
      referralDeal: false,
      pctRate: 0.4,
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-base">{t("designReferralPolicy")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">{t("designReferralPolicyHint")}</p>
          <div className="flex max-w-xs items-center gap-2">
            <Label className="text-xs">{t("referrerSharePct")}</Label>
            <input
              type="number"
              step={1}
              min={0}
              max={100}
              className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
              value={(referrerShare * 100).toFixed(0)}
              onChange={(e) => setReferrerShare(Number(e.target.value) || 0)}
            />
            <span className="text-[10px] text-muted-foreground">%</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("designLayerMatrix")}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={resetMatrix}>
            {t("resetMatrix")}
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 overflow-x-auto">
          {OPPORTUNITY_TIER_KEYS.map((tier) => (
            <div key={tier}>
              <div className="mb-2 flex items-center gap-2">
                <span className="text-sm font-medium capitalize">{tier}</span>
                <Badge variant="outline">
                  {t("matrixTierSum", {
                    pct: sumLayerMatrixForTier(plan, tier).toFixed(1),
                  })}
                </Badge>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50 text-muted-foreground">
                    <th className="py-1 text-start">{t("layer")}</th>
                    <th className="py-1 text-end">{t("commissions.order")}</th>
                    <th className="py-1 text-end">{t("commissions.cash")}</th>
                  </tr>
                </thead>
                <tbody>
                  {plan.layers
                    .filter((l) => l.key !== "referrer")
                    .map((layer) => (
                      <tr key={layer.id} className="border-b border-border/30">
                        <td className="py-2 pe-2">{layer.label}</td>
                        <td className="py-2 text-end">
                          <input
                            type="number"
                            step={0.1}
                            className="w-20 rounded border border-input px-1 py-0.5 text-end"
                            value={getOrderSplitPct(plan, layer.id, tier).toFixed(1)}
                            onChange={(e) =>
                              patchMatrix(
                                setOrderSplitPct(
                                  plan,
                                  layer.id,
                                  tier,
                                  Number(e.target.value) || 0
                                )
                              )
                            }
                          />
                        </td>
                        <td className="py-2 text-end">
                          <input
                            type="number"
                            step={0.1}
                            className="w-20 rounded border border-input px-1 py-0.5 text-end"
                            value={getCashSplitPct(plan, layer.id, tier).toFixed(1)}
                            onChange={(e) =>
                              patchMatrix(
                                setCashSplitPct(
                                  plan,
                                  layer.id,
                                  tier,
                                  Number(e.target.value) || 0
                                )
                              )
                            }
                          />
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base">{t("commissions.rateTableTitle")}</CardTitle>
          <Button type="button" size="sm" variant="outline" onClick={addGridRow}>
            {t("commissions.addRateRow")}
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <p className="mb-3 text-xs text-muted-foreground">{t("commissions.rateTableHint")}</p>
          {rateGrid.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("commissions.rateTableEmpty")}</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/50 text-muted-foreground">
                  <th className="py-1">{t("tier")}</th>
                  <th className="py-1">{t("layer")}</th>
                  <th className="py-1">{t("commissions.stage")}</th>
                  <th className="py-1">{t("commissions.client")}</th>
                  <th className="py-1">{t("referral")}</th>
                  <th className="py-1 text-end">%</th>
                  <th className="py-1 text-end">SAR</th>
                </tr>
              </thead>
              <tbody>
                {rateGrid.map((row) => (
                  <tr key={row.id} className="border-b border-border/30">
                    <td className="py-1">
                      <select
                        className="rounded border border-input bg-background px-1"
                        value={row.tierKey}
                        onChange={(e) =>
                          upsertGridRow({
                            ...row,
                            tierKey: e.target.value as OpportunityTierKey,
                          })
                        }
                      >
                        {OPPORTUNITY_TIER_KEYS.map((tk) => (
                          <option key={tk} value={tk}>
                            {tk}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <select
                        className="rounded border border-input bg-background px-1"
                        value={row.layerKey}
                        onChange={(e) => upsertGridRow({ ...row, layerKey: e.target.value })}
                      >
                        {plan.layers.map((l) => (
                          <option key={l.id} value={l.key}>
                            {l.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-1">
                      <select
                        className="rounded border border-input bg-background px-1"
                        value={row.stage}
                        onChange={(e) =>
                          upsertGridRow({
                            ...row,
                            stage: e.target.value as CommissionRateGridEntry["stage"],
                          })
                        }
                      >
                        <option value="order">{t("commissions.order")}</option>
                        <option value="cash">{t("commissions.cash")}</option>
                      </select>
                    </td>
                    <td className="py-1">
                      <select
                        className="rounded border border-input bg-background px-1"
                        value={row.clientType}
                        onChange={(e) =>
                          upsertGridRow({
                            ...row,
                            clientType: e.target.value as CommissionRateGridEntry["clientType"],
                          })
                        }
                      >
                        <option value="new_client">{t("commissions.clientNew")}</option>
                        <option value="existing_client">{t("commissions.clientExisting")}</option>
                      </select>
                    </td>
                    <td className="py-1 text-center">
                      <input
                        type="checkbox"
                        checked={row.referralDeal}
                        onChange={(e) =>
                          upsertGridRow({ ...row, referralDeal: e.target.checked })
                        }
                      />
                    </td>
                    <td className="py-1 text-end">
                      <input
                        type="number"
                        step={0.01}
                        className="w-16 rounded border border-input px-1 text-end"
                        value={row.pctRate ?? ""}
                        onChange={(e) =>
                          upsertGridRow({
                            ...row,
                            pctRate: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </td>
                    <td className="py-1 text-end">
                      <input
                        type="number"
                        className="w-20 rounded border border-input px-1 text-end"
                        value={row.fixedAmountSar ?? ""}
                        onChange={(e) =>
                          upsertGridRow({
                            ...row,
                            fixedAmountSar: e.target.value ? Number(e.target.value) : undefined,
                          })
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {errors.length ? (
        <p className="text-sm text-destructive">{errors.join(" · ")}</p>
      ) : (
        <p className="text-xs text-muted-foreground">{t("planValid")}</p>
      )}
    </div>
  );
}
