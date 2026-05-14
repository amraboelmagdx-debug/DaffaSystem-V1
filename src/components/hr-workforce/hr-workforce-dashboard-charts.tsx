"use client";

import { useMemo } from "react";
import ReactECharts from "echarts-for-react/lib/core";
import type { EChartsOption } from "echarts";
import { echarts } from "./hr-workforce-echarts-core";

type ThemeMode = "light" | "dark";

function chartColors(mode: ThemeMode) {
  const isDark = mode === "dark";
  return {
    text: isDark ? "#fafafa" : "#0f172a",
    muted: isDark ? "#94a3b8" : "#64748b",
    border: isDark ? "#334155" : "#e2e8f0",
    split: isDark ? "#1e293b" : "#f1f5f9",
    primary: isDark ? "#38bdf8" : "#0284c7",
    accent: isDark ? "#a78bfa" : "#7c3aed",
    warn: isDark ? "#fbbf24" : "#d97706",
    teal: isDark ? "#2dd4bf" : "#0d9488",
  };
}

export type HrDashChartLabels = {
  seriesMonthlyCost: string;
  seriesOhRate: string;
  seriesHeadcount: string;
  seriesBillableHrsYr: string;
  seriesEffFte: string;
  seriesStdHr: string;
  seriesOhAdjHr: string;
  snapshotSeries: string;
};

export type HrDashDeptRow = { name: string; cost: number; headcount: number };
export type HrDashUtilRow = {
  u: string;
  rate: number;
  billableHrsYr: number;
  effFte: number;
};
export type HrDashRoleRow = { name: string; monthly: number; stdHr: number; ohAdjHr: number };
export type HrDashTrendRow = { label: string; monthly: number };

type Props = {
  theme: ThemeMode;
  isRtl: boolean;
  fmtMoney: (n: number) => string;
  fmtNum: (n: number, digits?: number) => string;
  labels: HrDashChartLabels;
  deptData: HrDashDeptRow[];
  utilData: HrDashUtilRow[];
  rolesData: HrDashRoleRow[];
  trendData: HrDashTrendRow[];
  emptyDeptHint: string;
  emptyRolesHint: string;
  emptyTrendHint: string;
};

