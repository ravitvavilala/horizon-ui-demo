"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpDown, Loader2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { api, type VendorSummaryRow } from "@/lib/api";
import { SRC, companyLabel } from "@/lib/labels";
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
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TablePagination } from "@/components/TablePagination";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

// Show margin only when we matched essentially all of a vendor's spend to
// billing. Below this we don't trust the ratio - show spend only, no number.
const MARGIN_CONFIDENCE_FLOOR = 80;
const VENDOR_MIN_YEAR = 2024; // pre-2024 GL not extracted (CFO directive)
// Auto-extends to the current calendar year - no hard-coded year list.
const VENDOR_YEARS = Array.from(
  { length: new Date().getFullYear() - VENDOR_MIN_YEAR + 1 },
  (_, i) => new Date().getFullYear() - i,
);
const VENDOR_PAGE_SIZE = 12;
const vendorChartConfig: ChartConfig = {
  spend: { label: "Spend", color: "var(--chart-3)" },
};

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}

type SortKey = "cost" | "revenue" | "gross_margin" | "margin_pct" | "match_rate_pct" | "billable_consultants";

/**
 * Sub Vendor margin view. Spend = the AP ledger GL acct 5100 per vendor
 * (books-accurate). Revenue + margin bridge each 5100 bill's memo
 * (consultant + month + hrs) to the the staffing system 4Subs billing for the
 * same period - real subvendor margins (~5-15%) where coverage is good.
 * match_rate_pct = share of spend we matched; low-conf rows are
 * effectively spend-only. (2026-06-04.)
 */
