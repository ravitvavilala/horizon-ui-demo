"use client";

/**
 * Phase 6 client detail - built on shadcn `/charts` registry defaults.
 *
 * Chart inventory matches shadcn /charts exactly:
 *   - Line Chart - Multiple  → Revenue + Gross Margin trend (12 months)
 *   - Pie Chart - Donut w/ Text  → AR composition (Received vs Outstanding)
 *   - Area Chart - Gradient  → Revenue vs Expense stacked over the year
 *
 * Same data drives all three; three lenses on the analysis.
 */

/**
 * Refactored 2026-05-20 per CFO + accounting/sales feedback:
 *   - Line charts removed (teams reported they couldn't tell X/Y at a glance).
 *   - Cross-year lifetime trend removed (CFO directive: YTD only, no
 *     yearly analysis).
 *   - Monthly views now use grouped/stacked bar charts with explicit
 *     YAxis labels so X = month, Y = dollars is unambiguous.
 *   - Year selector replaced with static "YTD <year>" badge upstream.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Label,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import { TrendingDown, TrendingUp } from "lucide-react";

import { api } from "@/lib/api";
import { COMPANY_LABELS } from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

type TrendMetric = "margin_pct" | "revenue" | "gross_margin" | "expense";

const trendMeta: Record<
  TrendMetric,
  { label: string; color: string; format: (v: number) => string; unit: string }
> = {
  margin_pct: {
    label: "Margin %",
    color: "var(--chart-2)",
    format: (v) => `${v.toFixed(1)}%`,
    unit: "Percent",
  },
  revenue: {
    label: "Revenue",
    color: "var(--chart-1)",
    format: (v) => formatMoney(v),
    unit: "Dollars (USD)",
  },
  gross_margin: {
    label: "Gross Margin",
    color: "var(--chart-3)",
    format: (v) => formatMoney(v),
    unit: "Dollars (USD)",
  },
  expense: {
    label: "COGS",
    color: "var(--chart-5)",
    format: (v) => formatMoney(v),
    unit: "Dollars (USD)",
  },
};

const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthTick = (v: string) => MON3[Number(v.slice(5, 7)) - 1] ?? v.slice(5);
const monthYearTick = (v: string) => `${MON3[Number(v.slice(5, 7)) - 1] ?? ""} ${v.slice(2, 4)}`;

const COMPANY_LABEL = COMPANY_LABELS;

const monthlyBarConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expense: { label: "COGS", color: "var(--chart-3)" },
  gross_margin: { label: "Gross Margin", color: "var(--chart-2)" },
} satisfies ChartConfig;

const pieConfig = {
  amount: { label: "Amount" },
  received: { label: "Received", color: "var(--chart-2)" },
  outstanding: { label: "Outstanding", color: "var(--chart-4)" },
} satisfies ChartConfig;

// Compact $ axis labels: 1,234,567 → $1.2M, 42,500 → $42K
const yAxisDollarTick = (v: number) => compactMoneyTick(v);

function formatMonth(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "long" });
}

export function ClientDetail({ masterId }: { masterId: string }) {
  const company = useDashboardStore((s) => s.company);
  const storeYear = useDashboardStore((s) => s.year);

  // Page-level year - single dropdown at the top drives every card on the
  // page (KPIs, monthly bars, monthly table, AR, client-trend line). User
  // requested 2026-05-20: per-year detail view, not YTD-only.
  const [year, setYear] = React.useState<number>(storeYear);
  const [trendMetric, setTrendMetric] =
    React.useState<TrendMetric>("margin_pct");

  const { data: yearsList } = useQuery({
    queryKey: ["company-years", company],
    queryFn: () => api.getCompanyYears(company),
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["client-detail", company, masterId, year],
    queryFn: () => api.getCompanyClientDetail(company, masterId, year),
  });


  const trendRows = React.useMemo(() => {
    return (data?.monthly ?? []).map((m) => ({
      label: m.period_month.slice(0, 7),
      month: formatMonth(m.period_month),
      margin_pct: m.margin_pct,
      revenue: m.revenue,
      expense: m.expense,
      gross_margin: m.gross_margin,
    }));
  }, [data]);

  const trendDelta = React.useMemo(() => {
    if (trendRows.length < 4) return null;
    const half = Math.floor(trendRows.length / 2);
    const recent = trendRows.slice(-half);
    const prior = trendRows.slice(0, half);
    const rAvg = recent.reduce((s, r) => s + r[trendMetric], 0) / recent.length;
    const pAvg = prior.reduce((s, r) => s + r[trendMetric], 0) / prior.length;
    const delta = rAvg - pAvg;
    const pct = Math.abs(pAvg) > 0.001 ? (delta / Math.abs(pAvg)) * 100 : 0;
    return { rAvg, pAvg, delta, pct };
  }, [trendRows, trendMetric]);

  const monthly = React.useMemo(
    () =>
      (data?.monthly ?? []).map((m) => ({
        month: formatMonth(m.period_month),
        revenue: m.revenue,
        expense: m.expense,
        gross_margin: m.gross_margin,
      })),
    [data],
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !data || !data.found) {
    return (
      <Alert>
        <AlertTitle>No data</AlertTitle>
        <AlertDescription>
          Client not found in {COMPANY_LABEL[company]} for {year}.
        </AlertDescription>
      </Alert>
    );
  }

  const billed = data.ar_billed ?? 0;
  const received = data.ar_received ?? 0;
  const outstanding = data.ar_outstanding ?? 0;
  const collectedPct = billed > 0 ? (received / billed) * 100 : 0;
  const pieData = [
    { slice: "received", amount: received, fill: "var(--color-received)" },
    {
      slice: "outstanding",
      amount: outstanding,
      fill: "var(--color-outstanding)",
    },
  ];
  const monthsLabel =
    monthly.length > 0
      ? `${monthly[0].month} - ${monthly[monthly.length - 1].month} ${year}`
      : `${year}`;

  return (
    <div className="space-y-4">
      {/* ── Header + KPI band ── */}
      <Card>
        <CardHeader className="border-b py-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <CardTitle className="text-base">{data.client_name}</CardTitle>
              <CardDescription className="mt-0.5 text-[11px]">
                {COMPANY_LABEL[company]} · Year {year} ·{" "}
                {data.consultant_count} consultants ·{" "}
                {(data.total_hours ?? 0).toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}{" "}
                hrs
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Year
              </span>
              <Select
                value={String(year)}
                onValueChange={(v) => setYear(Number(v))}
              >
                <SelectTrigger className="h-8 w-[100px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(yearsList?.years ?? [year]).map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-3 py-3 sm:grid-cols-4">
          <Kpi label="Revenue" value={formatMoney(data.revenue ?? 0)} />
          <Kpi label="COGS" value={formatMoney(data.expense ?? 0)} />
          <Kpi
            label="Gross Margin"
            value={formatMoney(data.gross_margin ?? 0)}
            tone={(data.gross_margin ?? 0) >= 0 ? "good" : "bad"}
          />
          <Kpi
            label="Margin %"
            value={formatPct(data.margin_pct ?? 0)}
            tone={
              (data.margin_pct ?? 0) >= 15
                ? "good"
                : (data.margin_pct ?? 0) >= 0
                  ? "warn"
                  : "bad"
            }
          />
        </CardContent>

        {/* Expense breakdown - subvendor pay vs referral fees */}
        {((data.referral_expense ?? 0) > 0 ||
          (data.us_pay_expense ?? 0) > 0) && (
          <CardContent className="grid grid-cols-2 gap-3 border-t py-3 sm:grid-cols-3">
            <Kpi
              label="Subvendor / W-2 Pay"
              value={formatMoney(data.us_pay_expense ?? 0)}
            />
            <Kpi
              label="Referral Fees"
              value={formatMoney(data.referral_expense ?? 0)}
              tone={(data.referral_expense ?? 0) > 0 ? "warn" : "neutral"}
            />
            <Kpi
              label="Effective Pay Rate"
              value={
                (data.total_hours ?? 0) > 0
                  ? `$${((data.expense ?? 0) / (data.total_hours ?? 1)).toFixed(2)}/hr`
                  : "-"
              }
            />
          </CardContent>
        )}
      </Card>

      {/* ── Client trend (month-by-month within selected year) ── */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle className="text-base">Client trend · {year}</CardTitle>
            <CardDescription className="text-[11px]">
              {data.client_name} · {COMPANY_LABEL[company]} · 12 months of{" "}
              {year}. Each point = one month. Line up = improving.
            </CardDescription>
          </div>
          <Select
            value={trendMetric}
            onValueChange={(v) => setTrendMetric(v as TrendMetric)}
          >
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="margin_pct">Margin %</SelectItem>
              <SelectItem value="revenue">Revenue</SelectItem>
              <SelectItem value="expense">COGS</SelectItem>
              <SelectItem value="gross_margin">Gross Margin</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {trendRows.length === 0 ? (
            <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
              No monthly data for {data.client_name} in {year}.
            </div>
          ) : (
            <div>
              <div className="mb-1 ml-12 text-[11px] text-muted-foreground">
                {trendMeta[trendMetric].label} by month
              </div>
              <ChartContainer
                config={{
                  value: {
                    label: trendMeta[trendMetric].label,
                    color: trendMeta[trendMetric].color,
                  },
                }}
                className="h-[260px] w-full"
              >
                <AreaChart
                  accessibilityLayer
                  data={trendRows}
                  margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                >
                  <defs>
                    <linearGradient id="fillClTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-value)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-value)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={true}
                    tickMargin={6}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    tickFormatter={(v: string) => v.slice(0, 3)}
                  />
                  <YAxis
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={true}
                    tickMargin={6}
                    width={56}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    tickFormatter={(v: number) =>
                      trendMetric === "margin_pct"
                        ? `${v.toFixed(2)}%`
                        : yAxisDollarTick(v)
                    }
                  />
                  <ChartTooltip
                    cursor={{ stroke: "var(--border)", strokeDasharray: "3 3" }}
                    content={
                      <ChartTooltipContent
                        indicator="line"
                        labelFormatter={(label) => `${label} ${year}`}
                        formatter={(_v, _name, item) => {
                          const r = item.payload as {
                            margin_pct: number;
                            revenue: number;
                            expense: number;
                            gross_margin: number;
                          };
                          return (
                            <div className="grid w-full gap-1 text-xs">
                              <div className="flex justify-between gap-3">
                                <span className="text-muted-foreground">
                                  {trendMeta[trendMetric].label}
                                </span>
                                <span className="font-mono font-semibold tabular-nums">
                                  {trendMeta[trendMetric].format(
                                    r[trendMetric],
                                  )}
                                </span>
                              </div>
                              <div className="mt-1 border-t pt-1 text-[10px] text-muted-foreground">
                                Rev {formatMoney(r.revenue)} · Exp{" "}
                                {formatMoney(r.expense)} · GM{" "}
                                {formatMoney(r.gross_margin)} ·{" "}
                                {r.margin_pct.toFixed(1)}%
                              </div>
                            </div>
                          );
                        }}
                      />
                    }
                  />
                  <Area
                    dataKey={trendMetric}
                    type="monotone"
                    fill="url(#fillClTrend)"
                    stroke="var(--color-value)"
                    strokeWidth={2}
                    dot={{ r: 3, fill: "var(--color-value)" }}
                    activeDot={{ r: 5 }}
                  />
                </AreaChart>
              </ChartContainer>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-1 pb-3 text-xs">
          {trendDelta ? (
            <div className="flex items-center gap-2 font-medium">
              {trendDelta.delta >= 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-300" />
                  {trendMeta[trendMetric].label} rising{" "}
                  {Math.abs(trendDelta.pct).toFixed(1)}% - H2 {year} vs H1{" "}
                  {year}
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-300" />
                  {trendMeta[trendMetric].label} declining{" "}
                  {Math.abs(trendDelta.pct).toFixed(1)}% - H2 {year} vs H1{" "}
                  {year}
                </>
              )}
            </div>
          ) : (
            <div className="font-medium">
              {trendMeta[trendMetric].label} across {year}
            </div>
          )}
          <div className="text-[11px] text-muted-foreground">
            Hover any point for revenue / expense / GM / margin % that month.
            Switch year + metric from dropdowns.
          </div>
        </CardFooter>
      </Card>

      {/* ── Monthly bars + table side-by-side (compact, single screen) ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Monthly Rev / Exp / GM</CardTitle>
            <CardDescription className="text-[11px]">
              Blue (rev) over red (exp) = profit. {monthsLabel}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-2 pb-2">
            {monthly.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                No monthly rows for {year}.
              </div>
            ) : (
              <div>
                <div className="mb-0.5 ml-10 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  Left: revenue & expense · Right: gross margin (zoomed)
                </div>
                <ChartContainer config={monthlyBarConfig} className="h-[200px] w-full md:h-[240px]">
                  <AreaChart
                    accessibilityLayer
                    data={monthly}
                    margin={{ left: 2, right: 4, top: 2, bottom: 2 }}
                  >
                    <defs>
                      <linearGradient id="fillClRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillClExp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillClGm" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-gross_margin)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-gross_margin)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={true}
                      tickMargin={4}
                      tickFormatter={(value: string) => value.slice(0, 3)}
                      tick={{ fontSize: 10, fill: "var(--foreground)" }}
                    />
                    <YAxis
                      yAxisId="usd"
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={true}
                      tickFormatter={yAxisDollarTick}
                      width={46}
                      tick={{ fontSize: 10, fill: "var(--foreground)" }}
                    />
                    <YAxis
                      yAxisId="gm"
                      orientation="right"
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={true}
                      tickFormatter={yAxisDollarTick}
                      width={46}
                      tick={{ fontSize: 10, fill: "var(--color-gross_margin)" }}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          formatter={(v, name) => (
                            <div className="flex w-full justify-between gap-3">
                              <span>
                                {monthlyBarConfig[name as keyof typeof monthlyBarConfig]?.label}
                              </span>
                              <span className="font-mono font-medium tabular-nums">
                                {formatMoney(Number(v))}
                              </span>
                            </div>
                          )}
                        />
                      }
                    />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Area yAxisId="usd" dataKey="revenue" type="monotone" fill="url(#fillClRev)" stroke="var(--color-revenue)" strokeWidth={2} />
                    <Area yAxisId="usd" dataKey="expense" type="monotone" fill="url(#fillClExp)" stroke="var(--color-expense)" strokeWidth={2} />
                    <Area yAxisId="gm" dataKey="gross_margin" type="monotone" fill="url(#fillClGm)" stroke="var(--color-gross_margin)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
                <div className="mt-0.5 text-center text-[10px] font-semibold uppercase tracking-wider text-foreground">
                  X: Month
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">Monthly Breakdown</CardTitle>
            <CardDescription className="text-[11px]">{monthsLabel}</CardDescription>
          </CardHeader>
          <CardContent className="px-0 pb-2">
            {monthly.length === 0 ? (
              <div className="px-4 py-3 text-xs text-muted-foreground">
                No monthly rows for {year}.
              </div>
            ) : (
              <div className="max-h-[200px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 border-b bg-card text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-1.5 text-left">Month</th>
                      <th className="px-3 py-1.5 text-right">Revenue</th>
                      <th className="px-3 py-1.5 text-right">COGS</th>
                      <th className="px-3 py-1.5 text-right">GM</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthly.map((m) => (
                      <tr key={m.month} className="border-b last:border-0">
                        <td className="px-3 py-1.5">{m.month.slice(0, 3)}</td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                          {formatMoney(m.revenue)}
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                          {formatMoney(m.expense)}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-1.5 text-right font-mono tabular-nums",
                            m.gross_margin >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                          )}
                        >
                          {formatMoney(m.gross_margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── AR summary + donut ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-1">
            <CardTitle className="text-sm">AR Summary</CardTitle>
            <CardDescription className="text-[11px]">
              {data.ar_invoices} invoices · YTD {year}
            </CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-3 py-2 text-xs">
            <div>
              <div className="text-muted-foreground">Billed</div>
              <div className="font-mono text-sm tabular-nums">
                {formatMoney(billed)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Received</div>
              <div className="font-mono text-sm tabular-nums text-emerald-600 dark:text-emerald-300">
                {formatMoney(received)}
              </div>
            </div>
            <div>
              <div className="text-muted-foreground">Outstanding</div>
              <div className="font-mono text-sm tabular-nums text-sky-600 dark:text-sky-300">
                {formatMoney(outstanding)}
              </div>
            </div>
          </CardContent>
          <CardFooter className="pb-2 text-[11px] text-muted-foreground">
            Collection rate: {formatPct(collectedPct)}
          </CardFooter>
        </Card>

        {/* Pie Chart - Donut with Text (AR composition) */}
        <Card className="flex flex-col">
          <CardHeader className="items-center pb-0">
            <CardTitle className="text-sm">Collection Rate</CardTitle>
            <CardDescription className="text-[11px]">
              AR · YTD {year}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 pb-0">
            {billed === 0 ? (
              <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                No invoiced amount in {year}.
              </div>
            ) : (
              <ChartContainer
                config={pieConfig}
                className="mx-auto aspect-square max-h-[160px]"
              >
                <PieChart>
                  <ChartTooltip
                    cursor={false}
                    content={
                      <ChartTooltipContent
                        hideLabel
                        formatter={(v, name) => (
                          <div className="flex w-full justify-between gap-3">
                            <span>
                              {pieConfig[name as keyof typeof pieConfig]?.label}
                            </span>
                            <span className="font-mono font-medium tabular-nums">
                              {formatMoney(Number(v))}
                            </span>
                          </div>
                        )}
                      />
                    }
                  />
                  <Pie
                    data={pieData}
                    dataKey="amount"
                    nameKey="slice"
                    innerRadius={42}
                    strokeWidth={4}
                  >
                    <Label
                      content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text
                              x={viewBox.cx}
                              y={viewBox.cy}
                              textAnchor="middle"
                              dominantBaseline="middle"
                            >
                              <tspan
                                x={viewBox.cx}
                                y={viewBox.cy}
                                className="fill-foreground text-xl font-bold"
                              >
                                {formatPct(collectedPct)}
                              </tspan>
                              <tspan
                                x={viewBox.cx}
                                y={(viewBox.cy || 0) + 16}
                                className="fill-muted-foreground text-[10px]"
                              >
                                collected
                              </tspan>
                            </text>
                          );
                        }
                      }}
                    />
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
          <CardFooter className="flex-col gap-1 pb-2 text-[11px]">
            <div className="leading-none text-muted-foreground">
              {formatMoney(received)} received · {formatMoney(outstanding)}{" "}
              outstanding
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
}) {
  const cls = {
    neutral: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-300",
    warn: "text-sky-600 dark:text-sky-300",
    bad: "text-rose-600 dark:text-rose-300",
  }[tone];
  return (
    <div className="space-y-0.5">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-base font-semibold tabular-nums", cls)}>
        {value}
      </div>
    </div>
  );
}