export function HrWorkforceDashboardCharts({
  theme,
  isRtl,
  fmtMoney,
  fmtNum,
  labels,
  deptData,
  utilData,
  rolesData,
  trendData,
  emptyDeptHint,
  emptyRolesHint,
  emptyTrendHint,
}: Props) {
  const c = useMemo(() => chartColors(theme), [theme]);

  const deptOption: EChartsOption = useMemo(() => {
    const names = deptData.map((d) => d.name);
    const costs = deptData.map((d) => d.cost);
    return {
      grid: { left: isRtl ? 72 : 8, right: isRtl ? 8 : 72, top: 16, bottom: 28 },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex: number };
          const i = p0?.dataIndex ?? 0;
          const row = deptData[i];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:6px">${row.name}</div>`,
            `<div>${labels.seriesMonthlyCost}: <b>${fmtMoney(row.cost)}</b></div>`,
            `<div>${labels.seriesHeadcount}: <b>${fmtNum(row.headcount, 0)}</b></div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "value",
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.split } },
        axisLabel: { color: c.muted, formatter: (v: number) => fmtMoney(v) },
      },
      yAxis: {
        type: "category",
        data: names,
        inverse: !isRtl,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.muted, width: 96, overflow: "truncate" },
      },
      series: [
        {
          name: labels.seriesMonthlyCost,
          type: "bar",
          data: costs,
          barMaxWidth: 22,
          itemStyle: {
            color: c.primary,
            borderRadius: isRtl ? [6, 0, 0, 6] : [0, 6, 6, 0],
          },
        },
      ],
    };
  }, [c, deptData, fmtMoney, fmtNum, isRtl, labels, theme]);

  const utilOption: EChartsOption = useMemo(() => {
    const xs = utilData.map((d) => d.u);
    const rates = utilData.map((d) => d.rate);
    return {
      grid: { left: 56, right: 16, top: 20, bottom: 28 },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex: number };
          const i = p0?.dataIndex ?? 0;
          const row = utilData[i];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:6px">${row.u}</div>`,
            `<div>${labels.seriesOhRate}: <b>${fmtMoney(row.rate)}</b> / hr</div>`,
            `<div>${labels.seriesBillableHrsYr}: <b>${fmtNum(row.billableHrsYr, 0)}</b></div>`,
            `<div>${labels.seriesEffFte}: <b>${fmtNum(row.effFte, 0)}</b></div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: xs,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.muted },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.split } },
        axisLabel: { color: c.muted, formatter: (v: number) => fmtMoney(v) },
      },
      series: [
        {
          name: labels.seriesOhRate,
          type: "line",
          smooth: true,
          symbolSize: 8,
          data: rates,
          lineStyle: { width: 3, color: c.accent },
          areaStyle: { color: `${c.accent}40` },
          itemStyle: { color: c.accent, borderColor: c.text, borderWidth: 1 },
        },
      ],
    };
  }, [c, fmtMoney, fmtNum, labels, theme, utilData]);

  const rolesOption: EChartsOption = useMemo(() => {
    if (rolesData.length === 0) {
      return {
        title: {
          text: emptyRolesHint,
          left: "center",
          top: "center",
          textStyle: { color: c.muted, fontSize: 13, fontWeight: 400 },
        },
        series: [],
      };
    }
    const names = rolesData.map((r) => r.name);
    const monthly = rolesData.map((r) => r.monthly);
    return {
      grid: { left: 52, right: 8, top: 12, bottom: 56 },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex: number };
          const i = p0?.dataIndex ?? 0;
          const row = rolesData[i];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:6px">${row.name}</div>`,
            `<div>${labels.seriesMonthlyCost}: <b>${fmtMoney(row.monthly)}</b></div>`,
            `<div>${labels.seriesStdHr}: <b>${fmtMoney(row.stdHr)}</b> / hr</div>`,
            `<div>${labels.seriesOhAdjHr}: <b>${fmtMoney(row.ohAdjHr)}</b> / hr</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.muted, rotate: 28, interval: 0, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.split } },
        axisLabel: { color: c.muted, formatter: (v: number) => fmtMoney(v) },
      },
      series: [
        {
          name: labels.seriesMonthlyCost,
          type: "bar",
          data: monthly,
          barMaxWidth: 36,
          itemStyle: {
            color: c.warn,
            borderRadius: [6, 6, 0, 0],
          },
        },
      ],
    };
  }, [c, emptyRolesHint, fmtMoney, labels, rolesData, theme]);

  const trendOption: EChartsOption = useMemo(() => {
    if (trendData.length === 0) {
      return {
        title: {
          text: emptyTrendHint,
          left: "center",
          top: "center",
          textStyle: { color: c.muted, fontSize: 13, fontWeight: 400 },
        },
        series: [],
      };
    }
    const labelsX = trendData.map((d) => d.label);
    const vals = trendData.map((d) => d.monthly);
    return {
      grid: { left: 52, right: 8, top: 12, bottom: 28 },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex: number };
          const i = p0?.dataIndex ?? 0;
          const row = trendData[i];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:6px">${row.label}</div>`,
            `<div>${labels.snapshotSeries}: <b>${fmtMoney(row.monthly)}</b></div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: labelsX,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: { color: c.muted, fontSize: 10 },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.split } },
        axisLabel: { color: c.muted, formatter: (v: number) => fmtMoney(v) },
      },
      series: [
        {
          name: labels.snapshotSeries,
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: vals,
          lineStyle: { width: 2.5, color: c.teal },
          itemStyle: { color: c.teal, borderColor: c.text, borderWidth: 1 },
        },
      ],
    };
  }, [c, emptyTrendHint, fmtMoney, labels, trendData, theme]);

  const box = (h: number) =>
    ({ height: h, width: "100%" } as const);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="h-72 min-h-[260px] w-full">
          {deptData.length === 0 ? (
            <div className="flex h-full min-h-[260px] items-center justify-center rounded-lg border border-dashed border-border/60 bg-muted/20 p-4 text-center text-sm text-muted-foreground">
              {emptyDeptHint}
            </div>
          ) : (
            <ReactECharts
              echarts={echarts}
              option={deptOption}
              style={box(288)}
              opts={{ renderer: "canvas" }}
              notMerge
              lazyUpdate
            />
          )}
        </div>
        <div className="h-72 min-h-[260px] w-full">
          <ReactECharts
            echarts={echarts}
            option={utilOption}
            style={box(288)}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
        <div className="h-56 min-h-[220px] w-full lg:col-span-1">
          <ReactECharts
            echarts={echarts}
            option={rolesOption}
            style={box(220)}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
        <div className="h-56 min-h-[220px] w-full lg:col-span-1">
          <ReactECharts
            echarts={echarts}
            option={trendOption}
            style={box(220)}
            opts={{ renderer: "canvas" }}
            notMerge
            lazyUpdate
          />
        </div>
      </div>
    </div>
  );
}

export type HrWorkforceBuOhCompareChartProps = {
  theme: ThemeMode;
  fmtMoney: (n: number) => string;
  labels: HrDashChartLabels;
  buRateData: { name: string; rate: number }[];
};

/** Cross-unit OH $/hr comparison; render null when fewer than two units. */
export function HrWorkforceBuOhCompareChart({
  theme,
  fmtMoney,
  labels,
  buRateData,
}: HrWorkforceBuOhCompareChartProps) {
  const c = useMemo(() => chartColors(theme), [theme]);

  const buBarOption: EChartsOption = useMemo(() => {
    const names = buRateData.map((d) => d.name);
    const rates = buRateData.map((d) => d.rate);
    return {
      grid: { left: 48, right: 16, top: 16, bottom: 28 },
      textStyle: { fontFamily: "inherit", color: c.text },
      tooltip: {
        trigger: "axis",
        axisPointer: { type: "shadow" },
        backgroundColor: theme === "dark" ? "rgba(15,23,42,0.94)" : "rgba(255,255,255,0.96)",
        borderColor: c.border,
        textStyle: { color: c.text, fontSize: 12 },
        formatter: (params: unknown) => {
          const arr = Array.isArray(params) ? params : [params];
          const p0 = arr[0] as { dataIndex: number };
          const i = p0?.dataIndex ?? 0;
          const row = buRateData[i];
          if (!row) return "";
          return [
            `<div style="font-weight:600;margin-bottom:6px">${row.name}</div>`,
            `<div>${labels.seriesOhRate}: <b>${fmtMoney(row.rate)}</b> / hr</div>`,
          ].join("");
        },
      },
      xAxis: {
        type: "category",
        data: names,
        axisLine: { lineStyle: { color: c.border } },
        axisLabel: {
          color: c.muted,
          interval: 0,
          rotate: names.some((n) => n.length > 14) ? 22 : 0,
        },
      },
      yAxis: {
        type: "value",
        axisLine: { lineStyle: { color: c.border } },
        splitLine: { lineStyle: { color: c.split } },
        axisLabel: { color: c.muted, formatter: (v: number) => fmtMoney(v) },
      },
      series: [
        {
          type: "bar",
          data: rates,
          barMaxWidth: 48,
          itemStyle: { color: c.teal, borderRadius: [6, 6, 0, 0] },
        },
      ],
    };
  }, [buRateData, c, fmtMoney, labels, theme]);

  if (buRateData.length <= 1) return null;

  const box = { height: 208, width: "100%" } as const;

  return (
    <div className="h-52 min-h-[200px] w-full">
      <ReactECharts
        echarts={echarts}
        option={buBarOption}
        style={box}
        opts={{ renderer: "canvas" }}
        notMerge
        lazyUpdate
      />
    </div>
  );
}