export function VendorsTable() {
  const [year, setYear] = useState(2025);
  const since = `${year}-01-01`;
  const until = `${year}-12-31`;
  // Vendor spend = QB GL (acct 5100), Apex Staffing books only · skip the fetches
  // entirely under the Meridian Talent toggle (the gate below explains why).
  const company = useDashboardStore((s) => s.company);
  const isItech = company === "itech";

  const { data, isLoading, isError } = useQuery({
    queryKey: ["vendors-summary", since, until],
    queryFn: () => api.getVendorsSummary({ since, until, limit: 300 }),
    enabled: isItech,
  });

  const { data: monthly } = useQuery({
    queryKey: ["vendors-monthly", since, until],
    queryFn: () => api.getVendorsMonthly({ since, until }),
    enabled: isItech,
  });
  const monthRows = (monthly?.rows ?? []).map((m) => ({
    month: m.period_month.slice(0, 7),
    spend: m.spend,
  }));

  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("cost");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = useMemo(() => {
    if (!data) return [] as VendorSummaryRow[];
    const filtered = query
      ? data.rows.filter((r) =>
          r.vendor_name.toLowerCase().includes(query.toLowerCase()),
        )
      : data.rows;
    const arr = [...filtered].sort((a, b) => {
      const av = Number(a[sortKey] as string);
      const bv = Number(b[sortKey] as string);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, query, sortKey, sortDir]);

  const totals = useMemo(() => {
    if (!data) return null;
    const cost = data.rows.reduce((s, r) => s + Number(r.cost), 0);
    const rev = data.rows.reduce((s, r) => s + Number(r.revenue ?? 0), 0);
    const gm = data.rows.reduce((s, r) => s + Number(r.gross_margin ?? 0), 0);
    return { cost, rev, gm, n: data.rows.length };
  }, [data]);

  const [page, setPage] = useState(0);
  useEffect(() => setPage(0), [query, sortKey, sortDir, year]);
  const pageCount = Math.max(1, Math.ceil(sorted.length / VENDOR_PAGE_SIZE));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(safePage * VENDOR_PAGE_SIZE, (safePage + 1) * VENDOR_PAGE_SIZE);

  // Under the Meridian Talent toggle this page used to silently show Apex Staffing
  // numbers · honest empty-state instead until the SW ledger lands.
  if (!isItech) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>sub vendors</CardTitle>
          <CardDescription>
            Subvendor spend comes from the {SRC.ap} general ledger, which is
            extracted for the <span className="font-medium">{companyLabel("itech")} books only</span> so
            far. {companyLabel("smartworks")} vendor spend lands with the {companyLabel("smartworks")}
            {" "}{SRC.ap} feed. Switch to {companyLabel("itech")} (top right) to see vendor spend.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* By month - total subvendor spend for the selected year */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Spend by month · {year}</CardTitle>
          <CardDescription className="text-xs">
            Total subvendor spend (GL 5100) each month.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-3 pb-3">
          {monthRows.length === 0 ? (
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">
              No spend in {year}.
            </div>
          ) : (
            <ChartContainer config={vendorChartConfig} className="h-[220px] w-full md:h-[260px]">
              <AreaChart data={monthRows} margin={{ left: 4, right: 8, top: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="fillVtSpend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-spend)" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="var(--color-spend)" stopOpacity={0.1} />
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
                  tickFormatter={(v: number) => compactMoney(v)}
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
                <Area dataKey="spend" type="monotone" fill="url(#fillVtSpend)" stroke="var(--color-spend)" strokeWidth={2} />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

    <Card>
      <CardHeader>
        <div className="flex w-full flex-wrap items-end justify-between gap-3">
          <div>
            <CardTitle>sub vendors</CardTitle>
            <CardDescription>
              FY2025 · spend = vendor-cost ledger (exact) · revenue/margin = memo→billing
              bridge · ≈ estimate, % matched shown per vendor
              {data?.transform_version
                ? ` · transform ${data.transform_version}`
                : ""}
              <span className="mt-1 block text-foreground/40">
                The subvendor ↔ consultant link lives only in the {SRC.ap} ledger
                (parsed from each bill memo) · {SRC.staffing} has the channel, not the
                subvendor. That&apos;s why revenue/margin are estimated here while
                spend is exact; the live vendor feed makes them exact.
              </span>
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {totals ? (
              <span className="rounded-md bg-muted/50 px-3 py-1.5 text-xs text-foreground/70">
                {totals.n} vendors
              </span>
            ) : null}
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-9 w-28 bg-muted/50 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VENDOR_YEARS.map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              placeholder="search vendor…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="h-9 w-48 bg-muted/50 text-sm"
            />
          </div>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="flex h-32 items-center justify-center text-sm text-foreground/60">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          loading vendors…
        </div>
      ) : isError ? (
        <div className="rounded-md border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-200">
          vendor data unavailable
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-foreground/60">vendor</TableHead>
                  <SortHead
                    label="revenue"
                    k="revenue"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={(k) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir)}
                    align="right"
                  />
                  <SortHead
                    label="spend (GL 5100)"
                    k="cost"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={(k) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir)}
                    align="right"
                  />
                  <SortHead
                    label="margin"
                    k="gross_margin"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={(k) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir)}
                    align="right"
                  />
                  <SortHead
                    label="margin %"
                    k="margin_pct"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onClick={(k) => toggleSort(k, sortKey, sortDir, setSortKey, setSortDir)}
                    align="right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {pageRows.map((r) => {
                  const rev = Number(r.revenue ?? 0);
                  const cost = Number(r.cost);
                  const gm = Number(r.gross_margin ?? 0);
                  const margin = Number(r.margin_pct ?? 0);
                  const match = Number(r.match_rate_pct);
                  // We show revenue/margin whenever the memo bridge matched ANY
                  // of a vendor's bills. High coverage (>= floor) = confident,
                  // shown in full colour. Partial coverage = an ESTIMATE, shown
                  // dimmed with a "≈X%" badge so it's useful without pretending
                  // it's exact. Zero match = spend only (dash).
                  const hasRev = rev > 0;
                  const verified = match >= MARGIN_CONFIDENCE_FLOOR && hasRev;
                  const partial = hasRev && !verified;
                  // books-tie bucket row: JE/accrual bulk + intercompany +
                  // excluded names · real 5100 dollars, no single subvendor.
                  const isBucket = r.vendor_name.startsWith("(unattributed");
                  const dash = <span className="text-foreground/25">-</span>;
                  const estBadge = partial ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <sup className="ml-0.5 cursor-help text-[9px] text-amber-600/90 dark:text-amber-400/90">
                          ≈{Math.round(match)}%
                        </sup>
                      </TooltipTrigger>
                      <TooltipContent>
                        Estimated · only {Math.round(match)}% of this vendor&apos;s
                        bills matched to billing. Exact once the vendor feed is wired.
                      </TooltipContent>
                    </Tooltip>
                  ) : null;
                  const numTone = partial ? "text-foreground/55" : "text-foreground/80";
                  return (
                    <TableRow
                      key={r.vendor_name}
                      className="border-border hover:bg-muted/50"
                    >
                      <TableCell>
                        {isBucket ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="block cursor-help text-foreground/60 italic">
                                {r.vendor_name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-xs">
                              Real 5100 dollars with no single subvendor:
                              journal-entry/accrual bulk postings, intercompany
                              and excluded names. Included so total spend ties
                              the books to the penny.
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <Link
                            href={`/vendor/${encodeURIComponent(r.vendor_name)}`}
                            className="block text-foreground/90 underline-offset-4 hover:underline"
                          >
                            {r.vendor_name}
                          </Link>
                        )}
                      </TableCell>
                      <TableCell className={cn("text-right tabular-nums", numTone)}>
                        {hasRev ? (
                          <>{formatMoney(rev)}{estBadge}</>
                        ) : (
                          <Tooltip>
                            <TooltipTrigger asChild>{dash}</TooltipTrigger>
                            <TooltipContent>
                              {isBucket
                                ? "Not a vendor · bulk/intercompany postings; no revenue applies."
                                : "No bills matched to billing for this vendor · showing spend only."}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-foreground/80">
                        {formatMoney(cost)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          !hasRev ? "" : partial ? numTone : gm >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {hasRev ? formatMoney(gm) : dash}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right tabular-nums",
                          !hasRev || partial
                            ? numTone
                            : margin >= 20
                              ? "text-emerald-600 dark:text-emerald-300"
                              : margin >= 0
                                ? "text-sky-600 dark:text-sky-300"
                                : "text-rose-600 dark:text-rose-300",
                        )}
                      >
                        {hasRev ? (<>{formatPct(margin)}{estBadge}</>) : dash}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {sorted.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-foreground/40 py-8">
                      no vendors match
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
          <TablePagination
            page={safePage}
            pageCount={pageCount}
            total={sorted.length}
            pageSize={VENDOR_PAGE_SIZE}
            onPrev={() => setPage((p) => Math.max(0, p - 1))}
            onNext={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
          />
          {totals ? (
            <div className="border-t border-border px-6 py-3 text-xs text-foreground/60">
              <div className="flex flex-wrap gap-6">
                <span>
                  total spend{" "}
                  <span className="font-medium text-foreground/80">
                    {formatMoney(totals.cost)}
                  </span>
                </span>
                <span>
                  matched revenue{" "}
                  <span className="font-medium text-foreground/80">
                    {formatMoney(totals.rev)}
                  </span>
                </span>
                <span>
                  matched margin{" "}
                  <span
                    className={cn(
                      "font-medium",
                      totals.gm >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300",
                    )}
                  >
                    {formatMoney(totals.gm)}
                  </span>
                </span>
                <span className="text-foreground/35">
                  matched figures cover only the memo-matched subset of bills -
                  not a channel/company margin. spend is the full booked 5100.
                </span>
              </div>
            </div>
          ) : null}
        </>
      )}
    </Card>
    </div>
  );
}

function toggleSort(
  k: SortKey,
  sortKey: SortKey,
  sortDir: "asc" | "desc",
  setSortKey: (k: SortKey) => void,
  setSortDir: (d: "asc" | "desc") => void,
) {
  if (k === sortKey) {
    setSortDir(sortDir === "asc" ? "desc" : "asc");
  } else {
    setSortKey(k);
    setSortDir("desc");
  }
}

function SortHead({
  label,
  k,
  sortKey,
  sortDir,
  onClick,
  align,
}: {
  label: string;
  k: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (k: SortKey) => void;
  align?: "right" | "left";
}) {
  const active = sortKey === k;
  return (
    <TableHead
      className={cn(
        "cursor-pointer select-none text-foreground/60 hover:text-foreground",
        align === "right" ? "text-right" : "text-left",
      )}
      onClick={() => onClick(k)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <ArrowUpDown
          className={cn(
            "h-3 w-3 transition",
            active ? "text-foreground" : "text-foreground/30",
            active && sortDir === "asc" ? "rotate-180" : "",
          )}
        />
      </span>
    </TableHead>
  );
}

// Suppress unused-import lint when this file ever loses a Badge usage -
// keeps the import block tidy if you swap UI.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Suppress = typeof Badge;
