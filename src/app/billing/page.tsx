"use client";

/**
 * Billing · the billed/received side of AR, in its own tab.
 *
 * Finance asked for billed amounts SEPARATE from the aging view (the
 * 2026-06-10 call): the AR page is the aging report (open balances by
 * days past due, snapshot), this page is what was billed and collected
 * per year — by month and by customer.
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COMPANY_LABEL = COMPANY_LABELS;

// 2026-05-20: AR data locked to >= 2024 per CFO.
const BILLING_MIN_YEAR = 2024;

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const billingChartConfig: ChartConfig = {
  billed: { label: "Billed", color: "var(--chart-1)" },
  received: { label: "Received", color: "var(--chart-2)" },
};

export default function BillingPage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = React.useState<number>(currentYear);
  const yearsAvailable = React.useMemo(() => {
    const ys: number[] = [];
    for (let y = currentYear; y >= BILLING_MIN_YEAR; y--) ys.push(y);
    return ys;
  }, [currentYear]);

  const company = useDashboardStore((s) => s.company);
  const sourceCompany: "a" | "b" = company === "itech" ? "a" : "b";

  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: ["billing-summary", year, sourceCompany],
    queryFn: () => api.getArSummary(year),
  });
  const { data: byClient, isLoading: clientsLoading } = useQuery({
    queryKey: ["billing-by-client", year, sourceCompany, 25],
    queryFn: () => api.getArByClient({ year, sourceCompany, limit: 25 }),
  });
  const { data: monthly } = useQuery({
    queryKey: ["billing-monthly", company, year],
    queryFn: () => api.getCompanyArMonthly(company, year),
  });

  if (sumLoading || clientsLoading || !summary || !byClient) {
    return (
      <div className="space-y-6 px-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const myCompanies = summary.companies.filter(
    (c) => c.source_company === sourceCompany,
  );
  const total = myCompanies.reduce(
    (acc, c) => {
      acc.billed += c.billed_total;
      acc.received += c.received_total;
      acc.invoices += c.invoice_count;
      return acc;
    },
    { billed: 0, received: 0, invoices: 0 },
  );
  const collectedPct = total.billed > 0 ? (total.received / total.billed) * 100 : 0;

  return (
    <div className="space-y-6 px-6 py-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Billing · {COMPANY_LABEL[sourceCompany]} · {year}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            What was billed and collected in {year}, by month and by
            customer. Open balances by days past due live on the AR page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">
            Year
          </span>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
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
      </header>

      {/* Year totals */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label={`Billed ${year}`} value={formatMoney(total.billed)} />
        <KpiCard label={`Received ${year}`} value={formatMoney(total.received)} tone="good" />
        <KpiCard label="Invoices" value={total.invoices.toLocaleString()} />
        <KpiCard
          label="Collected %"
          value={`${collectedPct.toFixed(1)}%`}
          tone={collectedPct >= 90 ? "good" : collectedPct >= 70 ? "warn" : "bad"}
        />
      </div>

      {/* Billed vs received by month */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Billed vs received · {year}</CardTitle>
          <CardDescription className="text-xs">
            Each month&apos;s billings and what has been collected from them.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {!monthly || monthly.rows.length === 0 ? (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              No billing for {year}.
            </div>
          ) : (
            <ChartContainer config={billingChartConfig} className="h-[260px] w-full md:h-[300px]">
              <AreaChart
                data={monthly.rows.map((m) => ({
                  month: m.period_month.slice(0, 7),
                  billed: m.billed,
                  received: m.received,
                }))}
                margin={{ left: 4, right: 8, top: 4, bottom: 4 }}
              >
                <defs>
                  <linearGradient id="fillBillBilled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-billed)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-billed)" stopOpacity={0.1} />
                  </linearGradient>
                  <linearGradient id="fillBillReceived" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-received)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-received)" stopOpacity={0.1} />
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
                <Area dataKey="billed" type="monotone" fill="url(#fillBillBilled)" stroke="var(--color-billed)" strokeWidth={2} />
                <Area dataKey="received" type="monotone" fill="url(#fillBillReceived)" stroke="var(--color-received)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Month-by-month with billing days — finance's workable-day view.
          Billed ÷ billing days = the true monthly pace (Feb's 20 days vs
          Oct's 23 otherwise distort the comparison). */}
      {monthly && monthly.rows.length > 0 ? (
        <Card>
          <CardHeader className="border-b py-3">
            <CardTitle className="text-base">By month · {year}</CardTitle>
            <CardDescription className="text-[11px]">
              Billing days = workable days in the month (finance&apos;s
              calendar). Billed / day removes the short-month effect.
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Month</TableHead>
                  <TableHead className="text-right text-muted-foreground">Billing days</TableHead>
                  <TableHead className="text-right text-muted-foreground">Billed</TableHead>
                  <TableHead className="text-right text-muted-foreground">Billed / day</TableHead>
                  <TableHead className="text-right text-muted-foreground">Received</TableHead>
                  <TableHead className="text-right text-muted-foreground">Coll %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monthly.rows.map((m) => {
                  const coll = m.billed > 0 ? (m.received / m.billed) * 100 : 0;
                  return (
                    <TableRow key={m.month} className="border-border/40 hover:bg-foreground/[0.03]">
                      <TableCell className="text-xs">{MONTH_NAMES[m.month - 1]}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {m.billing_days ?? "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatMoney(m.billed)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-medium tabular-nums">
                        {m.billed_per_day != null ? formatMoney(m.billed_per_day) : "—"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-emerald-600/80 dark:text-emerald-300/80">
                        {formatMoney(m.received)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs tabular-nums",
                          coll >= 90
                            ? "text-emerald-600 dark:text-emerald-300"
                            : coll >= 70
                              ? "text-sky-600 dark:text-sky-300"
                              : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {formatPct(coll)}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Year totals row */}
                <TableRow className="border-t font-medium hover:bg-transparent">
                  <TableCell className="text-xs">Total</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {monthly.rows.reduce((s, m) => s + (m.billing_days ?? 0), 0) || "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatMoney(monthly.rows.reduce((s, m) => s + m.billed, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {(() => {
                      const days = monthly.rows.reduce((s, m) => s + (m.billing_days ?? 0), 0);
                      const billed = monthly.rows.reduce((s, m) => s + m.billed, 0);
                      return days > 0 ? formatMoney(billed / days) : "—";
                    })()}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatMoney(monthly.rows.reduce((s, m) => s + m.received, 0))}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {(() => {
                      const billed = monthly.rows.reduce((s, m) => s + m.billed, 0);
                      const rec = monthly.rows.reduce((s, m) => s + m.received, 0);
                      return formatPct(billed > 0 ? (rec / billed) * 100 : 0);
                    })()}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </Card>
      ) : null}

      {/* Per-customer billed for the year */}
      <Card>
        <CardHeader className="border-b py-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">
                Top 25 customers by billed · {year}
              </CardTitle>
              <CardDescription className="text-[11px]">
                Billed, received, and collection rate per customer.
              </CardDescription>
            </div>
            <Badge variant="outline">{byClient.total} customers</Badge>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Customer</TableHead>
                <TableHead className="text-right text-muted-foreground">Invoices</TableHead>
                <TableHead className="text-right text-muted-foreground">Billed</TableHead>
                <TableHead className="text-right text-muted-foreground">Received</TableHead>
                <TableHead className="text-right text-muted-foreground">Coll %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {byClient.rows.map((r, i) => (
                <TableRow
                  key={`${r.source_company}-${r.client_master_id ?? i}`}
                  className="border-border/40 hover:bg-foreground/[0.03]"
                >
                  <TableCell className="text-xs">
                    <div className="max-w-[280px] truncate">{r.client_name || "-"}</div>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{r.invoice_count}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatMoney(r.billed_total)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-emerald-600/80 dark:text-emerald-300/80">{formatMoney(r.received_total)}</TableCell>
                  <TableCell className={cn("text-right text-xs tabular-nums", r.collected_pct >= 90 ? "text-emerald-600 dark:text-emerald-300" : r.collected_pct >= 70 ? "text-sky-600 dark:text-sky-300" : "text-rose-600 dark:text-rose-300")}>
                    {formatPct(r.collected_pct)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  tone = "neutral",
  sub,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn" | "bad";
  sub?: string;
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
        <div className={cn("mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl", cls)}>{value}</div>
        {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
