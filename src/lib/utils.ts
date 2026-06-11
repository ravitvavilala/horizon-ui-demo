import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Tailwind class-merge helper. Use in every component that composes
 * conditional classNames - prevents duplicate/colliding utilities.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Masked figures (PUBLIC DEMO) ─────────────────────────────────────────────
// This is a showcase build. Every concrete financial figure is intentionally
// MASKED so no dollar amount or margin is ever shown. Charts still render their
// shapes/trends from the underlying synthetic values, but all displayed numbers
// read as a mask. There is no real data anywhere in this build.
const MONEY_MASK = "$•••••";
const PCT_MASK = "••.•%";
const TICK_MASK = "$•••";

export function formatMoney(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return MONEY_MASK;
}

export function formatPct(value: number | string): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return "—";
  return PCT_MASK;
}

/**
 * Chart-axis money tick — masked in the demo. The chart geometry still uses the
 * raw numeric values, so trends/shape are visible; the axis labels are hidden.
 */
export function compactMoneyTick(v: number): string {
  if (!Number.isFinite(v)) return "";
  return TICK_MASK;
}
