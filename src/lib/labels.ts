/**
 * Display labels for the PUBLIC SHOWCASE build.
 *
 * Synthetic identities only. There are no real company or source-system names
 * anywhere in this build — not in the rendered UI and not in this source file.
 */

// Keyed by both the UI key (itech/smartworks) and the mart code (a/b) so any
// caller can look up either. All values are invented.
export const COMPANY_LABELS: Record<string, string> = {
  itech: "Apex Staffing",
  smartworks: "Meridian Talent",
  a: "Apex Staffing",
  b: "Meridian Talent",
};

export const companyLabel = (codeOrKey: string): string =>
  COMPANY_LABELS[codeOrKey] ?? codeOrKey;

// Generic source-system wording — no product names.
export const SRC = {
  staffing: "the staffing system",
  payroll: "the payroll system",
  ap: "the AP ledger",
};
