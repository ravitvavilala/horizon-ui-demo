"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  Briefcase,
  Building2,
  CalendarDays,
  MapPin,
  Receipt,
  Shield,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  User2,
} from "lucide-react";

import { api } from "@/lib/api";
import { COMPANY_LABELS, SRC } from "@/lib/labels";
import { useDashboardStore } from "@/stores/dashboard";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

const MON3 = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const monthTick = (v: string) => MON3[Number(v.slice(5, 7)) - 1] ?? v.slice(5);
const monthYearTick = (v: string) => `${MON3[Number(v.slice(5, 7)) - 1] ?? ""} ${v.slice(2, 4)}`;

const COMPANY_LABEL = COMPANY_LABELS;

const TYPE_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  "1SALARY": { label: "W-2 Salary", variant: "outline" },
  "2HOURLY": { label: "W-2 Hourly", variant: "outline" },
  "3P/I": { label: "W-2 PI", variant: "secondary" },
  "3P/S": { label: "Subvendor 3P/S", variant: "secondary" },
  "4Subs": { label: "Subcontractor", variant: "secondary" },
  pi: { label: "PI", variant: "secondary" },
  w2: { label: "W-2", variant: "outline" },
};

const barConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "COGS", color: "var(--chart-3)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
};

// Per-year line-chart metric picker - mirrors ClientDetail "Client trend".
type TrendMetric = "margin_pct" | "revenue" | "expenses" | "profit";
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
  expenses: {
    label: "COGS",
    color: "var(--chart-3)",
    format: (v) => formatMoney(v),
    unit: "Dollars (USD)",
  },
  profit: {
    label: "Profit",
    color: "var(--chart-2)",
    format: (v) => formatMoney(v),
    unit: "Dollars (USD)",
  },
};

const yAxisDollarTick = (v: number) => compactMoneyTick(v);

