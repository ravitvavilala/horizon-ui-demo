"use client";

/**
 * Companies page - shadcn /charts Area Gradient aesthetic.
 *
 * Each company card carries:
 *   1. KPI band (Revenue / GM / Margin %)
 *   2. Area Chart - Gradient - current-year monthly revenue vs expense
 *   3. Lifetime Line Chart - multi-year metric trend (dropdown picks metric)
 *   4. Top-5 clients table
 */

/**
 * Refactored 2026-05-20 - line charts gone, lifetime cross-year card
 * removed. YTD only. Monthly views are grouped bars with explicit YAxis
 * dollar labels.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { YearSelect } from "@/components/YearSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

export const dynamic = "force-dynamic";

const barConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expense: { label: "COGS", color: "var(--chart-3)" },
} satisfies ChartConfig;

const yAxisDollarTick = (v: number) => compactMoneyTick(v);

function formatMonth(iso: string): string {
  return new Date(iso).toLocaleString("en-US", { month: "long" });
}

export default function CompaniesPage() {
  const year = useDashboardStore((s) => s.year);

  return (
    <div className="space-y-8 px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Companies · {year}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {COMPANY_LABELS.itech} and {COMPANY_LABELS.smartworks} side-by-side.
          </p>
        </div>
        <YearSelect />
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <CompanyCard company="itech" year={year} />
        <CompanyCard company="smartworks" year={year} />
      </div>
    </div>
  );
}

function CompanyCard({
  company,
  year,
}: {
  company: "itech" | "smartworks";
  year: number;
}) {
  const { data: headline, isLoading: hL } = useQuery({
    queryKey: ["company-card-headline", company, year],
    queryFn: () => api.getCompanyHeadline(company, year),
  });
  const { data: monthly, isLoading: mL } = useQuery({
    queryKey: ["company-card-monthly", company, year],
    queryFn: () => api.getCompanyMonthly(company, year),
  });
  const { data: clients, isLoading: cL } = useQuery({
    queryKey: ["company-card-top5", company, year],
    queryFn: () => api.getCompanyClients(company, year, 5),
  });

  if (hL || !headline) {
    return <Skeleton className="h-[640px] rounded-xl" />;
  }

  const months = (monthly?.months ?? []).map((m) => ({
    month: formatMonth(m.period_month),
    revenue: m.revenue,
    expense: m.expense,
  }));

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-2xl font-semibold">
          {headline.company_name}
        </CardTitle>
        <CardDescription className="text-xs">
          {year} · {headline.client_count} clients ·{" "}
          {headline.consultant_count_sum} consultant-engagements
        </CardDescription>
      </CardHeader>

      <CardContent className="grid grid-cols-3 gap-3 border-b py-6 sm:gap-6 sm:py-7">
        <Kpi label="Revenue" value={formatMoney(headline.revenue)} />
        <Kpi
          label="Gross Margin"
          value={formatMoney(headline.gross_margin)}
          tone={headline.gross_margin >= 0 ? "good" : "bad"}
        />
        <Kpi
          label="Margin %"
          value={formatPct(headline.margin_pct)}
          tone={
            headline.margin_pct >= 15
              ? "good"
              : headline.margin_pct >= 0
                ? "warn"
                : "bad"
          }
        />
      </CardContent>

      {/* Monthly bars: revenue vs expense */}
      <CardHeader className="pt-4 pb-2">
        <CardTitle className="text-base">Monthly Revenue vs COGS</CardTitle>
        <CardDescription className="text-xs">
          Blue (revenue) above red (expense) = profit that month. Axis zoomed
          to range. YTD {year}.
        </CardDescription>
      </CardHeader>
      <CardContent className="px-3 pb-2">
        {mL || !monthly ? (
          <Skeleton className="h-56 w-full" />
        ) : months.length === 0 ? (
          <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
            No monthly data for {year}.
          </div>
        ) : (
          <div>
            <div className="mb-1 ml-12 text-[11px] font-semibold uppercase tracking-wider text-foreground">
              Y axis: Dollars (USD)
            </div>
            <ChartContainer config={barConfig} className="h-[220px] w-full md:h-[260px]">
              <AreaChart
                accessibilityLayer
                data={months}
                margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id={`fillCmpRev-${company}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id={`fillCmpExp-${company}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-expense)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-expense)" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={true}
                  tickMargin={6}
                  tickFormatter={(v: string) => v.slice(0, 3)}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
                />
                <YAxis
                  domain={["auto", "auto"]}
                  tickLine={false}
                  axisLine={true}
                  tickFormatter={yAxisDollarTick}
                  width={52}
                  tick={{ fontSize: 11, fill: "var(--foreground)" }}
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
                <Area dataKey="revenue" type="monotone" fill={`url(#fillCmpRev-${company})`} stroke="var(--color-revenue)" strokeWidth={2} />
                <Area dataKey="expense" type="monotone" fill={`url(#fillCmpExp-${company})`} stroke="var(--color-expense)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
            <div className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wider text-foreground">
              X axis: Month
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-b text-xs text-muted-foreground">
        Read: blue bar = what clients pay us. Red bar = what we pay out.
      </CardFooter>

      {/* Top 5 clients */}
      <CardContent className="py-5">
        <div className="mb-3 text-[11px] uppercase tracking-wider text-muted-foreground">
          Top 5 clients · {year}
        </div>
        {cL || !clients ? (
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : clients.rows.length === 0 ? (
          <div className="text-sm text-muted-foreground">
            No client revenue in {year}.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-border/40 hover:bg-transparent">
                <TableHead className="text-[11px]">Client</TableHead>
                <TableHead className="text-right text-[11px]">
                  Revenue
                </TableHead>
                <TableHead className="text-right text-[11px]">Margin</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.rows.map((r) => (
                <TableRow
                  key={r.client_master_id}
                  className="border-border/30 hover:bg-foreground/[0.03]"
                >
                  <TableCell className="max-w-[220px] truncate text-xs font-medium">
                    {r.client_name}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatMoney(r.revenue)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right text-xs tabular-nums",
                      r.revenue <= 0
                        ? "text-muted-foreground/50"
                        : r.margin_pct >= 15
                          ? "text-emerald-600 dark:text-emerald-300"
                          : r.margin_pct >= 0
                            ? "text-sky-600 dark:text-sky-300"
                            : "text-rose-600 dark:text-rose-300",
                    )}
                  >
                    {r.revenue > 0 ? formatPct(r.margin_pct) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
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
    <div className="min-w-0 space-y-1">
      <div className="text-[10px] uppercase leading-tight tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "font-semibold tabular-nums leading-tight",
          "text-base sm:text-xl lg:text-2xl",
          cls,
        )}
      >
        {value}
      </div>
    </div>
  );
}
