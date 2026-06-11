"use client";

/**
 * Customers · Finance's "Margin by Customer" view, replicated.
 *
 * the finance lead's pivot groups by MSP channel (T_INVOICE_COMPANY_NAME): who we bill
 * THROUGH (TCS, Cognizant, Tek…), not the end client where the consultant
 * sits (that's the Clients page). Columns mirror his sheet: Bill, Margin,
 * Margin %, Sales % of Total, Margin % of Total · per month or full year.
 *
 * Two margin bases, both shown:
 *  - "the finance lead basis" = his exact pivot formula (flat 7.86% tax accrual) -
 *    replicates his sheet (penny-verified at consultant grain for 86/89
 *    same-data customers, Mar-2026).
 *  - "Actual" = actual employer tax tied to QB GL 5020 (the books).
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import { COMPANY_LABELS } from "@/lib/labels";
import {
  Card,
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { YearSelect } from "@/components/YearSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COMPANY_LABEL = COMPANY_LABELS;
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default function CustomersPage() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);
  const [month, setMonth] = React.useState<string>("all");
  const [q, setQ] = React.useState("");

  const monthNum = month === "all" ? null : Number(month);
  const { data, isLoading } = useQuery({
    queryKey: ["customers", company, year, monthNum],
    queryFn: () => api.getCompanyCustomers(company, year, monthNum),
  });

  const rows = React.useMemo(() => {
    const list = data?.rows ?? [];
    return q
      ? list.filter((r) => r.msp_channel.toLowerCase().includes(q.toLowerCase()))
      : list;
  }, [data, q]);

  const totals = React.useMemo(() => {
    const list = data?.rows ?? [];
    const bill = list.reduce((s, r) => s + r.revenue, 0);
    const recon = list.reduce((s, r) => s + r.recon_margin, 0);
    const act = list.reduce((s, r) => s + r.margin, 0);
    return { bill, recon, act };
  }, [data]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Customers · {COMPANY_LABEL[company]} · {month === "all" ? year : `${MONTHS[Number(month) - 1]} ${year}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Margin by customer · who we bill through (the MSP channel).
            End clients live on the Clients page.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            placeholder="Search customer…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 w-48 text-xs"
          />
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 w-[130px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="all">Full year</SelectItem>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>
                    {m}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <YearSelect />
        </div>
      </header>

      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-base">
            {rows.length} customers ·{" "}
            <span className="tabular-nums">{formatMoney(totals.bill)}</span> billed ·{" "}
            <span className="tabular-nums">{formatMoney(totals.recon)}</span> margin (
            {formatPct(totals.bill ? (totals.recon / totals.bill) * 100 : 0)})
          </CardTitle>
          <CardDescription className="text-xs">
            Margin uses the standard pivot formula (flat tax accrual).
            &ldquo;Actual %&rdquo; uses the real employer tax tied to the books
            (GL 5020). Same company total either way. Every number is computed
            from the source systems.
          </CardDescription>
        </CardHeader>
        {isLoading || !data ? (
          <div className="space-y-2 p-6">
            {[...Array(10)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-full" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            No billing for this selection.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-right text-muted-foreground">Bill Amount</TableHead>
                  <TableHead className="text-right text-muted-foreground">Margin</TableHead>
                  <TableHead className="text-right text-muted-foreground">Margin %</TableHead>
                  <TableHead className="text-right text-muted-foreground">Actual %</TableHead>
                  <TableHead className="text-right text-muted-foreground">Sales % of Total</TableHead>
                  <TableHead className="text-right text-muted-foreground">Margin % of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const mpct = r.revenue > 0 ? (r.recon_margin / r.revenue) * 100 : 0;
                  return (
                    <TableRow key={r.msp_channel} className="border-border/40 hover:bg-foreground/[0.03]">
                      <TableCell className="text-sm">{r.msp_channel}</TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {formatMoney(r.revenue)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs font-medium tabular-nums",
                          r.recon_margin >= 0
                            ? "text-emerald-600 dark:text-emerald-300"
                            : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {formatMoney(r.recon_margin)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-xs tabular-nums",
                          mpct >= 15
                            ? "text-emerald-600 dark:text-emerald-300"
                            : mpct >= 0
                              ? "text-sky-600 dark:text-sky-300"
                              : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {formatPct(mpct)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                        {formatPct(r.margin_pct)}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {totals.bill > 0 ? formatPct((r.revenue / totals.bill) * 100) : "-"}
                      </TableCell>
                      <TableCell className="text-right text-xs tabular-nums">
                        {totals.recon > 0 ? formatPct((r.recon_margin / totals.recon) * 100) : "-"}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Grand total · mirrors the sheet's bottom row */}
                <TableRow className="border-t font-medium hover:bg-transparent">
                  <TableCell className="text-sm">Grand Total</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatMoney(totals.bill)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatMoney(totals.recon)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">
                    {formatPct(totals.bill ? (totals.recon / totals.bill) * 100 : 0)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                    {formatPct(totals.bill ? (totals.act / totals.bill) * 100 : 0)}
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">100.0%</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">100.0%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}