export function ConsultantDetail({ id }: { id: number }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["consultant-detail", id],
    queryFn: () => api.getConsultantDetail(id),
  });

  const { data: v2 } = useQuery({
    queryKey: ["consultant-v2", id],
    queryFn: () => api.getV2ConsultantDetail(id),
    retry: false,
  });

  const { data: v3 } = useQuery({
    queryKey: ["consultant-v3", id],
    queryFn: () => api.getV3ConsultantDetail(id),
    retry: false,
  });

  // ── ALL hooks must run before any early return (rules-of-hooks).
  // chartRows is null-safe so it can be computed before the data guard.
  // Books-close gate: months Finance has not closed are excluded, same
  // rule as every other page (close month comes from the headline seed).
  const storeCompany = useDashboardStore((s) => s.company);
  const { data: closeInfo } = useQuery({
    queryKey: ["close-info", storeCompany],
    queryFn: () => api.getCompanyHeadline(storeCompany, new Date().getFullYear()),
    retry: false,
  });
  const chartRows = React.useMemo(() => {
    const byPeriod = new Map<
      string,
      { rev: number; exp: number; prof: number; billHrs: number; payHrs: number; assignments: Set<number> }
    >();
    const cy = closeInfo?.closed_through_year ?? null;
    const cm = closeInfo?.closed_through_month ?? null;
    for (const row of data?.history ?? []) {
      // aggregate by CALENDAR MONTH, not pay-period end date. A month holds
      // several weekly/biweekly periods, which used to plot 2-4 points per
      // month and repeat the x-axis label.
      const k = String(row.period_ending).slice(0, 7);
      if (cy != null && cm != null) {
        const y = Number(k.slice(0, 4));
        const m = Number(k.slice(5, 7));
        if (y > cy || (y === cy && m > cm)) continue; // not closed yet
      }
      const v = byPeriod.get(k) ?? { rev: 0, exp: 0, prof: 0, billHrs: 0, payHrs: 0, assignments: new Set<number>() };
      v.rev += Number(row.revenue);
      v.exp += Number(row.total_expenses);
      v.prof += Number(row.profit);
      v.billHrs += Number(row.total_bill_hours);
      v.payHrs += Number(row.total_pay_hours);
      if (row.assignment_id) v.assignments.add(row.assignment_id);
      byPeriod.set(k, v);
    }
    return [...byPeriod.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([t, v]) => {
        const rev = v.rev;
        const prof = v.prof;
        return {
          month: t,
          revenue: rev,
          expenses: v.exp,
          profit: prof,
          margin_pct: rev > 0 ? (prof / rev) * 100 : 0,
          billHrs: v.billHrs,
          payHrs: v.payHrs,
          assignments: v.assignments.size,
        };
      });
  }, [data, closeInfo]);

  // Year filter - mirrors ClientDetail pattern (2026-05-20). Default to
  // most recent year present in history, dropdown lists all years ≥2024.
  const yearsAvailable = React.useMemo(() => {
    const ys = new Set<number>();
    for (const r of chartRows) {
      const y = Number(r.month.slice(0, 4));
      if (y >= 2024) ys.add(y);
    }
    return [...ys].sort((a, b) => b - a);
  }, [chartRows]);
  const [year, setYear] = React.useState<number>(
    yearsAvailable[0] ?? new Date().getFullYear(),
  );
  const [trendMetric, setTrendMetric] =
    React.useState<TrendMetric>("margin_pct");

  // Snap year to latest available once history loads
  React.useEffect(() => {
    if (yearsAvailable.length > 0 && !yearsAvailable.includes(year)) {
      setYear(yearsAvailable[0]);
    }
  }, [yearsAvailable, year]);

  const yearRows = React.useMemo(
    () => chartRows.filter((r) => r.month.startsWith(`${year}-`)),
    [chartRows, year],
  );
  const yearTotals = React.useMemo(() => {
    const t = yearRows.reduce(
      (a, r) => {
        a.rev += r.revenue;
        a.exp += r.expenses;
        a.prof += r.profit;
        a.billHrs += r.billHrs;
        a.payHrs += r.payHrs;
        return a;
      },
      { rev: 0, exp: 0, prof: 0, billHrs: 0, payHrs: 0 },
    );
    return {
      ...t,
      margin: t.rev > 0 ? (t.prof / t.rev) * 100 : 0,
    };
  }, [yearRows]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-xl" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }

  if (isError || !data) {
    return (
      <Alert variant="destructive">
        <AlertTitle>Consultant not found</AlertTitle>
        <AlertDescription>
          Consultant #{id} has no rows in fct_consultant_profit.
        </AlertDescription>
      </Alert>
    );
  }

  const name =
    `${data.first_name ?? ""} ${data.last_name ?? ""}`.trim() ||
    `#${data.consultant_id}`;
  const initials = `${(data.first_name?.[0] ?? "?").toUpperCase()}${(data.last_name?.[0] ?? "").toUpperCase()}`;

  const rev = Number(data.revenue);
  const exp = Number(data.total_expenses);

  // Unique clients + assignments
  const uniqueClients = new Set(data.history.map((r) => r.client_name).filter(Boolean));
  const uniqueAssignments = new Set(data.history.map((r) => r.assignment_id).filter(Boolean));
  const totalBillHrs = Number(data.total_bill_hours);
  const totalPayHrs = Number(data.total_pay_hours);
  const avgBillRate = totalBillHrs > 0 ? rev / totalBillHrs : 0;
  const avgPayRate = totalPayHrs > 0 ? exp / totalPayHrs : 0;

  // v2 data
  const rates = v2?.rates ?? [];
  const hasV2 = !!v2;

  return (
    <div className="space-y-6">
      {/* ── Profile Card ── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-4">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-muted text-base font-semibold text-foreground/85">
                {initials || "·"}
              </span>
              <div>
                <CardTitle className="text-xl">{name}</CardTitle>
                <CardDescription className="mt-1 flex flex-wrap items-center gap-2">
                  <span>ID #{data.consultant_id}</span>
                  <Separator orientation="vertical" className="h-3" />
                  <span>{COMPANY_LABEL[data.source_company] ?? data.source_company}</span>
                  {data.employment_type && (
                    <>
                      <Separator orientation="vertical" className="h-3" />
                      <Badge variant={TYPE_CONFIG[data.employment_type]?.variant ?? "outline"}>
                        {TYPE_CONFIG[data.employment_type]?.label ?? data.employment_type}
                      </Badge>
                    </>
                  )}
                </CardDescription>
              </div>
            </div>
            <StatusPill active={data.is_active} status={data.status} />
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 py-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field Icon={Briefcase} label="Client" value={data.client_name ?? "-"} />
          <Field Icon={User2} label="Position" value={data.position_title ?? "-"} />
          <Field
            Icon={Building2}
            label="Branch · LOB"
            value={[data.branch, data.line_of_business].filter(Boolean).join(" · ") || "-"}
          />
          <Field
            Icon={MapPin}
            label="Location"
            value={[data.city, data.state, data.zip].filter(Boolean).join(", ") || "-"}
          />
          <Field Icon={CalendarDays} label="Hire date" value={data.hire_date ?? "-"} />
          <Field
            Icon={Receipt}
            label="Pay type"
            value={[data.pay_type, data.pay_period].filter(Boolean).join(" · ") || "-"}
          />
        </CardContent>
      </Card>

      {/* ── Tabbed Analysis ── */}
      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pnl">P&L Analysis</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
          {hasV2 && <TabsTrigger value="rates">Rate Breakdown</TabsTrigger>}
        </TabsList>

        {/* ── Tab: Overview ── */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          {/* Year picker - drives KPIs, line chart, bars, table below. */}
          {yearsAvailable.length > 0 && (
            <div className="flex items-center justify-end gap-2">
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
                  {yearsAvailable.map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* KPI Grid - year-scoped */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label={`Revenue ${year}`} value={formatMoney(yearTotals.rev)} />
            <KpiCard label={`COGS ${year}`} value={formatMoney(yearTotals.exp)} />
            <KpiCard
              label={`Profit ${year}`}
              value={formatMoney(yearTotals.prof)}
              tone={yearTotals.prof >= 0 ? "good" : "bad"}
            />
            <KpiCard
              label={`Margin ${year}`}
              value={yearTotals.rev > 0 ? formatPct(yearTotals.margin) : "-"}
              tone={
                yearTotals.rev <= 0
                  ? "neutral"
                  : yearTotals.margin >= 15
                    ? "good"
                    : yearTotals.margin >= 0
                      ? "warn"
                      : "bad"
              }
            />
          </div>

          {/* Stats Row - lifetime context, kept compact */}
          <Card>
            <CardContent className="grid grid-cols-2 gap-4 py-3 sm:grid-cols-3 lg:grid-cols-6">
              <StatItem label="Bill hrs (life)" value={totalBillHrs.toLocaleString()} />
              <StatItem label="Pay hrs (life)" value={totalPayHrs.toLocaleString()} />
              <StatItem label="Avg bill rate" value={`$${avgBillRate.toFixed(2)}`} />
              <StatItem label="Avg pay rate" value={`$${avgPayRate.toFixed(2)}`} />
              <StatItem label="Clients" value={String(uniqueClients.size)} />
              <StatItem label="Assignments" value={String(uniqueAssignments.size)} />
            </CardContent>
          </Card>

          {/* ── Consultant trend (line, year-scoped) ── */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-base">Consultant trend · {year}</CardTitle>
                <CardDescription className="text-[11px]">
                  {name} · 12 months of {year}. Each point = one month. Line
                  up = improving.
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
                  <SelectItem value="expenses">COGS</SelectItem>
                  <SelectItem value="profit">Profit</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="px-3 pb-2">
              {yearRows.length === 0 ? (
                <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
                  No monthly data for {name} in {year}.
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
                    className="h-[240px] w-full"
                  >
                    <AreaChart
                      accessibilityLayer
                      data={yearRows}
                      margin={{ left: 4, right: 12, top: 8, bottom: 4 }}
                    >
                      <defs>
                        <linearGradient id="fillCnTrend" x1="0" y1="0" x2="0" y2="1">
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
                        tickFormatter={monthTick}
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
                                expenses: number;
                                profit: number;
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
                                    {formatMoney(r.expenses)} · Profit{" "}
                                    {formatMoney(r.profit)} ·{" "}
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
                        fill="url(#fillCnTrend)"
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
          </Card>

          {/* ── Monthly bars + table side-by-side (mirrors ClientDetail) ── */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-1">
                <CardTitle className="text-sm">Monthly Rev / Exp / Profit</CardTitle>
                <CardDescription className="text-[11px]">
                  Blue (rev) over red (exp) = profit. {year}.
                </CardDescription>
              </CardHeader>
              <CardContent className="px-2 pb-2">
                {yearRows.length === 0 ? (
                  <div className="flex h-32 items-center justify-center text-xs text-muted-foreground">
                    No monthly rows for {year}.
                  </div>
                ) : (
                  <div>
                    <div className="mb-0.5 ml-10 text-[10px] font-semibold uppercase tracking-wider text-foreground">
                      Y: Dollars (USD)
                    </div>
                    <ChartContainer config={barConfig} className="h-[200px] w-full md:h-[240px]">
                      <AreaChart
                        accessibilityLayer
                        data={yearRows}
                        margin={{ left: 2, right: 4, top: 2, bottom: 2 }}
                      >
                        <defs>
                          <linearGradient id="fillCnRev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillCnExp" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.1} />
                          </linearGradient>
                          <linearGradient id="fillCnProfit" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid vertical={false} />
                        <XAxis
                          dataKey="month"
                          tickLine={false}
                          axisLine={true}
                          tickMargin={4}
                          tickFormatter={monthTick}
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
                          yAxisId="profit"
                          orientation="right"
                          domain={["auto", "auto"]}
                          tickLine={false}
                          axisLine={true}
                          tickFormatter={yAxisDollarTick}
                          width={46}
                          tick={{ fontSize: 10, fill: "var(--color-profit)" }}
                        />
                        <ChartTooltip
                          cursor={false}
                          content={
                            <ChartTooltipContent
                              formatter={(v, name) => (
                                <div className="flex w-full justify-between gap-3">
                                  <span>
                                    {barConfig[name as keyof typeof barConfig]?.label}
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
                        <Area yAxisId="usd" dataKey="revenue" type="monotone" fill="url(#fillCnRev)" stroke="var(--color-revenue)" strokeWidth={2} />
                        <Area yAxisId="usd" dataKey="expenses" type="monotone" fill="url(#fillCnExp)" stroke="var(--color-expenses)" strokeWidth={2} />
                        <Area yAxisId="profit" dataKey="profit" type="monotone" fill="url(#fillCnProfit)" stroke="var(--color-profit)" strokeWidth={2} />
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
                <CardDescription className="text-[11px]">
                  {yearRows.length} months · {year}
                </CardDescription>
              </CardHeader>
              <CardContent className="px-0 pb-2">
                {yearRows.length === 0 ? (
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
                          <th className="px-3 py-1.5 text-right">Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {yearRows.map((m) => (
                          <tr key={m.month} className="border-b last:border-0">
                            <td className="px-3 py-1.5">{m.month.slice(5)}</td>
                            <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                              {formatMoney(m.revenue)}
                            </td>
                            <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                              {formatMoney(m.expenses)}
                            </td>
                            <td
                              className={cn(
                                "px-3 py-1.5 text-right font-mono tabular-nums",
                                m.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                              )}
                            >
                              {formatMoney(m.profit)}
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
        </TabsContent>

        {/* ── Tab: P&L Analysis ── */}
        <TabsContent value="pnl" className="space-y-6 pt-4">
          {/* Revenue vs Expenses Bar Chart */}
          {chartRows.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Revenue vs Expenses</CardTitle>
                <CardDescription>Monthly comparison · axis zoomed to range</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <ChartContainer config={barConfig} className="h-72 w-full">
                  <AreaChart data={chartRows} margin={{ left: 6, right: 6, top: 6 }}>
                    <defs>
                      <linearGradient id="fillCnRevHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                      </linearGradient>
                      <linearGradient id="fillCnExpHist" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.8} />
                        <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.1} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="var(--border)" />
                    <XAxis
                      dataKey="month"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={monthYearTick}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    />
                    <YAxis
                      domain={["auto", "auto"]}
                      tickLine={false}
                      axisLine={false}
                      tickMargin={8}
                      tickFormatter={(v: number) => compactMoney(v)}
                      tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      width={56}
                    />
                    <ChartTooltip
                      cursor={false}
                      content={
                        <ChartTooltipContent
                          indicator="dot"
                          formatter={(v) => formatMoney(Number(v))}
                        />
                      }
                    />
                    <Area dataKey="revenue" type="monotone" fill="url(#fillCnRevHist)" stroke="var(--color-revenue)" strokeWidth={2} />
                    <Area dataKey="expenses" type="monotone" fill="url(#fillCnExpHist)" stroke="var(--color-expenses)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {/* v2 Cascading P&L */}
          {hasV2 && <V2PnlTable v2={v2} />}

          {/* v3 Honest P&L - invoice revenue + Job_WC_Code expense */}
          {v3 && <V3PnlCard v3={v3} />}

          {/* Period Summary Table */}
          {chartRows.length > 0 && (
            <Card>
              <CardHeader className="border-b">
                <CardTitle className="text-base">Period Summary</CardTitle>
                <CardDescription>Aggregated by month</CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Month</TableHead>
                      <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                      <TableHead className="text-right text-muted-foreground">COGS</TableHead>
                      <TableHead className="text-right text-muted-foreground">Profit</TableHead>
                      <TableHead className="text-right text-muted-foreground">Margin</TableHead>
                      <TableHead className="text-right text-muted-foreground">Bill Hrs</TableHead>
                      <TableHead className="text-right text-muted-foreground">Assignments</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {chartRows.slice().reverse().map((row) => {
                      const m = row.revenue > 0 ? (row.profit / row.revenue) * 100 : 0;
                      return (
                        <TableRow key={row.month} className="border-border/40 hover:bg-foreground/[0.03]">
                          <TableCell className="text-xs tabular-nums">{row.month}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatMoney(row.revenue)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">{formatMoney(row.expenses)}</TableCell>
                          <TableCell className={cn("text-right text-xs font-medium tabular-nums", row.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                            {formatMoney(row.profit)}
                          </TableCell>
                          <TableCell className={cn("text-right text-xs tabular-nums", m >= 15 ? "text-emerald-600 dark:text-emerald-300" : m >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                            {row.revenue > 0 ? formatPct(m) : "-"}
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{row.billHrs.toFixed(0)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{row.assignments}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* ── Tab: Assignments ── */}
        <TabsContent value="assignments" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Assignment History</CardTitle>
                  <CardDescription>
                    {data.history.length} rows · most recent first
                  </CardDescription>
                </div>
                <Badge variant="outline">{data.history.length} rows</Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Period</TableHead>
                    <TableHead className="text-muted-foreground">Assignment</TableHead>
                    <TableHead className="text-muted-foreground">Client</TableHead>
                    <TableHead className="text-right text-muted-foreground">Bill hrs</TableHead>
                    <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                    <TableHead className="text-right text-muted-foreground">COGS</TableHead>
                    <TableHead className="text-right text-muted-foreground">Profit</TableHead>
                    <TableHead className="text-right text-muted-foreground">Margin</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.history.map((row, i) => {
                    const r = Number(row.revenue);
                    const p = Number(row.profit);
                    const m = Number(row.margin_pct);
                    return (
                      <TableRow key={i} className="border-border/40 hover:bg-foreground/[0.03]">
                        <TableCell className="text-xs tabular-nums">{row.period_ending}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{row.assignment_id ?? "-"}</TableCell>
                        <TableCell className="text-xs">
                          <div className="max-w-[260px] truncate">{row.client_name ?? "-"}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{Number(row.total_bill_hours).toFixed(0)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatMoney(r)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatMoney(Number(row.total_expenses))}</TableCell>
                        <TableCell className={cn("text-right text-xs tabular-nums", p >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                          {formatMoney(p)}
                        </TableCell>
                        <TableCell className={cn("text-right text-xs tabular-nums", r <= 0 ? "text-muted-foreground/50" : m >= 15 ? "text-emerald-600 dark:text-emerald-300" : m >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                          {r > 0 ? formatPct(m) : "-"}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab: Rate Breakdown (v2 only) ── */}
        {hasV2 && (
          <TabsContent value="rates" className="space-y-6 pt-4">
            {/* v2 KPI summary */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCard label="Revenue (Client Billed)" value={formatMoney(v2.total_revenue)} />
              <KpiCard label="COGS (Gross Salary)" value={formatMoney(v2.total_expenses)} />
              <KpiCard
                label="Margin"
                value={formatMoney(v2.total_profit)}
                tone={v2.total_profit >= 0 ? "good" : "bad"}
              />
              <KpiCard
                label="Margin %"
                value={v2.total_revenue > 0 ? formatPct(v2.total_margin_pct) : "-"}
                tone={v2.total_revenue <= 0 ? "neutral" : v2.total_margin_pct >= 15 ? "good" : v2.total_margin_pct >= 0 ? "warn" : "bad"}
              />
            </div>

            {/* Rate Table */}
            {rates.length > 0 && (
              <Card>
                <CardHeader className="border-b">
                  <CardTitle className="text-base">Per-Assignment Rates</CardTitle>
                  <CardDescription>
                    Bill Rate = client pays · Pay Rate = consultant cost · Spread = per-hour margin
                  </CardDescription>
                </CardHeader>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/60 hover:bg-transparent">
                        <TableHead className="text-muted-foreground">Assignment</TableHead>
                        <TableHead className="text-muted-foreground">Type</TableHead>
                        <TableHead className="text-right text-muted-foreground">Bill Rate</TableHead>
                        <TableHead className="text-right text-muted-foreground">Discount</TableHead>
                        <TableHead className="text-right text-muted-foreground">Net Rate</TableHead>
                        <TableHead className="text-right text-muted-foreground">Pay Rate</TableHead>
                        <TableHead className="text-right text-muted-foreground">Spread</TableHead>
                        <TableHead className="text-right text-muted-foreground">Spread %</TableHead>
                        <TableHead className="text-right text-muted-foreground">Hours</TableHead>
                        <TableHead className="text-muted-foreground">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rates.map((r, i) => (
                        <TableRow key={i} className="border-border/40 hover:bg-foreground/[0.03]">
                          <TableCell className="text-xs tabular-nums text-muted-foreground">{r.assignment_id || "-"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px]">
                              {r.job_wc_code || "-"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums">${r.bill_rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums">
                            {r.volume_discount_rate > 0 ? (
                              <span className="text-sky-600 dark:text-sky-300">-${r.volume_discount_rate.toFixed(2)}</span>
                            ) : (
                              <span className="text-muted-foreground/40">-</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-xs font-medium tabular-nums text-blue-600 dark:text-blue-300">${r.net_bill_rate.toFixed(2)}</TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-rose-600 dark:text-rose-300">${r.pay_rate.toFixed(2)}</TableCell>
                          <TableCell className={cn("text-right text-xs font-medium tabular-nums", r.spread >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                            ${r.spread.toFixed(2)}
                          </TableCell>
                          <TableCell className={cn("text-right text-xs tabular-nums", r.spread_pct >= 15 ? "text-emerald-600 dark:text-emerald-300" : r.spread_pct >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                            {r.spread_pct.toFixed(1)}%
                          </TableCell>
                          <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                            {r.total_billed_hours.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </TableCell>
                          <TableCell>
                            <Badge variant={r.is_active ? "default" : "outline"} className="text-[10px]">
                              {r.is_active ? "Active" : "Ended"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function KpiCard({
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
    <Card>
      <CardContent className="py-4">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className={cn("mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", cls)}>{value}</div>
      </CardContent>
    </Card>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-sm font-medium tabular-nums text-foreground/85">{value}</div>
    </div>
  );
}

function Field({
  Icon,
  label,
  value,
}: {
  Icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-3.5 w-3.5 text-muted-foreground/70" />
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="truncate text-sm text-foreground/85">{value}</div>
      </div>
    </div>
  );
}

function StatusPill({ active, status }: { active: boolean; status: string | null }) {
  return (
    <Badge variant={active ? "default" : "outline"} className="gap-1.5">
      {active ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
      {active ? "Active" : status ?? "Inactive"}
    </Badge>
  );
}

function V2PnlTable({
  v2,
}: {
  v2: NonNullable<Awaited<ReturnType<typeof api.getV2ConsultantDetail>>>;
}) {
  const v1Total = v2.periods.reduce((s, p) => s + p.expense_ultrastaff_v1, 0);
  const v2Total = v2.total_expenses;
  const diff = v2Total - v1Total;
  const allGold = v2.fallback_periods === 0;
  const allSilver = v2.iprise_periods === 0;
  const ToneIcon = allGold ? Shield : ShieldAlert;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <ToneIcon className="h-4 w-4" />
              Monthly P&L - Revenue vs Gross Salary
            </CardTitle>
            <CardDescription>
              {v2.iprise_periods} {SRC.payroll} + {v2.fallback_periods} {SRC.staffing} periods
            </CardDescription>
          </div>
          <Badge variant={allGold ? "default" : "outline"}>
            {allGold ? "All gold" : allSilver ? "All silver" : "Mixed"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="border-b py-3 text-[11px] text-muted-foreground">
        v1 expense: ${v1Total.toLocaleString(undefined, { maximumFractionDigits: 0 })} ·{" "}
        v2 expense: ${v2Total.toLocaleString(undefined, { maximumFractionDigits: 0 })} ·{" "}
        delta:{" "}
        <span className={cn("font-medium tabular-nums", diff > 0 ? "text-rose-600 dark:text-rose-300" : diff < 0 ? "text-emerald-600 dark:text-emerald-300" : "text-foreground/70")}>
          {diff >= 0 ? "+" : ""}${diff.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
        {allSilver && (
          <span className="ml-2 text-sky-700/80 dark:text-sky-200/80">· still on silver - pending PaymentSummary link</span>
        )}
      </CardContent>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Period</TableHead>
              <TableHead className="text-muted-foreground">Source</TableHead>
              <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
              <TableHead className="text-right text-muted-foreground">COGS</TableHead>
              <TableHead className="text-right text-muted-foreground">Profit</TableHead>
              <TableHead className="text-right text-muted-foreground">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {v2.periods.slice(0, 12).map((p) => (
              <TableRow key={p.period_month} className="border-border/40">
                <TableCell className="text-xs tabular-nums">{p.period_month.slice(0, 7)}</TableCell>
                <TableCell>
                  <Badge
                    variant={p.expense_source === "iprise_payment_summary" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {p.expense_source === "iprise_payment_summary" ? SRC.payroll : SRC.staffing}
                  </Badge>
                </TableCell>
                <TableCell className="text-right text-xs font-medium tabular-nums">{formatMoney(p.revenue)}</TableCell>
                <TableCell className="text-right text-xs tabular-nums text-rose-600/80 dark:text-rose-300/80">{formatMoney(p.total_expenses)}</TableCell>
                <TableCell className={cn("text-right text-xs font-medium tabular-nums", p.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                  {formatMoney(p.profit)}
                </TableCell>
                <TableCell className={cn("text-right text-xs tabular-nums", p.revenue <= 0 ? "text-muted-foreground/50" : p.margin_pct >= 15 ? "text-emerald-600 dark:text-emerald-300" : p.margin_pct >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                  {p.revenue > 0 ? formatPct(p.margin_pct) : "-"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function V3PnlCard({
  v3,
}: {
  v3: NonNullable<Awaited<ReturnType<typeof api.getV3ConsultantDetail>>>;
}) {
  const t = v3.totals;
  const c = v3.coverage;
  const ipriseCoverage = c.total_periods > 0
    ? (c.payment_summary_periods / c.total_periods) * 100
    : 0;
  const archiveCoverage = c.total_periods > 0
    ? (c.archive_periods / c.total_periods) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="inline-flex items-center gap-2 text-base">
              <Shield className="h-4 w-4" />
              v3 - Honest P&L
            </CardTitle>
            <CardDescription>
              Revenue from <code className="font-mono text-[11px]">uboT_ARCHIVE_INVOICE_DETAIL</code> ·
              Expense by Job_WC_Code ({v3.employment_type === "w2" ? "PaymentSummary.grossEarnings" : v3.employment_type === "subvendor" ? "Assignment_PayRate × Hours" : "-"})
            </CardDescription>
          </div>
          <Badge variant={v3.job_wc_code ? "default" : "outline"}>
            {v3.job_wc_code ?? "no Job_WC_Code"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Revenue (net)</div>
          <div className="mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl">{formatMoney(t.revenue)}</div>
          {t.discounts > 0 && (
            <div className="mt-0.5 text-[11px] text-sky-600 dark:text-sky-300">
              −{formatMoney(t.discounts)} DISC
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">COGS</div>
          <div className="mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl text-rose-600 dark:text-rose-300">{formatMoney(t.expense)}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Profit</div>
          <div className={cn("mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", t.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
            {formatMoney(t.profit)}
          </div>
          {t.employer_tax > 0 && (
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              − {formatMoney(t.employer_tax)} employer tax (10%)
            </div>
          )}
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Margin %</div>
          <div className={cn("mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", t.margin_pct >= 15 ? "text-emerald-600 dark:text-emerald-300" : t.margin_pct >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
            {t.revenue > 0 ? formatPct(t.margin_pct) : "-"}
          </div>
        </div>
      </CardContent>

      <CardContent className="border-t space-y-2 py-4">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Source coverage</span>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            {c.payment_summary_periods}/{c.total_periods} {SRC.payroll} · {c.archive_periods}/{c.total_periods} archive · {c.gap_periods} gaps
          </span>
        </div>
        {v3.employment_type === "w2" && <Progress value={ipriseCoverage} />}
        {v3.employment_type === "subvendor" && <Progress value={archiveCoverage} />}
      </CardContent>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border/60 hover:bg-transparent">
              <TableHead className="text-muted-foreground">Period</TableHead>
              <TableHead className="text-muted-foreground">Source</TableHead>
              <TableHead className="text-right text-muted-foreground">Gross Rev</TableHead>
              <TableHead className="text-right text-muted-foreground">Discounts</TableHead>
              <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
              <TableHead className="text-right text-muted-foreground">COGS</TableHead>
              <TableHead className="text-right text-muted-foreground">Profit</TableHead>
              <TableHead className="text-right text-muted-foreground">Margin</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {v3.periods.slice(0, 12).map((p) => {
              const src = p._expense_source;
              const srcLabel =
                src === "payment_summary" ? SRC.payroll :
                src === "archive_header"  ? "Archive" :
                src.startsWith("gap_")    ? "gap" :
                src;
              return (
                <TableRow key={p.period_month} className="border-border/40">
                  <TableCell className="text-xs tabular-nums">{p.period_month.slice(0, 7)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={src.startsWith("gap_") ? "outline" : "default"}
                      className="text-[10px]"
                    >
                      {srcLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{formatMoney(p.gross_revenue)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {p.discounts > 0 ? <span className="text-sky-600 dark:text-sky-300">−{formatMoney(p.discounts)}</span> : <span className="text-muted-foreground/40">-</span>}
                  </TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">{formatMoney(p.revenue)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-rose-600/80 dark:text-rose-300/80">{formatMoney(p.expense)}</TableCell>
                  <TableCell className={cn("text-right text-xs font-medium tabular-nums", p.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                    {formatMoney(p.profit)}
                  </TableCell>
                  <TableCell className={cn("text-right text-xs tabular-nums", p.revenue <= 0 ? "text-muted-foreground/50" : p.margin_pct >= 15 ? "text-emerald-600 dark:text-emerald-300" : p.margin_pct >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                    {p.revenue > 0 ? formatPct(p.margin_pct) : "-"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}
