"use client";

/**
 * Phase 6: Consultants table reads /read/{company}/consultants?year=&cohort=
 * Driven by top-toggle Company + YearSelect + ConsultantTypeSelect.
 * is_active label = current employment status (separate from "billed in year").
 * Year filter implicit - only consultants with revenue in the year appear.
 */

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowUpDown } from "lucide-react";

import { api } from "@/lib/api";
import { SRC } from "@/lib/labels";
import { TablePagination } from "@/components/TablePagination";

const PAGE_SIZE = 12;
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
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { YearSelect } from "@/components/YearSelect";
import { ConsultantTypeSelect } from "@/components/ConsultantTypeSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct } from "@/lib/utils";

type SortKey = "revenue" | "gross_margin" | "margin_pct" | "hours" | "assignments";

export function ConsultantsTable() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);
  const cohort = useDashboardStore((s) => s.consultantCohort);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<SortKey>("revenue");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [q, sort, dir, company, year, cohort]);

  const { data, isLoading } = useQuery({
    queryKey: ["consultants-year", company, year, cohort],
    queryFn: () => api.getCompanyConsultants(company, year, cohort, 500),
  });

  const rows = useMemo(() => {
    const list = data?.rows ?? [];
    const filtered = q
      ? list.filter((r) => {
          const full = `${r.first_name ?? ""} ${r.last_name ?? ""}`.toLowerCase();
          return full.includes(q.toLowerCase());
        })
      : list;
    const sortable = [...filtered];
    sortable.sort((a, b) => {
      const av = sort === "revenue" ? a.revenue
        : sort === "gross_margin" ? a.gross_margin
        : sort === "margin_pct" ? a.margin_pct
        : sort === "hours" ? a.total_hours
        : a.assignments_count;
      const bv = sort === "revenue" ? b.revenue
        : sort === "gross_margin" ? b.gross_margin
        : sort === "margin_pct" ? b.margin_pct
        : sort === "hours" ? b.total_hours
        : b.assignments_count;
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

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle className="text-base">Consultants · {year}</CardTitle>
            <CardDescription>
              {data ? `${data.total} billed in ${year}` : "Loading…"} · {cohort}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search consultant…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-8 w-56 text-xs"
            />
            <ConsultantTypeSelect />
            <YearSelect />
          </div>
        </div>
      </CardHeader>

      {isLoading || !data ? (
        <div className="space-y-2 p-6">
          {[...Array(8)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No consultants in {year}.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/60 hover:bg-transparent">
                <TableHead>Consultant</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <SortHead label="Assignments" k="assignments" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="Hours" k="hours" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="Revenue" k="revenue" sort={sort} dir={dir} onClick={toggleSort} />
                <TableHead className="text-right">COGS</TableHead>
                <SortHead label="GM" k="gross_margin" sort={sort} dir={dir} onClick={toggleSort} />
                <SortHead label="Margin" k="margin_pct" sort={sort} dir={dir} onClick={toggleSort} />
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((r) => {
                const name = `${r.first_name ?? ""} ${r.last_name ?? ""}`.trim() || `#${r.consultant_id ?? ""}`;
                return (
                  <TableRow key={r.consultant_master_id} className="border-border/40 hover:bg-foreground/[0.03]">
                    <TableCell className="font-medium">
                      {r.consultant_id ? (
                        <Link
                          href={`/consultants/${r.consultant_id}`}
                          className="text-sm underline-offset-4 hover:underline"
                        >
                          {name}
                        </Link>
                      ) : (
                        <span className="text-sm">{name}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.employment_type === "w2" ? "default" : "secondary"} className="text-[10px]">
                        {r.employment_type === "w2" ? "W-2" : r.employment_type === "subvendor" ? "Sub" : "?"}
                      </Badge>
                      {r.job_wc_code && (
                        <span className="ml-1 text-[10px] text-muted-foreground">{r.job_wc_code}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.is_active ? "outline" : "outline"} className={cn(
                        "text-[10px]",
                        r.is_active ? "border-emerald-500/30 text-emerald-600 dark:text-emerald-300" : "text-muted-foreground/60",
                      )}>
                        {r.is_active ? "Active" : "Former"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{r.assignments_count}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums text-muted-foreground">
                      {r.total_hours.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatMoney(r.revenue)}</TableCell>
                    <TableCell className="text-right text-xs tabular-nums">{formatMoney(r.expense)}</TableCell>
                    <TableCell className={cn("text-right text-xs font-medium tabular-nums",
                      r.gross_margin >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300")}>
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
                          title={`Subvendor cost is a ${SRC.staffing} estimate that excludes the ${SRC.ap} vendor referral/markup. Margin reads ~1pp high until the vendor feed lands.`}
                          className="ml-1 cursor-help align-super text-[9px] text-amber-600/90 dark:text-amber-400/80"
                        >
                          est
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
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
      className="cursor-pointer select-none text-right hover:text-foreground"
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
