"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, Users, Receipt } from "lucide-react";

import { api } from "@/lib/api";
import { SRC } from "@/lib/labels";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

const composedConfig: ChartConfig = {
  revenue: { label: "Revenue", color: "var(--chart-1)" },
  cost: { label: "Cost", color: "var(--chart-3)" },
  margin: { label: "Margin", color: "var(--chart-2)" },
};

const barConfig: ChartConfig = {
  matched: { label: "Matched", color: "var(--chart-1)" },
  unmatched: { label: "Unmatched", color: "var(--chart-4)" },
};

export function VendorDetail({ vendorName }: { vendorName: string }) {
  const since = (() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 24);
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  })();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendor-monthly", vendorName, since],
    queryFn: () => api.getVendorMonthly(vendorName, { since }),
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-72 w-full rounded-xl" />
      </div>
    );
  }
  if (isError || !data || data.rows.length === 0) {
    return (
      <Alert className="border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-100">
        <AlertTriangle className="h-4 w-4 text-sky-600 dark:text-sky-300" />
        <AlertTitle>No monthly data for this vendor</AlertTitle>
        <AlertDescription>
          Vendor may be outside 4Subs scope or all bills fell outside the 24-month window.
        </AlertDescription>
      </Alert>
    );
  }

  const totals = data.rows.reduce(
    (acc, r) => {
      acc.revenue += Number(r.revenue);
      acc.cost += Number(r.cost);
      acc.gross_margin += Number(r.gross_margin);
      acc.consultants = Math.max(acc.consultants, r.billable_consultants);
      acc.bills += r.bills_count;
      acc.matched += r.matched_lines;
      acc.lines += r.bill_lines_count;
      return acc;
    },
    { revenue: 0, cost: 0, gross_margin: 0, consultants: 0, bills: 0, matched: 0, lines: 0 },
  );
  const marginPct = totals.revenue > 0 ? (totals.gross_margin / totals.revenue) * 100 : 0;
  const matchPct = totals.lines > 0 ? (totals.matched / totals.lines) * 100 : 0;

  const chartRows = data.rows.map((r) => ({
    month: r.period_month.slice(0, 7),
    revenue: Number(r.revenue),
    cost: Number(r.cost),
    margin: Number(r.gross_margin),
    matched: r.matched_lines,
    unmatched: r.unmatched_lines,
    consultants: r.billable_consultants,
    bills: r.bills_count,
  }));

  return (
    <div className="space-y-6">
      {/* ── Header Card ── */}
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="text-xl">{vendorName}</CardTitle>
              <CardDescription className="mt-1 flex items-center gap-2">
                <span>24-month view</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <Badge variant="outline" className="gap-1">
                <Users className="h-3 w-3" />
                {totals.consultants} consultants
              </Badge>
              <Badge variant="outline" className="gap-1">
                <Receipt className="h-3 w-3" />
                {totals.bills.toLocaleString()} bills
              </Badge>
            </div>
          </div>
        </CardHeader>

        {/* KPI Grid */}
        <CardContent className="grid grid-cols-2 gap-6 py-6 sm:grid-cols-4">
          <KpiItem label="Revenue (matched)" value={formatMoney(totals.revenue)} />
          <KpiItem label="Cost" value={formatMoney(totals.cost)} />
          <KpiItem
            label="Gross margin"
            value={formatMoney(totals.gross_margin)}
            tone={totals.gross_margin >= 0 ? "good" : "bad"}
          />
          <KpiItem
            label="Margin %"
            value={totals.revenue > 0 ? formatPct(marginPct) : "-"}
            tone={totals.revenue <= 0 ? "neutral" : marginPct >= 30 ? "good" : marginPct >= 0 ? "warn" : "bad"}
          />
        </CardContent>

        {/* Match Rate */}
        <CardContent className="border-t space-y-2 py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Bill line match rate</span>
            <span className="tabular-nums font-medium">{formatPct(matchPct)}</span>
          </div>
          <Progress value={matchPct} />
          <div className="text-[11px] text-muted-foreground">
            {totals.matched.toLocaleString()} of {totals.lines.toLocaleString()} bill lines matched to {SRC.staffing} consultants
          </div>
        </CardContent>

        {matchPct < 80 && (
          <CardFooter className="border-t">
            <Alert className="w-full border-sky-500/30 bg-sky-500/5 text-sky-700 dark:text-sky-100">
              <AlertTriangle className="h-4 w-4 text-sky-600 dark:text-sky-300" />
              <AlertTitle>Low data confidence: {formatPct(matchPct)}</AlertTitle>
              <AlertDescription>
                Revenue side is partial - only matched lines contribute. Cost is complete.
              </AlertDescription>
            </Alert>
          </CardFooter>
        )}
      </Card>

      {/* ── Tabbed Analysis ── */}
      <Tabs defaultValue="trend">
        <TabsList variant="line" className="w-full justify-start border-b">
          <TabsTrigger value="trend">Trend</TabsTrigger>
          <TabsTrigger value="monthly">Monthly Detail</TabsTrigger>
          <TabsTrigger value="matching">Bill Matching</TabsTrigger>
        </TabsList>

        {/* ── Tab: Trend ── */}
        <TabsContent value="trend" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Revenue vs Cost</CardTitle>
              <CardDescription>
                Left: revenue & cost · Right: gross margin (axes zoomed to range)
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={composedConfig} className="h-80 w-full">
                <AreaChart data={chartRows} margin={{ left: 6, right: 6, top: 6 }}>
                  <defs>
                    <linearGradient id="fillVdRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-revenue)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-revenue)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillVdCost" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-cost)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-cost)" stopOpacity={0.1} />
                    </linearGradient>
                    <linearGradient id="fillVdMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-margin)" stopOpacity={0.8} />
                      <stop offset="95%" stopColor="var(--color-margin)" stopOpacity={0.1} />
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
                    yAxisId="left"
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) => compactMoney(v)}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={56}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    domain={["auto", "auto"]}
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tickFormatter={(v: number) => compactMoney(v)}
                    tick={{ fontSize: 11, fill: "var(--color-margin)" }}
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
                    yAxisId="left"
                    dataKey="revenue"
                    type="monotone"
                    fill="url(#fillVdRevenue)"
                    stroke="var(--color-revenue)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="left"
                    dataKey="cost"
                    type="monotone"
                    fill="url(#fillVdCost)"
                    stroke="var(--color-cost)"
                    strokeWidth={2}
                  />
                  <Area
                    yAxisId="right"
                    dataKey="margin"
                    type="monotone"
                    fill="url(#fillVdMargin)"
                    stroke="var(--color-margin)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Tab: Monthly Detail ── */}
        <TabsContent value="monthly" className="space-y-6 pt-4">
          <Card>
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Monthly Breakdown</CardTitle>
                  <CardDescription>{data.rows.length} months</CardDescription>
                </div>
                <Badge variant="outline">{data.rows.length} rows</Badge>
              </div>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 hover:bg-transparent">
                    <TableHead className="text-muted-foreground">Month</TableHead>
                    <TableHead className="text-right text-muted-foreground">Revenue</TableHead>
                    <TableHead className="text-right text-muted-foreground">Cost</TableHead>
                    <TableHead className="text-right text-muted-foreground">Margin</TableHead>
                    <TableHead className="text-right text-muted-foreground">Margin %</TableHead>
                    <TableHead className="text-right text-muted-foreground">Consultants</TableHead>
                    <TableHead className="text-right text-muted-foreground">Bills</TableHead>
                    <TableHead className="text-right text-muted-foreground">Match %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.rows.slice().reverse().map((row) => {
                    const rev = Number(row.revenue);
                    const cost = Number(row.cost);
                    const gm = Number(row.gross_margin);
                    const mp = Number(row.margin_pct);
                    const mr = Number(row.match_rate_pct);
                    return (
                      <TableRow key={row.period_month} className="border-border/40 hover:bg-foreground/[0.03]">
                        <TableCell className="text-xs tabular-nums">{row.period_month.slice(0, 7)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatMoney(rev)}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums">{formatMoney(cost)}</TableCell>
                        <TableCell className={cn("text-right text-xs font-medium tabular-nums", gm >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                          {formatMoney(gm)}
                        </TableCell>
                        <TableCell className={cn("text-right text-xs tabular-nums", mp >= 30 ? "text-emerald-600 dark:text-emerald-300" : mp >= 0 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                          {rev > 0 ? formatPct(mp) : "-"}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{row.billable_consultants}</TableCell>
                        <TableCell className="text-right text-xs tabular-nums text-muted-foreground">{row.bills_count}</TableCell>
                        <TableCell className={cn("text-right text-xs tabular-nums", mr >= 80 ? "text-emerald-600 dark:text-emerald-300" : mr >= 50 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                          {formatPct(mr)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ── Tab: Bill Matching ── */}
        <TabsContent value="matching" className="space-y-6 pt-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <KpiCard label="Total Bill Lines" value={totals.lines.toLocaleString()} />
            <KpiCard label="Matched Lines" value={totals.matched.toLocaleString()} />
            <KpiCard
              label="Match Rate"
              value={formatPct(matchPct)}
              tone={matchPct >= 80 ? "good" : matchPct >= 50 ? "warn" : "bad"}
            />
            <KpiCard
              label="Unmatched Lines"
              value={(totals.lines - totals.matched).toLocaleString()}
              tone={totals.lines - totals.matched === 0 ? "good" : "warn"}
            />
          </div>

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Matched vs Unmatched by Month</CardTitle>
              <CardDescription>Bill lines matched to {SRC.staffing} consultants via memo</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ChartContainer config={barConfig} className="h-64 w-full">
                <BarChart data={chartRows} margin={{ left: 6, right: 6, top: 6 }}>
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
                    tickLine={false}
                    axisLine={false}
                    tickMargin={8}
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                    width={40}
                  />
                  <ChartTooltip
                    cursor={{ fill: "var(--accent)", opacity: 0.15 }}
                    content={<ChartTooltipContent indicator="dot" />}
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Bar dataKey="matched" stackId="a" fill="var(--color-matched)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="unmatched" stackId="a" fill="var(--color-unmatched)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ── Sub-components ── */

function KpiItem({
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
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-semibold tabular-nums break-words sm:text-xl break-words sm:text-2xl", cls)}>{value}</div>
    </div>
  );
}

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

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}
