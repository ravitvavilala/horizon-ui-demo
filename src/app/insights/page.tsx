"use client";

/**
 * Insights · the Margin Waterfall (CEO bridge).
 *
 * One bar starts at bill revenue and steps down through every cost leg to
 * land on margin: Bill → −Subvendor pay → −W-2 pay → −Payroll tax →
 * +PI holdback → −MSP fees → −Referral → −Other → = Margin.
 * Data: /read/{company}/waterfall over int_billing_costed (the single
 * finance-tied cost source); "Other" carries the assumed-margin guard rows
 * so the bridge lands on the mart margin exactly. Current year is capped
 * to the last closed month, same as every other page.
 */

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, CartesianGrid, Cell, ComposedChart, LabelList, Line, XAxis, YAxis } from "recharts";

import { api } from "@/lib/api";
import { COMPANY_LABELS, SRC } from "@/lib/labels";
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
  type ChartConfig,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { YearSelect } from "@/components/YearSelect";
import { useDashboardStore } from "@/stores/dashboard";
import { formatMoney, formatPct, compactMoneyTick } from "@/lib/utils";

export const dynamic = "force-dynamic";

const COMPANY_LABEL = COMPANY_LABELS;

const waterfallConfig: ChartConfig = {
  delta: { label: "Amount" },
};

function compactMoney(v: number): string {
  return compactMoneyTick(v);
}

