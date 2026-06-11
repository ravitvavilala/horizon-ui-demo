"use client";

/**
 * Top-right company pill toggle.
 * One source of truth for which company drives every query on the page.
 * Persists to localStorage via Zustand.
 */

import { Building2 } from "lucide-react";

import { useDashboardStore, type Company } from "@/stores/dashboard";
import { cn } from "@/lib/utils";
import { COMPANY_LABELS } from "@/lib/labels";

const COMPANIES: Array<{ code: Company; label: string }> = [
  { code: "itech", label: COMPANY_LABELS.itech },
  { code: "smartworks", label: COMPANY_LABELS.smartworks },
];

export function CompanyToggle() {
  const company = useDashboardStore((s) => s.company);
  const setCompany = useDashboardStore((s) => s.setCompany);

  return (
    <div
      role="tablist"
      aria-label="Select company"
      className="inline-flex items-center gap-0.5 rounded-md border border-border bg-muted/40 p-0.5"
    >
      <Building2 className="ml-2 mr-1 hidden h-3.5 w-3.5 text-muted-foreground/70 sm:block" />
      {COMPANIES.map((c) => {
        const active = company === c.code;
        return (
          <button
            key={c.code}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setCompany(c.code)}
            className={cn(
              "rounded-sm px-2 py-1 text-xs font-medium transition-colors sm:px-3",
              active
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {c.label}
          </button>
        );
      })}
    </div>
  );
}
