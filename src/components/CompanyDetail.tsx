"use client";

import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Loader2, Users, ClipboardList } from "lucide-react";

import { api } from "@/lib/api";
import { COMPANY_LABELS } from "@/lib/labels";
import {
  Card,
  CardContent,
  CardDescription,
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
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

const chartConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  expenses: { label: "COGS", color: "var(--chart-3)" },
  profit: { label: "Profit", color: "var(--chart-2)" },
};

const COMPANY_LABEL = COMPANY_LABELS;

export function CompanyDetail({ entity }: { entity: "a" | "b" }) {
  const since = (() => {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() - 24;
    const d = new Date(Date.UTC(y, m, 1));
    return d.toISOString().slice(0, 10);
  })();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["company", entity, since],
    queryFn: () => api.getCompany({ source_company: entity, since }),
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{COMPANY_LABEL[entity] ?? `Company ${entity.toUpperCase()}`}</CardTitle>
          <CardDescription>Loading 24-month detail…</CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-72 w-full" />
        </CardContent>
      </Card>
    );
  }
  if (isError || !data || data.rows.length === 0) {
    return (
      <Card className="border-destructive/40 bg-destructive/5">
        <CardContent className="py-6 text-sm text-destructive flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin" />
          Company data unavailable.
        </CardContent>
      </Card>
    );
  }

  const rows12 = data.rows.slice(-12);
  const revenue = rows12.reduce((s, r) => s + Number(r.revenue), 0);
  const profit = rows12.reduce((s, r) => s + Number(r.profit), 0);
  const expenses = rows12.reduce((s, r) => s + Number(r.total_expenses), 0);
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0;
  const last = data.rows[data.rows.length - 1];

  const chartRows = data.rows.map((r) => ({
    month: r.period_month.slice(0, 7),
    revenue: Number(r.revenue),
    expenses: Number(r.total_expenses),
    profit: Number(r.profit),
  }));

  const gaps = last.gaps;
  const openGaps = Object.entries(gaps)
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, " "));

  return (
    <div className="space-y-6">
      <Card className="card-glow transition">
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-base">
                {COMPANY_LABEL[entity] ?? `Company ${entity.toUpperCase()}`}
              </CardTitle>
              <CardDescription>
                Last 12 months.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {last.active_consultants.toLocaleString()} consultants
              </span>
              <span className="inline-flex items-center gap-1">
                <ClipboardList className="h-3.5 w-3.5" />
                {last.active_assignments.toLocaleString()} assignments
              </span>
            </div>
          </div>
        </CardHeader>

        <CardContent className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
          <Kpi label="Revenue (12M)" value={formatMoney(revenue)} />
          <Kpi label="COGS (12M)" value={formatMoney(expenses)} />
          <Kpi
            label="Profit (12M)"
            value={formatMoney(profit)}
            tone={profit >= 0 ? "good" : "bad"}
          />
          <Kpi
            label="Margin (12M)"
            value={formatPct(margin)}
            tone={margin >= 5 ? "good" : margin >= 0 ? "warn" : "bad"}
          />
        </CardContent>

        {openGaps.length > 0 ? (
          <div className="border-t px-6 py-3 text-xs text-muted-foreground">
            <span className="mr-2">Open data gaps:</span>
            <span className="text-sky-700/90 dark:text-sky-200/90">{openGaps.join(" · ")}</span>
          </div>
        ) : null}
      </Card>

      <Card className="card-glow transition">
        <CardHeader className="border-b">
          <CardTitle className="text-base">
            Revenue · Expenses · Profit
          </CardTitle>
          <CardDescription>
            Monthly · left: revenue & COGS · right: profit (axes zoomed to range)
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ChartContainer config={chartConfig} className="h-72 w-full">
            <AreaChart data={chartRows} margin={{ left: 6, right: 6, top: 6 }}>
              <defs>
                <linearGradient id="fillCoRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCoExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-expenses)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-expenses)" stopOpacity={0.1} />
                </linearGradient>
                <linearGradient id="fillCoProfit" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-profit)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="var(--color-profit)" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="month"
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: string) => v.slice(2)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              />
              <YAxis
                yAxisId="usd"
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => compactMoney(v)}
                tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                width={56}
              />
              <YAxis
                yAxisId="profit"
                orientation="right"
                domain={["auto", "auto"]}
                tickLine={false}
                axisLine={false}
                tickMargin={8}
                tickFormatter={(v: number) => compactMoney(v)}
                tick={{ fontSize: 11, fill: "var(--color-profit)" }}
                width={56}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    indicator="dot"
                    formatter={(value) => formatMoney(Number(value))}
                  />
                }
              />
              <ChartLegend content={<ChartLegendContent />} />
              <Area
                yAxisId="usd"
                dataKey="revenue"
                type="monotone"
                fill="url(#fillCoRevenue)"
                stroke="var(--color-revenue)"
                strokeWidth={2}
              />
              <Area
                yAxisId="usd"
                dataKey="expenses"
                type="monotone"
                fill="url(#fillCoExpenses)"
                stroke="var(--color-expenses)"
                strokeWidth={2}
              />
              <Area
                yAxisId="profit"
                dataKey="profit"
                type="monotone"
                fill="url(#fillCoProfit)"
                stroke="var(--color-profit)"
                strokeWidth={2}
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>
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
    <div className="space-y-1">
      <div className="text-xs uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={cn("text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", cls)}>
        {value}
      </div>
    </div>
  );
}

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}
