"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";
import { echarts } from "@/components/hr-workforce/hr-workforce-echarts-core";
import type { NamedCount } from "@/lib/hr-workforce/intelligence";

type ThemeMode = "light" | "dark";

function chartColors(mode: ThemeMode) {
  const isDark = mode === "dark";
  return {
    text: isDark ? "#fafafa" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    split: isDark ? "#1e293b" : "#f1f5f9",
    primary: isDark ? "#38bdf8" : "#0284c7",
    track: isDark ? "rgba(148,163,184,0.12)" : "rgba(15,23,42,0.06)",
  };
}

export function IntelligenceOrgDistributionChart({
  rows,
  theme,
  isRtl,
  fmtNum,
  seriesLabel,
  emptyHint,
}: {
  rows: NamedCount[];
  theme: ThemeMode;
  isRtl: boolean;
  fmtNum: (n: number, digits?: number) => string;
  seriesLabel: string;
  emptyHint: string;
}) {
  const c = useMemo(() => chartColors(theme), [theme]);

  const option: EChartsOption = useMemo(() => {
    const slice = [...rows].sort((a, b) => b.count - a.count).slice(0, 12);
    const names = slice.map((r) => r.name);
    const counts = slice.map((r) => r.count);
    const labelMax = Math.max(8, ...names.map((n) => n.length));
    const leftGutter = Math.min(160, 56 + labelMax * 5.5);

    if (!slice.length || counts.every((x) => x <= 0)) {
      return {
        graphic: {
          type: "text",
          left: "center",
          top: "middle",
          style: {
            text: emptyHint,
            fill: c.muted,
            fontSize: 13,
            fontWeight: 400,
            width: 260,
            overflow: "break",
          },
        },
      };
    }

    const max = Math.max(...counts, 1);

    return {
      grid: {
        left: isRtl ? 48 : leftGutter,
        right: isRtl ? leftGutter : 44,
        top: 4,
        bottom: 4,
        containLabel: false,
      },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex?: number };
          const i = p0?.dataIndex ?? 0;
          const row = slice[i];
          if (!row) return "";
          return `<div style="font-weight:600;margin-bottom:4px">${row.name}</div><div>${seriesLabel}: <b>${fmtNum(row.count, 0)}</b></div>`;
        },
      },
      xAxis: {
        type: "value",
        max: max * 1.08,
        splitLine: { lineStyle: { color: c.split, type: "dashed" } },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: { color: c.muted, fontSize: 11 },
      },
      yAxis: {
        type: "category",
        data: names,
        inverse: true,
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          color: c.muted,
          fontSize: 11,
          width: leftGutter - 16,
          overflow: "truncate",
          ellipsis: "…",
        },
      },
      series: [
        {
          name: seriesLabel,
          type: "bar",
          data: counts,
          barMaxWidth: 26,
          itemStyle: {
            borderRadius: isRtl ? [4, 0, 0, 4] : [0, 4, 4, 0],
            color: {
              type: "linear",
              x: 0,
              y: 0,
              x2: 1,
              y2: 0,
              colorStops: [
                { offset: 0, color: theme === "dark" ? "#0e7490" : "#bae6fd" },
                { offset: 1, color: c.primary },
              ],
            },
          },
          showBackground: true,
          backgroundStyle: { color: c.track, borderRadius: isRtl ? [4, 0, 0, 4] : [0, 4, 4, 0] },
          label: {
            show: true,
            position: isRtl ? "left" : "right",
            color: c.text,
            fontSize: 11,
            formatter: (p: unknown) => {
              const v = typeof p === "object" && p !== null && "value" in p ? Number((p as { value: number }).value) : 0;
              return fmtNum(v, 0);
            },
          },
        },
      ],
    };
  }, [rows, c, theme, isRtl, fmtNum, seriesLabel, emptyHint]);

  return (
    <ReactECharts
      echarts={echarts}
      option={option}
      style={{ height: 280, width: "100%" }}
      className="min-h-[240px] w-full sm:min-h-[260px]"
      notMerge
      lazyUpdate
    />
  );
}
