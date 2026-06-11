"use client";

/**
 * Phase-4 cutover: this is now the v3 split headline. Reads
 * /read/combined/headline (lifetime + YTD + L12M) and shows
 * either the combined view, W-2 view, or Subvendor view depending
 * on `business` Zustand state.
 *
 * File name kept (V2Headline) for import compatibility; logic is v3.
 */

import { useQuery } from "@tanstack/react-query";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct } from "@/lib/utils";

const BUSINESS_LABEL: Record<string, string> = {
  combined: "Combined P&L",
  w2: "W-2 Direct P&L",
  subvendor: "Subvendor P&L",
};

const WINDOW_LABEL: Record<string, string> = {
  ytd: "Year to date",
  l12m: "Last 12 months",
  lifetime: "Lifetime",
};

export function V2Headline() {
  const business = useDashboardStore((s) => s.business);

  const { data: ytdCombined, isLoading: ytdLoading } = useQuery({
    queryKey: ["combined-headline", "ytd"],
    queryFn: () => api.getCombinedHeadline("ytd"),
  });
  const { data: l12mCombined, isLoading: l12mLoading } = useQuery({
    queryKey: ["combined-headline", "l12m"],
    queryFn: () => api.getCombinedHeadline("l12m"),
  });
  const { data: lifeCombined, isLoading: lifeLoading } = useQuery({
    queryKey: ["combined-headline", "lifetime"],
    queryFn: () => api.getCombinedHeadline("lifetime"),
  });

  if (ytdLoading || l12mLoading || lifeLoading || !ytdCombined || !l12mCombined || !lifeCombined) {
    return <Skeleton className="h-64 rounded-xl" />;
  }

  function pick(d: NonNullable<typeof ytdCombined>) {
    if (business === "w2") return d.w2;
    if (business === "subvendor") return d.subvendor;
    return d.combined;
  }

  const ytd = pick(ytdCombined);
  const l12m = pick(l12mCombined);
  const life = pick(lifeCombined);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{BUSINESS_LABEL[business]}</CardTitle>
          <Badge variant="outline" className="text-[10px]">
            {ytd.consultants.toLocaleString()} consultants YTD
          </Badge>
        </div>
        <CardDescription>
          Revenue, cost, and gross margin year to date.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <WindowRow label="YTD" data={ytd} business={business} />
        <WindowRow label="L12M" data={l12m} business={business} />
        <WindowRow label="Lifetime" data={life} business={business} />
      </CardContent>
    </Card>
  );
}

function WindowRow({
  label,
  data,
  business,
}: {
  label: string;
  data: {
    revenue: number;
    expense: number;
    profit: number;
    margin_pct: number;
    employer_tax?: number;
  };
  business: string;
}) {
  const profitTone =
    data.profit >= 0 ? "text-emerald-600 dark:text-emerald-300" : "text-rose-600 dark:text-rose-300";
  const marginTone =
    data.margin_pct >= 15
      ? "text-emerald-600 dark:text-emerald-300"
      : data.margin_pct >= 0
        ? "text-sky-600 dark:text-sky-300"
        : "text-rose-600 dark:text-rose-300";
  return (
    <div className="grid grid-cols-5 items-center gap-3 border-b border-border/40 pb-3 last:border-0 last:pb-0">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Revenue
        </div>
        <div className="tabular-nums">{formatMoney(data.revenue)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Expense
        </div>
        <div className="tabular-nums">{formatMoney(data.expense)}</div>
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Profit
        </div>
        <div className={cn("font-medium tabular-nums", profitTone)}>
          {formatMoney(data.profit)}
        </div>
        {business !== "subvendor" && data.employer_tax !== undefined && data.employer_tax > 0 && (
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            − {formatMoney(data.employer_tax)} tax
          </div>
        )}
      </div>
      <div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
          Margin
        </div>
        <div className={cn("font-medium tabular-nums", marginTone)}>
          {data.revenue > 0 ? formatPct(data.margin_pct) : "-"}
        </div>
      </div>
    </div>
  );
}
