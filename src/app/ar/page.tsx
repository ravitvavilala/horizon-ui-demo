"use client";

/**
 * AR · finance's the staffing system "Summary Term Aging" report, replicated.
 *
 * Snapshot view (not year-scoped): every open balance after cash
 * application, aged by TERMS due date — invoice date + payment terms
 * vs today, per the finance lead's 2026-06-10 walkthrough. Per-account
 * figures verified penny-exact against that day's report run.
 * Billed/received by year live on the Billing page.
 */

import { useQuery } from "@tanstack/react-query";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COMPANY_LABEL = COMPANY_LABELS;

export default function ArPage() {
  const company = useDashboardStore((s) => s.company);

  // Snapshot of the AR ledger after cash application — partial payments
  // netted, aged by terms due date. Same basis as finance's report.
  const { data: termAging, isLoading } = useQuery({
    queryKey: ["ar-term-aging", company],
    queryFn: () => api.getCompanyArTermAging(company),
  });

  if (isLoading || !termAging) {
    return (
      <div className="space-y-6 px-6 py-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-28 rounded-xl" />
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  const t = termAging.totals;

  return (
    <div className="space-y-6 px-6 py-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          Accounts Receivable · {COMPANY_LABEL[company]}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Open balances by days past due, as of today. Partial payments are
          netted out — same basis as finance&apos;s aging report. Billed and
          received by year live on the Billing page.
        </p>
      </header>

      {/* The report's grand-total row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="A/R balance"
          value={formatMoney(t.ar_balance)}
          sub="open invoices + cash on account"
        />
        <KpiCard
          label="Open invoices"
          value={formatMoney(t.transaction_balance)}
        />
        <KpiCard
          label="Cash on account"
          value={formatMoney(t.cash_on_acct)}
          tone="good"
          sub="unapplied client payments"
        />
        <KpiCard
          label="DSO"
          value={t.dso_days != null ? `${t.dso_days} days` : "—"}
          tone={
            t.dso_days == null ? "neutral"
            : t.dso_days <= 45 ? "good"
            : t.dso_days <= 60 ? "warn"
            : "bad"
          }
          sub="days of billing sitting unpaid"
        />
      </div>

      {/* Aging buckets + per-customer table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">
            Aging · open balances by days past due
          </CardTitle>
          <CardDescription className="text-xs">
            &ldquo;Current&rdquo; is not yet due under the customer&apos;s
            payment terms (invoice date + terms vs today).{" "}
            <span className="text-rose-600 dark:text-rose-300">Over 60</span>{" "}
            is 60+ days past due and needs collection.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <AgeBucket label="Current (not yet due)" value={t.current_amt} tone="good" />
            <AgeBucket label="1–30 past due" value={t.overdue_0_30} tone="neutral" />
            <AgeBucket label="31–60 past due" value={t.overdue_31_60} tone="warn" />
            <AgeBucket label="Over 60 past due" value={t.overdue_60_plus} tone="bad" />
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border/60 hover:bg-transparent">
                  <TableHead className="text-muted-foreground">Customer</TableHead>
                  <TableHead className="text-right text-muted-foreground">Last pay</TableHead>
                  <TableHead className="text-right text-muted-foreground">A/R balance</TableHead>
                  <TableHead className="text-right text-muted-foreground">Cash on acct</TableHead>
                  <TableHead className="text-right text-muted-foreground">Open invoices</TableHead>
                  <TableHead className="text-right text-muted-foreground">Current</TableHead>
                  <TableHead className="text-right text-muted-foreground">1–30</TableHead>
                  <TableHead className="text-right text-muted-foreground">31–60</TableHead>
                  <TableHead className="text-right text-muted-foreground">60+</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {termAging.accounts.map((a) => (
                  <TableRow
                    key={a.billto_number}
                    className="border-border/40 hover:bg-foreground/[0.03]"
                  >
                    <TableCell className="text-xs">
                      <div className="max-w-[240px] truncate">{a.billto_name}</div>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {a.last_payment_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums">
                      {formatMoney(a.ar_balance)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {a.cash_on_acct !== 0 ? formatMoney(a.cash_on_acct) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {formatMoney(a.transaction_balance)}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-emerald-600/80 dark:text-emerald-300/80">
                      {a.current !== 0 ? formatMoney(a.current) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">
                      {a.overdue_0_30 !== 0 ? formatMoney(a.overdue_0_30) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-sky-600 dark:text-sky-300">
                      {a.overdue_31_60 !== 0 ? formatMoney(a.overdue_31_60) : "—"}
                    </TableCell>
                    <TableCell className="text-right text-xs font-medium tabular-nums text-rose-600 dark:text-rose-300">
                      {a.overdue_60_plus !== 0 ? formatMoney(a.overdue_60_plus) : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {termAging.accounts.length} accounts with open balances,
              largest open invoices first. Numbers tie to the source AR
              ledger as of the last nightly extract — AR changes minute by
              minute, so an intraday report run will differ slightly.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ── Sub-components ── */

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

function AgeBucket({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "neutral" | "warn" | "bad";
}) {
  const cls = {
    good: "text-emerald-600 dark:text-emerald-300",
    neutral: "text-foreground",
    warn: "text-sky-600 dark:text-sky-300",
    bad: "text-rose-600 dark:text-rose-300",
  }[tone];
  return (
    <div className="rounded-lg border border-border/50 bg-foreground/[0.02] px-3 py-2.5">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-lg font-semibold tabular-nums break-words sm:text-xl", cls)}>{formatMoney(value)}</div>
    </div>
  );
}
