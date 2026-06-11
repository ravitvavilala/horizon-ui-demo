"use client";

/**
 * Overview - Phase 6 rebuild.
 *
 * Driven by top-right Company toggle (Apex Staffing / Meridian Talent) + Year dropdown.
 * Default shadcn components only. No tabs, no Forecast/Anomalies/Sources junk.
 *
 * Layout (shadcn dashboard pattern):
 *   - 4 KPI cards row: Revenue / Expense / Gross Margin / Margin %
 *   - 3 secondary cards: Clients / Consultants / Hours
 *   - 1 bar chart: monthly revenue + expense for the year
 *   - 1 table: top 10 clients by revenue
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  DollarSign,
  Percent,
  TrendingUp,
  Users,
} from "lucide-react";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { YearSelect } from "@/components/YearSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";
import { COMPANY_LABELS } from "@/lib/labels";

export const dynamic = "force-dynamic";

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expense: { label: "COGS", color: "var(--chart-3)" },
  margin: { label: "Gross margin", color: "var(--chart-2)" },
};

const revPerDayConfig: ChartConfig = {
  revPerDay: { label: "Revenue / billing day", color: "var(--chart-1)" },
};

const COMPANY_LABEL = COMPANY_LABELS;

export default function Home() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);

  const { data: headline, isLoading: headlineLoading } = useQuery({
    queryKey: ["overview-headline", company, year],
    queryFn: () => api.getCompanyHeadline(company, year),
  });
  const { data: monthly, isLoading: monthlyLoading } = useQuery({
    queryKey: ["overview-monthly", company, year],
    queryFn: () => api.getCompanyMonthly(company, year),
  });
  const { data: clients, isLoading: clientsLoading } = useQuery({
    queryKey: ["overview-top-clients", company, year, 10],
    queryFn: () => api.getCompanyClients(company, year, 10),
  });
  const { data: prevHeadline } = useQuery({
    queryKey: ["overview-headline-prev", company, year - 1],
    queryFn: () => api.getCompanyHeadline(company, year - 1),
    retry: false,
  });
  const { data: prevMonthly } = useQuery({
    queryKey: ["overview-monthly-prev", company, year - 1],
    queryFn: () => api.getCompanyMonthly(company, year - 1),
    retry: false,
  });

  if (headlineLoading || !headline) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-72" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
        <Skeleton className="h-72 rounded-xl" />
      </div>
    );
  }

  const monthRows = (monthly?.months ?? []).map((m) => ({
    month: m.period_month.slice(0, 7),
    revenue: m.revenue,
    expense: m.expense,
    margin: m.gross_margin,
    billingDays: m.billing_days,
    revPerDay: m.revenue_per_billing_day,
  }));

  // ── Same-period YoY ────────────────────────────────────────────────
  // A partial current year (recent months not closed by Finance) must
  // compare to the SAME months last year, not the full prior year · else
  // 3 closed months of 2026 vs all of 2025 shows a fake -64%. The closed-
  // through month comes from the API (the finance lead closes the books monthly).
  const curM = monthly?.months ?? [];
  const prevM = prevMonthly?.months ?? [];
  const mNum = (pm: string) => parseInt(pm.slice(5, 7), 10);
  const closedYear = headline.closed_through_year ?? null;
  const closedMonth = headline.closed_through_month ?? null;
  let completeNums: Set<number>;
  let isPartial: boolean;
  if (closedYear != null && closedMonth != null && year >= closedYear) {
    // current year: complete = months 1..closed_month; future years (n/a): 12
    const upto = year === closedYear ? closedMonth : 12;
    completeNums = new Set(Array.from({ length: upto }, (_, i) => i + 1));
    isPartial = upto < 12;
  } else {
    // older, fully-closed year (or no close configured): all months present
    completeNums = new Set(curM.map((m) => mNum(m.period_month)));
    isPartial = false;
  }
  const sumAligned = (rows: { period_month: string; revenue: number; expense: number }[]) => {
    const f = rows.filter((m) => completeNums.has(mNum(m.period_month)));
    const revenue = f.reduce((s, m) => s + m.revenue, 0);
    const expense = f.reduce((s, m) => s + m.expense, 0);
    return { revenue, expense, gm: revenue - expense, mpct: revenue ? ((revenue - expense) / revenue) * 100 : 0 };
  };
  const curA = sumAligned(curM);
  const prevA = sumAligned(prevM);
  const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const lastCompleteLabel = completeNums.size ? MONTHS[Math.max(...completeNums) - 1] : "";

  // Deltas: same-period (aligned) when the current year is partial, full-year otherwise.
  const revDelta = isPartial
    ? (prevA.revenue ? deltaPct(curA.revenue, prevA.revenue) : null)
    : (prevHeadline ? deltaPct(headline.revenue, prevHeadline.revenue) : null);
  const expDelta = isPartial
    ? (prevA.expense ? deltaPct(curA.expense, prevA.expense) : null)
    : (prevHeadline ? deltaPct(headline.expense, prevHeadline.expense) : null);
  const gmDelta = isPartial
    ? (prevA.gm ? deltaPct(curA.gm, prevA.gm) : null)
    : (prevHeadline ? deltaPct(headline.gross_margin, prevHeadline.gross_margin) : null);
  const mpctDelta = isPartial
    ? (prevA.revenue ? curA.mpct - prevA.mpct : null)
    : (prevHeadline && prevHeadline.margin_pct !== 0 ? headline.margin_pct - prevHeadline.margin_pct : null);

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {COMPANY_LABEL[company] ?? company} · {year}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPartial
              ? `Year-to-date through ${lastCompleteLabel} ${year}. Growth compares the same period last year.`
              : "Revenue, cost, and profit margin for the year."}
          </p>
        </div>
        <YearSelect />
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Kpi
          icon={<DollarSign />}
          label="Revenue"
          value={formatMoney(headline.revenue)}
          delta={revDelta}
        />
        <Kpi
          icon={<TrendingUp />}
          label="COGS"
          value={formatMoney(headline.expense)}
          delta={expDelta}
          invertDelta
        />
        <Kpi
          icon={<TrendingUp />}
          label="Gross Margin"
          value={formatMoney(headline.gross_margin)}
          tone={headline.gross_margin >= 0 ? "good" : "bad"}
          delta={gmDelta}
        />
        <Kpi
          icon={<Percent />}
          label="Margin %"
          value={formatPct(headline.margin_pct)}
          tone={headline.margin_pct >= 15 ? "good" : headline.margin_pct >= 0 ? "warn" : "bad"}
          delta={mpctDelta}
          deltaUnit="pp"
        />
      </div>

      {/* Secondary KPI: clients + consultants + hours */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <SecondaryKpi icon={<Briefcase />} label="Clients" value={headline.client_count.toString()} sub={`active in ${year}`} />
        <SecondaryKpi icon={<Users />} label="Consultants" value={headline.consultant_count_sum.toString()} sub={`distinct billed in ${year}`} />
        <SecondaryKpi icon={<TrendingUp />} label="Total Hours" value={headline.total_hours.toLocaleString(undefined, { maximumFractionDigits: 0 })} sub={`billable hours in ${year}`} />
      </div>

      {/* Monthly bar chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Monthly revenue, cost & margin</CardTitle>
          <CardDescription className="text-xs">
            Each month&apos;s revenue, COGS and gross margin. Year {year}.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-2">
          {monthlyLoading || !monthly ? (
            <Skeleton className="h-40 w-full" />
          ) : monthRows.length === 0 ? (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              No data for {year}.
            </div>
          ) : (
            <div>
              <div className="mb-1 ml-12 text-[11px] font-semibold uppercase tracking-wider text-foreground">
                Left: revenue & COGS · Right: gross margin (both zoomed to range)
              </div>
              <ChartContainer config={chartConfig} className="h-[260px] w-full md:h-[320px]">
                <AreaChart data={monthRows} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="fillRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillExpense" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-margin)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-margin)" stopOpacity={0.1} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="month"
                    tickLine={false}
                    axisLine={true}
                    tickMargin={6}
                    tickFormatter={(v: string) => v.slice(5)}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  />
                  {/* Zoomed axes (the CEO 2026-06-09): starting at $0 flattens
                      the story · revenue moves $5.2-5.9M but reads as a flat
                      line. Left axis zooms to the revenue/COGS band; margin
                      gets its own zoomed right axis (it lives near $0.5M and
                      would otherwise pin the floor back toward zero). */}
                  <YAxis
                    yAxisId="usd"
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={true}
                    tickMargin={6}
                    tickFormatter={(v: number) => compactMoney(v)}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    width={52}
                  />
                  <YAxis
                    yAxisId="margin"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={true}
                    tickMargin={6}
                    tickFormatter={(v: number) => compactMoney(v)}
                    tick={{ fontSize: 11, fill: "var(--color-margin)" }}
                    width={52}
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
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    yAxisId="usd"
                    dataKey="revenue"
                    type="monotone"
                    fill="url(#fillRevenue)"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="usd"
                    dataKey="expense"
                    type="monotone"
                    fill="url(#fillExpense)"
                    stroke="var(--color-expense)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="margin"
                    dataKey="margin"
                    type="monotone"
                    fill="url(#fillMargin)"
                    stroke="var(--color-margin)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
              <div className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wider text-foreground">
                X axis: Month
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revenue per billing day · finance's normalized run rate.
          Short months (Feb 20 days) vs long (Oct 23) distort raw monthly
          revenue; dividing by working days shows the true pace — same
          metric as the bottom rows of finance's income statement. */}
      {monthRows.some((m) => m.revPerDay != null) ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Revenue per billing day</CardTitle>
            <CardDescription className="text-xs">
              Monthly revenue ÷ working days in the month. Removes the
              short-month effect so the real pace shows. Year {year}.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-3 pb-2">
            <ChartContainer config={revPerDayConfig} className="h-[200px] w-full md:h-[240px]">
              <AreaChart
                data={monthRows.filter((m) => m.revPerDay != null)}
                margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="fillRevPerDay" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revPerDay)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-revPerDay)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={true}
                  tickMargin={6}
                  tickFormatter={(v: string) => v.slice(5)}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={true}
                  tickMargin={6}
                  tickFormatter={(v: number) => compactMoneyTick(v)}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  width={56}
                />
                <ChartTooltip
                  cursor={false}
                  content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const p = payload[0]?.payload as (typeof monthRows)[number];
                    return (
                      <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                        <div className="font-medium">{p.month}</div>
                        <div className="mt-1 tabular-nums">
                          {formatMoney(p.revPerDay ?? 0)} / day
                          <span className="ml-2 text-muted-foreground">
                            {p.billingDays} billing days
                          </span>
                        </div>
                      </div>
                    );
                  }}
                />
                <Area
                  dataKey="revPerDay"
                  type="monotone"
                  fill="url(#fillRevPerDay)"
                  stroke="var(--color-revPerDay)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}

      {/* Top clients table */}
      <Card>
        <CardHeader>
          <CardTitle>Top 10 clients · {year}</CardTitle>
          <CardDescription>
            Sorted by revenue. Click client name to drill into per-consultant breakdown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {clientsLoading || !clients ? (
            <div className="space-y-2">
              {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
            </div>
          ) : clients.rows.length === 0 ? (
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">
              No clients in {year}.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead className="text-right">Consultants</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                  <TableHead className="text-right">COGS</TableHead>
                  <TableHead className="text-right">GM</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                  <TableHead className="text-right">AR Outstanding</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.rows.map((r) => (
                  <TableRow key={r.client_master_id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/clients/${encodeURIComponent(r.client_master_id)}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.client_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{r.consultant_count}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.revenue)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMoney(r.expense)}</TableCell>
                    <TableCell className={cn("text-right font-medium tabular-nums", r.gross_margin >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                      {formatMoney(r.gross_margin)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge
                        variant={r.margin_pct >= 15 ? "default" : "outline"}
                        className={cn(
                          r.margin_pct >= 15 ? "" : r.margin_pct >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {r.revenue > 0 ? formatPct(r.margin_pct) : "-"}
                      </Badge>
                    </TableCell>
                    <TableCell className={cn("text-right tabular-nums", r.ar_outstanding > 0 ? "text-sky-600 dark:text-sky-300" : "text-muted-foreground/50")}>
                      {r.ar_outstanding > 0 ? formatMoney(r.ar_outstanding) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/* ── helpers ── */

function deltaPct(now: number, prev: number): number | null {
  if (!prev || prev === 0) return null;
  return ((now - prev) / Math.abs(prev)) * 100;
}

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}

function Kpi({
  icon,
  label,
  value,
  delta,
  deltaUnit = "%",
  tone = "neutral",
  invertDelta = false,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  delta?: number | null;
  deltaUnit?: "%" | "pp";
  tone?: "neutral" | "good" | "warn" | "bad";
  invertDelta?: boolean;
}) {
  const cls = {
    neutral: "text-foreground",
    good: "text-emerald-600 dark:text-emerald-300",
    warn: "text-sky-600 dark:text-sky-300",
    bad: "text-rose-600 dark:text-rose-300",
  }[tone];
  const deltaGood = delta != null && (invertDelta ? delta < 0 : delta > 0);
  const deltaBad = delta != null && (invertDelta ? delta > 0 : delta < 0);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {icon && <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>}
      </CardHeader>
      <CardContent>
        <div className={cn("text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", cls)}>{value}</div>
        {delta != null && (
          <p className={cn(
            "mt-1 flex items-center gap-1 text-xs",
            deltaGood ? "text-emerald-600 dark:text-emerald-400" : deltaBad ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground",
          )}>
            {deltaGood ? <ArrowUpRight className="h-3 w-3" /> : deltaBad ? <ArrowDownRight className="h-3 w-3" /> : null}
            {deltaUnit === "pp"
              ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}pp YoY`
              : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}% YoY`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function SecondaryKpi({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <span className="text-muted-foreground [&_svg]:h-4 [&_svg]:w-4">{icon}</span>
      </CardHeader>
      <CardContent>
        <div className="text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl">{value}</div>
        <p className="text-xs text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}
