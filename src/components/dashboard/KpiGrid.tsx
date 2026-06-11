"use client";

import { useQuery } from "@tanstack/react-query";
import { TrendingDown, TrendingUp } from "lucide-react";

import { api } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStore } from "@/stores/dashboard";
import { cn, formatMoney, formatPct } from "@/lib/utils";

export function KpiGrid() {
  const period = useDashboardStore((s) => s.period);

  const trendMonths =
    period === "7d" || period === "30d" ? 6 : 14;

  const { data, isLoading } = useQuery({
    queryKey: ["kpi", "v2-trend", trendMonths],
    queryFn: () => api.getV2Trend({ months: trendMonths }),
  });

  if (isLoading || !data) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-lg" />
        ))}
      </div>
    );
  }

  const windowMonths =
    period === "7d" || period === "30d" ? 3 : 12;
  const slice = data.rows.slice(-windowMonths);
  const prevSlice = data.rows.slice(-(windowMonths * 2), -windowMonths);

  const agg = (rows: typeof data.rows) => {
    const rev = rows.reduce((s, r) => s + Number(r.revenue), 0);
    const exp = rows.reduce((s, r) => s + Number(r.total_expenses), 0);
    const prof = rows.reduce((s, r) => s + Number(r.profit), 0);
    const m = rev > 0 ? (prof / rev) * 100 : 0;
    return { rev, exp, prof, m };
  };

  const cur = agg(slice);
  const prev = agg(prevSlice);
  const pctDelta = (c: number, p: number) =>
    p !== 0 ? ((c - p) / Math.abs(p)) * 100 : 0;

  const cards = [
    {
      label: "Revenue",
      value: formatMoney(cur.rev),
      delta: pctDelta(cur.rev, prev.rev),
      suffix: "%",
    },
    {
      label: "COGS",
      value: formatMoney(cur.exp),
      delta: pctDelta(cur.exp, prev.exp),
      suffix: "%",
      invert: true,
    },
    {
      label: "Profit",
      value: formatMoney(cur.prof),
      delta: pctDelta(cur.prof, prev.prof),
      suffix: "%",
    },
    {
      label: "Margin",
      value: formatPct(cur.m),
      delta: cur.m - prev.m,
      suffix: " pp",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => {
        const positive = c.delta >= 0;
        const good = c.invert ? !positive : positive;
        return (
          <Card key={c.label}>
            <CardHeader className="pb-2">
              <CardDescription>{c.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">
                {c.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-1">
                {positive ? (
                  <TrendingUp
                    className={cn(
                      "h-4 w-4",
                      good ? "text-emerald-500" : "text-rose-500",
                    )}
                  />
                ) : (
                  <TrendingDown
                    className={cn(
                      "h-4 w-4",
                      good ? "text-emerald-500" : "text-rose-500",
                    )}
                  />
                )}
                <span
                  className={cn(
                    "text-xs font-medium tabular-nums",
                    good ? "text-emerald-500" : "text-rose-500",
                  )}
                >
                  {positive ? "+" : ""}
                  {c.delta.toFixed(1)}
                  {c.suffix}
                </span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