export default function InsightsPage() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);
  const [channel, setChannel] = React.useState<string>("__all__");

  const { data: channels } = useQuery({
    queryKey: ["wf-channels", company, year],
    queryFn: () => api.getCompanyChannels(company, year),
  });
  const channelParam = channel === "__all__" ? "" : channel;
  const { data, isLoading } = useQuery({
    queryKey: ["wf", company, year, channelParam],
    queryFn: () => api.getCompanyWaterfall(company, year, channelParam),
  });

  // reset channel when company/year changes (channel lists differ)
  React.useEffect(() => setChannel("__all__"), [company, year]);

  // Waterfall geometry: each bar floats · invisible base + visible delta.
  const rows = React.useMemo(() => {
    if (!data) return [];
    let running = 0;
    const out: Array<{
      step: string;
      base: number;
      delta: number;
      amount: number;
      cum: number;
      kind: "start" | "cost" | "credit" | "end";
    }> = [];
    for (const s of data.steps) {
      if (s.key === "bill") {
        running = s.amount;
        out.push({ step: s.label, base: 0, delta: s.amount, amount: s.amount, cum: running, kind: "start" });
      } else if (s.amount >= 0) {
        running += s.amount;
        out.push({ step: s.label, base: running - s.amount, delta: s.amount, amount: s.amount, cum: running, kind: "credit" });
      } else {
        running += s.amount;
        out.push({ step: s.label, base: running, delta: -s.amount, amount: s.amount, cum: running, kind: "cost" });
      }
    }
    out.push({ step: "Margin", base: 0, delta: data.margin, amount: data.margin, cum: data.margin, kind: "end" });
    return out;
  }, [data]);

  const KIND_COLOR: Record<string, string> = {
    start: "var(--chart-1)",
    cost: "var(--chart-3)",
    credit: "var(--chart-2)",
    end: "var(--chart-2)",
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Insights · Margin Waterfall
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Where every dollar of {COMPANY_LABEL[company]} revenue goes before
            it becomes margin. {year} through the last closed month.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={channel} onValueChange={setChannel}>
            <SelectTrigger className="h-8 w-[240px] text-xs">
              <SelectValue placeholder="All channels" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="__all__">All channels</SelectItem>
                {(channels?.channels ?? []).map((c) => (
                  <SelectItem key={c.name} value={c.name}>
                    {c.name} · {compactMoney(c.revenue)}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
          <YearSelect />
        </div>
      </header>

      {isLoading || !data ? (
        <Skeleton className="h-[420px] w-full rounded-xl" />
      ) : data.bill === 0 ? (
        <Card>
          <CardContent className="grid h-40 place-items-center text-sm text-muted-foreground">
            No billing for this selection.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* The CEO sentence */}
          <Card>
            <CardContent className="py-4 text-sm">
              Of every{" "}
              <span className="font-semibold">$100</span> billed
              {data.channel ? ` through ${data.channel}` : ""},{" "}
              {data.steps
                .filter((s) => s.key !== "bill" && Math.abs(s.amount) >= data.bill * 0.001)
                .map((s) => (
                  <span key={s.key}>
                    <span className="font-medium tabular-nums">
                      ${Math.abs((s.amount / data.bill) * 100).toFixed(2)}
                    </span>{" "}
                    {s.amount < 0 ? "goes to" : "comes back from"}{" "}
                    {s.label.toLowerCase()},{" "}
                  </span>
                ))}
              and{" "}
              <span className="font-semibold tabular-nums text-emerald-600 dark:text-emerald-300">
                ${((data.margin / data.bill) * 100).toFixed(2)} stays as margin
              </span>{" "}
              ({formatPct(data.margin_pct)}).
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {data.channel ?? "All channels"} · {year}
              </CardTitle>
              <CardDescription className="text-xs">
                {formatMoney(data.bill)} billed → {formatMoney(data.margin)}{" "}
                margin ({formatPct(data.margin_pct)}). Blue = revenue, rose =
                cost steps, teal = credits and the landing margin.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-3 pb-3">
              <ChartContainer
                config={waterfallConfig}
                className="h-[340px] w-full md:h-[420px]"
              >
                <ComposedChart
                  data={rows}
                  margin={{ left: 8, right: 8, top: 18, bottom: 24 }}
                >
                  <CartesianGrid vertical={false} stroke="var(--border)" />
                  <XAxis
                    dataKey="step"
                    tickLine={false}
                    axisLine={true}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={70}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={true}
                    tickFormatter={(v: number) => compactMoney(v)}
                    tick={{ fontSize: 11, fill: "var(--foreground)" }}
                    width={56}
                  />
                  <ChartTooltip
                    cursor={false}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[payload.length - 1]
                        ?.payload as (typeof rows)[number];
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="font-medium">{p.step}</div>
                          <div className="mt-1 tabular-nums">
                            {formatMoney(p.amount)}
                            {data.bill > 0 && (
                              <span className="ml-2 text-muted-foreground">
                                {((p.amount / data.bill) * 100).toFixed(2)} per $100
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    }}
                  />
                  {/* invisible base lifts each floating bar */}
                  <Bar dataKey="base" stackId="wf" fill="transparent" isAnimationActive={false} />
                  <Bar dataKey="delta" stackId="wf" radius={[3, 3, 0, 0]}>
                    {rows.map((r) => (
                      <Cell key={r.step} fill={KIND_COLOR[r.kind]} />
                    ))}
                    <LabelList
                      dataKey="amount"
                      position="top"
                      formatter={(v) => {
                        const n = Number(v);
                        return n < 0 ? `-${compactMoney(Math.abs(n))}` : compactMoney(n);
                      }}
                      className="fill-foreground"
                      fontSize={10}
                    />
                  </Bar>
                  {/* running-total connector - ties the floating bars together */}
                  <Line
                    dataKey="cum"
                    type="stepAfter"
                    stroke="var(--muted-foreground)"
                    strokeDasharray="4 3"
                    strokeWidth={1}
                    dot={false}
                    isAnimationActive={false}
                    legendType="none"
                  />
                </ComposedChart>
              </ChartContainer>
            </CardContent>
          </Card>

          {/* Step table · the same bridge in numbers */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">The bridge, line by line</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-1.5 pr-4 font-medium">Step</th>
                      <th className="py-1.5 pr-4 text-right font-medium">Amount</th>
                      <th className="py-1.5 text-right font-medium">Per $100 billed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr key={r.step} className="border-b border-border/40">
                        <td className="py-1.5 pr-4">{r.step}</td>
                        <td className="py-1.5 pr-4 text-right tabular-nums">
                          {formatMoney(r.amount)}
                        </td>
                        <td className="py-1.5 text-right tabular-nums">
                          {data.bill > 0
                            ? `$${((r.amount / data.bill) * 100).toFixed(2)}`
                            : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-muted-foreground">
                Referral = rates entered in {SRC.staffing}, plus actual referral
                vendor bills parsed from {SRC.ap} where no rate
                is entered. Subvendor pay is the agreed rate until the full
                {" "}{SRC.ap} feed lands. &ldquo;Other&rdquo; holds the
                assumed-margin estimate rows so this bridge lands on the mart
                margin exactly.
              </p>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
