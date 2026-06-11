"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { useDashboardStore } from "@/stores/dashboard";

/**
 * Year picker, populated from the data (/years). Scales automatically -
 * when the nightly pipeline lands a new year, it shows up here with no
 * code change. Always includes the selected year + the current calendar
 * year so the control is never empty.
 */
export function YearSelect() {
  const company = useDashboardStore((s) => s.company);
  const year = useDashboardStore((s) => s.year);
  const setYear = useDashboardStore((s) => s.setYear);

  const { data } = useQuery({
    queryKey: ["years", company],
    queryFn: () => api.getCompanyYears(company),
  });

  const years = useMemo(() => {
    const set = new Set<number>(data?.years ?? []);
    set.add(year);
    set.add(new Date().getFullYear());
    return [...set].sort((a, b) => b - a);
  }, [data, year]);

  return (
    <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
      <SelectTrigger className="h-9 w-28">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {years.map((y) => (
          <SelectItem key={y} value={String(y)}>
            {y}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
