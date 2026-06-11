"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDashboardStore, type ConsultantCohort } from "@/stores/dashboard";

export function ConsultantTypeSelect() {
  const cohort = useDashboardStore((s) => s.consultantCohort);
  const setCohort = useDashboardStore((s) => s.setConsultantCohort);

  return (
    <Select value={cohort} onValueChange={(v) => setCohort(v as ConsultantCohort)}>
      <SelectTrigger className="h-8 w-32 text-xs">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All types</SelectItem>
        <SelectItem value="w2">W-2 Direct</SelectItem>
        <SelectItem value="subvendor">Subvendor</SelectItem>
      </SelectContent>
    </Select>
  );
}
