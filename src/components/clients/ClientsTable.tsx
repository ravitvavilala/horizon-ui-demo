"use client";

/**
 * Phase 6: /clients table reads from per-company year mart.
 * Top-right toggle picks Apex Staffing vs Meridian Talent.
 * Year dropdown picks the calendar year.
 * Shows per-client: consultants · revenue · expense · GM · margin · AR (billed / received / outstanding).
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { api } from "@/lib/api";
import { SRC } from "@/lib/labels";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TablePagination } from "@/components/TablePagination";

const PAGE_SIZE = 12;
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { YearSelect } from "@/components/YearSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct } from "@/lib/utils";

type SortKey = "revenue" | "gross_margin" | "margin_pct" | "consultants" | "outstanding";

export function ClientsTable() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  // back to page 1 whenever the filter / sort / company / year changes
  useEffect(() => setPage(0), [q, sort, dir, company, year]);

  const { data, isLoading } = useQuery({
    queryKey: ["clients-year", company, year],
    queryFn: () => api.getCompanyClients(company, year, 500),
  });

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const filtered = q
      ? list.filter((r) => (r.client_name ?? "").toLowerCase().includes(q.toLowerCase()))
      : list;
    const sortable = [...filtered];
    sortable.sort((a, b) => {
      const av = sort === "revenue" ? a.revenue
        : sort === "gross_margin" ? a.gross_margin
        : sort === "margin_pct" ? a.margin_pct
        : sort === "consultants" ? a.consultant_count
        : a.ar_outstanding;
      const bv = sort === "revenue" ? b.revenue
        : sort === "gross_margin" ? b.gross_margin
        : sort === "margin_pct" ? b.margin_pct
        : sort === "consultants" ? b.consultant_count
        : b.ar_outstanding;
      return dir === "desc" ? bv - av : av - bv;
    });
    return sortable;
  }, [data, q, sort, dir]);

  const pageCount = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = rows.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE);

  function toggleSort(k: SortKey) {
    if (k === sort) setDir(dir === "asc" ? "desc" : "asc");
    else { setSort(k); setDir("desc"); }
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, r) => {
        acc.revenue += r.revenue;
        acc.expense += r.expense;
        acc.gm += r.gross_margin;
        acc.billed += r.ar_billed;
        acc.received += r.ar_received;
        acc.outstanding += r.ar_outstanding;
        return acc;
      },
      { revenue: 0, expense: 0, gm: 0, billed: 0, received: 0, outstanding: 0 },
    );
  }, [rows]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">
              Clients · {year}
            </CardTitle>
            <CardDescription>
              {data ? `${data.total} clients · ${year}` : "Loading…"}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search client…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <YearSelect />
          </div>
        </div>

        {/* Totals row */}
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <Totals label="Revenue" value={formatMoney(totals.revenue)} />
          <Totals label="COGS" value={formatMoney(totals.expense)} />
          <Totals label="Gross Margin" value={formatMoney(totals.gm)} tone={totals.gm >= 0 ? "good" : "bad"} />
          <Totals label="AR Billed" value={formatMoney(totals.billed)} />
          <Totals label="AR Received" value={formatMoney(totals.received)} tone="good" />
          <Totals label="AR Outstanding" value={formatMoney(totals.outstanding)} tone={totals.outstanding > 0 ? "warn" : "neutral"} />
        </div>
      </CardHeader>

      {isLoading || !data ? (
        <div className="space-y-2 p-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No clients in {year}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Client</TableHead>
                <SortHead label="Consultants" k="consultants" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="Revenue" k="revenue" sort={sort} dir={dir} onClick={toggleSort} />
                <TableHead className="text-right text-muted-foreground">COGS</TableHead>
                <SortHead label="Gross Margin" k="gross_margin" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="Margin" k="margin_pct" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="AR Outstanding" k="outstanding" sort={sort} dir={dir} onClick={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => (
                <TableRow key={r.client_master_id} className="border-border/40 hover:bg-foreground/[0.03]">
                  <TableCell>
                    <Link
                      href={`/clients/${encodeURIComponent(r.client_master_id)}`}
                      className="block text-sm underline-offset-4 hover:underline"
                    >
                      {r.client_name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{r.consultant_count}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatMoney(r.revenue)}</TableCell>
                  <TableCell className="text-right text-xs tabular-nums">{formatMoney(r.expense)}</TableCell>
                  <TableCell className={cn("text-right text-xs font-medium tabular-nums", r.gross_margin >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
                    {formatMoney(r.gross_margin)}
                  </TableCell>
                  <TableCell className={cn("text-right text-xs tabular-nums",
                    r.revenue <= 0 ? "text-muted-foreground/50"
                      : r.margin_pct >= 15 ? "text-emerald-600 dark:text-emerald-300"
                      : r.margin_pct >= 0 ? "text-sky-600 dark:text-sky-300"
                      : "text-rose-600 dark:text-rose-300")}>
                    {r.revenue > 0 ? formatPct(r.margin_pct) : "-"}
                    {r.cost_pending_qb && (
                      <span
                        title={`This client's cost includes subvendor lines costed from a ${SRC.staffing} estimate that excludes the ${SRC.ap} vendor referral/markup. Margin reads ~1pp high until the vendor feed lands.`}
                        className="ml-1 cursor-help align-super text-[9px] text-amber-600/90 dark:text-amber-400/80"
                      >
                        est
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={cn("text-right text-xs font-medium tabular-nums", r.ar_outstanding > 0 ? "text-sky-600 dark:text-sky-300" : "text-muted-foreground/50")}>
                    {r.ar_outstanding > 0 ? formatMoney(r.ar_outstanding) : "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <TablePagination
            page={safePage}
            pageCount={pageCount}
            total={rows.length}
            pageSize={PAGE_SIZE}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          />
        </div>
      )}
    </Card>
  );
}

function Totals({
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
    <div>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-medium tabular-nums", cls)}>{value}</div>
    </div>
  );
}

function SortHead({
  label, k, sort, dir, onClick,
}: {
  label: string;
  k: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  onClick: (k: SortKey) => void;
}) {
  const active = sort === k;
  return (
    <TableHead
      className="cursor-pointer select-none text-right text-muted-foreground hover:text-foreground"
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown className={cn("h-3 w-3 transition",
          active ? "text-foreground" : "text-muted-foreground/40",
          active && dir === "asc" ? "rotate-180" : "")} />
      </span>
    </TableHead>
  );
}
