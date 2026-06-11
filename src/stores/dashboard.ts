"use client";

import { create } from "zustand";

export type Period = "7d" | "30d" | "90d" | "ytd" | "12m";

export type Business = "combined" | "w2" | "subvendor";
export type Company = "itech" | "smartworks";
export type ConsultantCohort = "all" | "w2" | "subvendor";

type DashboardState = {
  period: Period;
  setPeriod: (p: Period) => void;

  // Phase 6: top-right company toggle drives every query.
  company: Company;
  setCompany: (c: Company) => void;

  // Calendar year for /clients, /consultants, /vendors, /ar.
  year: number;
  setYear: (y: number) => void;

  consultantCohort: ConsultantCohort;
  setConsultantCohort: (c: ConsultantCohort) => void;

  business: Business;
  setBusiness: (b: Business) => void;

  activeOnly: boolean;
  setActiveOnly: (v: boolean) => void;

  employmentTypes: Record<string, boolean>;
  toggleEmploymentType: (id: string) => void;

  showLineage: boolean;
  setShowLineage: (v: boolean) => void;

  showCommandPalette: boolean;
  setShowCommandPalette: (v: boolean) => void;
};

// Persisted reads on hydration so refresh keeps user's last selection.
const readLS = (k: string): string | null => {
  if (typeof window === "undefined") return null;
  try { return window.localStorage.getItem(k); } catch { return null; }
};
const writeLS = (k: string, v: string) => {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(k, v); } catch {}
};

export const useDashboardStore = create<DashboardState>((set) => ({
  period: "30d",
  setPeriod: (p) => set({ period: p }),

  company: ((readLS("horizon.company") as Company) ?? "itech"),
  setCompany: (c) => { writeLS("horizon.company", c); set({ company: c }); },

  // Default to the current calendar year so the app auto-advances every
  // year (no hard-coded year to bump). Persisted across reloads. The year
  // dropdowns are populated from the data (/years), so only years that
  // actually have data are selectable.
  year: ((): number => {
    const saved = readLS("horizon.year");
    const n = saved ? Number(saved) : NaN;
    return Number.isFinite(n) ? n : new Date().getFullYear();
  })(),
  setYear: (y) => { writeLS("horizon.year", String(y)); set({ year: y }); },

  consultantCohort: ((readLS("horizon.consultantCohort") as ConsultantCohort) ?? "all"),
  setConsultantCohort: (c) => { writeLS("horizon.consultantCohort", c); set({ consultantCohort: c }); },

  business: "combined",
  setBusiness: (b) => set({ business: b }),

  activeOnly: false,
  setActiveOnly: (v) => set({ activeOnly: v }),

  employmentTypes: { "3P/I": true, "2HOURLY": true, "4Subs": false, "1SALARY": true },
  toggleEmploymentType: (id) =>
    set((s) => ({
      employmentTypes: { ...s.employmentTypes, [id]: !s.employmentTypes[id] },
    })),

  showLineage: true,
  setShowLineage: (v) => set({ showLineage: v }),

  showCommandPalette: false,
  setShowCommandPalette: (v) => set({ showCommandPalette: v }),
}));
