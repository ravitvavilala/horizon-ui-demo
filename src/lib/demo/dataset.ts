/**
 * Synthetic demo dataset — PUBLIC SHOWCASE BUILD.
 *
 * Every value in this file is fabricated. There is NO database, NO backend,
 * and NO connection to any real source system. When NEXT_PUBLIC_DEMO_MODE=1
 * the API client (src/lib/api.ts) short-circuits every network call and reads
 * from the generators here instead.
 *
 * Numbers are produced by a seeded PRNG so a given (company, year, entity)
 * always yields the same figure — SSR and client hydration render identically,
 * and the story stays stable across reloads.
 *
 * Company identities, people, clients and vendors are all invented. They do
 * not name, and must never name, any real operating company or stakeholder.
 */

// ── Identity ──────────────────────────────────────────────────────────────
export type CompanyKey = "itech" | "smartworks";

export const DEMO_COMPANY: Record<
  CompanyKey,
  { code: "a" | "b"; key: CompanyKey; name: string }
> = {
  itech: { code: "a", key: "itech", name: "Apex Staffing" },
  smartworks: { code: "b", key: "smartworks", name: "Meridian Talent" },
};

export const codeToKey = (c: string): CompanyKey =>
  c === "b" || c === "smartworks" ? "smartworks" : "itech";
export const keyToCode = (k: CompanyKey): "a" | "b" =>
  k === "smartworks" ? "b" : "a";
export const companyName = (codeOrKey: string): string =>
  DEMO_COMPANY[codeToKey(codeOrKey)].name;

// ── Time window ───────────────────────────────────────────────────────────
const NOW = new Date();
export const NOW_YEAR = NOW.getFullYear();
// Current year is "closed through" the previous calendar month (mirrors the
// real books-close discipline). Clamp to 1 so January still shows a month.
const CLOSED_MONTH = Math.max(1, NOW.getMonth()); // getMonth() is 0-based
export const DEMO_YEARS = [NOW_YEAR, NOW_YEAR - 1, NOW_YEAR - 2];

export function monthsInYear(year: number): number {
  if (year < NOW_YEAR) return 12;
  if (year > NOW_YEAR) return 0;
  return CLOSED_MONTH;
}
export function closedThrough(year: number): { y: number; m: number } {
  if (year >= NOW_YEAR) return { y: NOW_YEAR, m: CLOSED_MONTH };
  return { y: year, m: 12 };
}

// Generic working-day calendar (not confidential — a plain business calendar).
const BILLING_DAYS = [22, 20, 21, 22, 21, 21, 22, 21, 21, 23, 18, 22];

// ── Deterministic PRNG ────────────────────────────────────────────────────
function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function rngFor(...parts: (string | number)[]): () => number {
  return mulberry32(hashStr(parts.join("|")));
}
/** Stable jitter in [1-amt, 1+amt] for (key). */
function jitter(amt: number, ...parts: (string | number)[]): number {
  return 1 + (rngFor(...parts)() * 2 - 1) * amt;
}
const r2 = (n: number) => Math.round(n * 100) / 100;
const money = (n: number) => r2(n).toFixed(2);

// ── Company financial baselines (fabricated) ──────────────────────────────
// Fabricated baselines, deliberately unlike any real business. Displayed
// figures are masked anyway; these only scale the (synthetic) chart shapes.
const BASE: Record<CompanyKey, { rev: number; margin: number; bill: number }> = {
  itech: { rev: 48_000_000, margin: 15.5, bill: 95 },
  smartworks: { rev: 16_500_000, margin: 18.2, bill: 88 },
};
// Mild YoY growth; (NOW_YEAR-1) is the index year at 1.0x.
const yearScale = (year: number) => Math.pow(1.07, year - (NOW_YEAR - 1));
// Seasonal shape across the calendar year (sums ~12).
const SEASON = [0.92, 0.95, 1.02, 1.0, 1.04, 1.05, 1.0, 1.03, 1.06, 1.08, 0.92, 0.93];

export type MonthRow = {
  period_month: string;
  month: number;
  total_hours: number;
  revenue: number;
  expense: number;
  gross_margin: number;
  margin_pct: number;
  client_count: number;
  billing_days: number;
  revenue_per_billing_day: number;
};

export function monthly(key: CompanyKey, year: number): MonthRow[] {
  const n = monthsInYear(year);
  const base = BASE[key];
  const monthlyBase = (base.rev * yearScale(year)) / 12;
  const rows: MonthRow[] = [];
  for (let m = 1; m <= n; m++) {
    const rev = monthlyBase * SEASON[m - 1] * jitter(0.05, key, year, m, "rev");
    const marginPct = base.margin + (jitter(1, key, year, m, "mgn") - 1) * 130;
    const gm = rev * (marginPct / 100);
    const expense = rev - gm;
    const hours = rev / (base.bill * jitter(0.04, key, year, m, "hrs"));
    const bdays = BILLING_DAYS[m - 1];
    const clients = Math.round(
      (key === "itech" ? 74 : 26) * jitter(0.06, key, year, m, "cli"),
    );
    rows.push({
      period_month: `${year}-${String(m).padStart(2, "0")}-01`,
      month: m,
      total_hours: Math.round(hours),
      revenue: r2(rev),
      expense: r2(expense),
      gross_margin: r2(gm),
      margin_pct: r2((gm / rev) * 100),
      client_count: clients,
      billing_days: bdays,
      revenue_per_billing_day: r2(rev / bdays),
    });
  }
  return rows;
}

export function headline(key: CompanyKey, year: number) {
  const ms = monthly(key, year);
  const revenue = r2(ms.reduce((s, m) => s + m.revenue, 0));
  const expense = r2(ms.reduce((s, m) => s + m.expense, 0));
  const gm = r2(revenue - expense);
  const hours = ms.reduce((s, m) => s + m.total_hours, 0);
  const ct = closedThrough(year);
  return {
    year,
    company_code: keyToCode(key),
    company_name: DEMO_COMPANY[key].name,
    client_count: key === "itech" ? 84 : 29,
    consultant_count_sum: key === "itech" ? 268 : 71,
    total_hours: hours,
    revenue,
    expense,
    gross_margin: gm,
    margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
    _pnl_source: "demo_synthetic",
    closed_through_year: ct.y,
    closed_through_month: ct.m,
  };
}

// ── Rosters (fabricated names) ─────────────────────────────────────────────
const CLIENT_NAMES_A = [
  "Lumen Health Systems", "Cobalt Financial Group", "Northwind Logistics",
  "Brightpath Insurance", "Vanguard Manufacturing", "Summit Retail Partners",
  "Ironwood Energy", "Crestline Pharmaceuticals", "Beacon Telecom",
  "Granite State Bank", "Helix Biotech", "Atlas Aerospace",
  "Pinnacle Media Group", "Delphi Software", "Redwood Utilities",
  "Sterling Capital", "Monarch Hospitality", "Cascade Robotics",
  "Evergreen Foods", "Harborview Medical", "Quantum Semiconductors",
  "Meridian Auto Group", "Trinity Healthcare", "Solstice Solar",
  "Falcon Defense Systems", "Cardinal Logistics", "Bluegrass Power",
  "Orion Networks", "Sequoia Outdoor", "Tidewater Shipping",
];
const CLIENT_NAMES_B = [
  "Riverside Clinics", "Keystone Construction", "Aurora Payments",
  "Maple Leaf Retail", "Sandstone Mining", "Westgate Hospitals",
  "Copperline Telecom", "Fairhaven Bank", "Greenfield Agritech",
  "Lakeshore Media", "Prairie Wind Energy", "Saffron Foods",
  "Thornton Logistics", "Marigold Health", "Slate Manufacturing",
  "Driftwood Resorts", "Birchwood Software", "Camden Insurance",
];
const VENDOR_NAMES = [
  "Astra Consulting Partners", "Bluefin Technologies", "Cedar Point Staffing",
  "Delta Bridge Solutions", "Equinox IT Services", "Fathom Analytics Group",
  "Gateway Talent Co", "Highline Engineering", "Juniper Systems",
  "Kestrel Software Labs", "Lattice Digital", "Nimbus Cloud Services",
  "Opal Data Group", "Pioneer Tech Resources", "Quartz Consulting",
  "Ridgeway Associates", "Silverline Solutions", "Tamarack Technical",
];
const FIRST = [
  "James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael",
  "Linda", "David", "Elizabeth", "William", "Barbara", "Richard", "Susan",
  "Joseph", "Jessica", "Thomas", "Sarah", "Chris", "Karen", "Daniel", "Nancy",
  "Matthew", "Lisa", "Anthony", "Margaret", "Mark", "Sandra", "Priya",
  "Wei", "Carlos", "Aisha", "Dmitri", "Sofia", "Hiroshi", "Fatima",
];
const LAST = [
  "Smith", "Johnson", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Rodriguez", "Martinez", "Hernandez", "Lopez", "Gonzalez",
  "Wilson", "Anderson", "Thomas", "Taylor", "Moore", "Jackson", "Martin",
  "Lee", "Perez", "Thompson", "White", "Harris", "Sanchez", "Clark",
  "Ramirez", "Coleman", "Robinson", "Walker", "Young", "Patel", "Nguyen",
  "Kim", "Okafor",
];
const POSITIONS = [
  "Senior Software Engineer", "Data Analyst", "Project Manager",
  "DevOps Engineer", "Business Analyst", "QA Engineer", "Solutions Architect",
  "Scrum Master", "UX Designer", "Network Engineer", "Database Administrator",
  "Security Analyst", "Cloud Engineer", "Product Owner", "Systems Analyst",
];
const STATES = ["CA", "TX", "NY", "IL", "WA", "MA", "NJ", "GA", "FL", "CO", "VA", "NC"];
const CITIES = ["Austin", "Dallas", "San Jose", "Chicago", "Seattle", "Boston",
  "Newark", "Atlanta", "Tampa", "Denver", "Reston", "Charlotte"];
const WC_CODES = ["8810", "8742", "8820", "9015", "8601"];
const CHANNELS = ["Direct", "VMS Program A", "VMS Program B", "MSP Partner", "Referral"];
const EMP_TYPES = ["3P/I", "2HOURLY", "4Subs", "1SALARY"] as const;

const pick = <T,>(arr: T[], i: number): T => arr[i % arr.length];

// ── Clients ────────────────────────────────────────────────────────────────
export type ClientRow = ReturnType<typeof clientsInternal>[number];
function clientsInternal(key: CompanyKey, year: number) {
  const names = key === "itech" ? CLIENT_NAMES_A : CLIENT_NAMES_B;
  const hl = headline(key, year);
  // Zipf-ish weights so a few clients dominate.
  const weights = names.map((_, i) => 1 / Math.pow(i + 1.4, 0.85));
  const wsum = weights.reduce((a, b) => a + b, 0);
  return names
    .map((name, i) => {
      const w = (weights[i] / wsum) * jitter(0.12, key, year, "cliW", i);
      const revenue = hl.revenue * w;
      const marginPct = BASE[key].margin + (jitter(1, key, year, "cliM", i) - 1) * 320;
      const gm = revenue * (marginPct / 100);
      const expense = revenue - gm;
      const usPay = expense * 0.86;
      const referral = expense - usPay;
      const hours = revenue / BASE[key].bill;
      const consultants = Math.max(1, Math.round(28 * w * (key === "itech" ? 26 : 11)));
      const billed = revenue * jitter(0.03, key, year, "cliBill", i);
      const received = billed * (0.72 + rngFor(key, year, "cliRcv", i)() * 0.24);
      const outstanding = Math.max(0, billed - received);
      return {
        client_master_id: `${keyToCode(key)}-CM-${String(i + 1).padStart(4, "0")}`,
        client_id: 4000 + i + (key === "itech" ? 0 : 500),
        client_name: name,
        consultant_count: consultants,
        total_hours: Math.round(hours),
        revenue: r2(revenue),
        us_pay_expense: r2(usPay),
        referral_expense: r2(referral),
        expense: r2(expense),
        gross_margin: r2(gm),
        margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
        cost_pending_qb: i % 9 === 3,
        ar_invoices: Math.max(1, Math.round(consultants * 1.6)),
        ar_billed: r2(billed),
        ar_received: r2(received),
        ar_outstanding: r2(outstanding),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
export function clients(key: CompanyKey, year: number, limit = 500) {
  return clientsInternal(key, year).slice(0, limit);
}
export function clientDetail(key: CompanyKey, masterId: string, year: number) {
  const row = clientsInternal(key, year).find((c) => c.client_master_id === masterId);
  if (!row) return { found: false as const };
  const ms = monthly(key, year);
  const share = row.revenue / Math.max(1, headline(key, year).revenue);
  const monthlyRows = ms.map((m) => {
    const revenue = r2(m.revenue * share * jitter(0.08, masterId, m.month));
    const expense = r2(revenue * (1 - row.margin_pct / 100));
    const gm = r2(revenue - expense);
    return {
      period_month: m.period_month,
      total_hours: Math.round(m.total_hours * share),
      revenue,
      us_pay_expense: r2(expense * 0.86),
      referral_expense: r2(expense * 0.14),
      expense,
      gross_margin: gm,
      margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
    };
  });
  return { found: true as const, year, ...row, monthly: monthlyRows };
}

// ── Consultants ────────────────────────────────────────────────────────────
function empForCohort(i: number): (typeof EMP_TYPES)[number] {
  // Weighted: mostly 3P/I, some hourly, fewer subs/salary.
  const m = i % 10;
  if (m < 5) return "3P/I";
  if (m < 7) return "2HOURLY";
  if (m < 9) return "4Subs";
  return "1SALARY";
}
const cohortOf = (emp: string): "w2" | "subvendor" =>
  emp === "4Subs" ? "subvendor" : "w2";

function consultantCount(key: CompanyKey): number {
  return key === "itech" ? 130 : 48;
}
export function consultantsInternal(key: CompanyKey, year: number) {
  const count = consultantCount(key);
  const hl = headline(key, year);
  const weights = Array.from({ length: count }, (_, i) =>
    1 / Math.pow(i + 2, 0.6) * jitter(0.2, key, year, "conW", i),
  );
  const wsum = weights.reduce((a, b) => a + b, 0);
  const clientNames = key === "itech" ? CLIENT_NAMES_A : CLIENT_NAMES_B;
  return Array.from({ length: count }, (_, i) => {
    const emp = empForCohort(i);
    const w = weights[i] / wsum;
    const revenue = hl.revenue * w;
    const marginPct =
      (emp === "4Subs" ? 7 : BASE[key].margin + 4) +
      (jitter(1, key, year, "conM", i) - 1) * 600;
    const gm = revenue * (marginPct / 100);
    const expense = revenue - gm;
    const hours = revenue / (BASE[key].bill * jitter(0.1, key, "conB", i));
    const id = (key === "itech" ? 100000 : 200000) + i;
    return {
      consultant_master_id: `${keyToCode(key)}-CN-${String(i + 1).padStart(5, "0")}`,
      consultant_id: id,
      first_name: pick(FIRST, hashStr(`${key}f${i}`)),
      last_name: pick(LAST, hashStr(`${key}l${i}`)),
      employment_type: emp,
      cohort: cohortOf(emp),
      job_wc_code: pick(WC_CODES, i),
      is_active: i % 7 !== 0,
      total_hours: Math.round(hours),
      revenue: r2(revenue),
      expense: r2(expense),
      gross_margin: r2(gm),
      margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
      cost_pending_qb: emp === "4Subs" && i % 4 === 0,
      assignments_count: 1 + (i % 3),
      client_name: pick(clientNames, i),
      position_title: pick(POSITIONS, i),
      city: pick(CITIES, i),
      state: pick(STATES, i),
    };
  });
}
export function consultants(
  key: CompanyKey,
  year: number,
  cohort: "all" | "w2" | "subvendor" = "all",
  limit = 500,
) {
  let rows = consultantsInternal(key, year);
  if (cohort !== "all") rows = rows.filter((c) => c.cohort === cohort);
  return rows.sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}
export function consultantById(id: number) {
  const key: CompanyKey = id >= 200000 ? "smartworks" : "itech";
  const year = NOW_YEAR;
  const row = consultantsInternal(key, year).find((c) => c.consultant_id === id);
  return row ? { key, year, row } : null;
}

// ── Vendors ────────────────────────────────────────────────────────────────
export function vendorsInternal(key: CompanyKey, year: number) {
  const hl = headline(key, year);
  // Vendors only represent the subvendor (pass-through) slice of spend.
  const subPool = hl.revenue * 0.42;
  const names = key === "itech" ? VENDOR_NAMES : VENDOR_NAMES.slice(0, 6);
  const weights = names.map((_, i) => 1 / Math.pow(i + 1.5, 0.8));
  const wsum = weights.reduce((a, b) => a + b, 0);
  return names
    .map((vendor_name, i) => {
      const w = (weights[i] / wsum) * jitter(0.14, key, year, "venW", i);
      const revenue = subPool * w;
      const marginPct = 6.5 + (jitter(1, key, year, "venM", i) - 1) * 240;
      const gm = revenue * (marginPct / 100);
      const cost = revenue - gm;
      const consultants = Math.max(1, Math.round(w * (key === "itech" ? 70 : 28)));
      const hours = revenue / BASE[key].bill;
      const matchRate = 88 + rngFor(key, year, "venMr", i)() * 11;
      const bills = Math.round(consultants * 11 * jitter(0.1, key, "venBills", i));
      return {
        vendor_name,
        billable_consultants: consultants,
        consultant_count: consultants,
        bills_count: bills,
        total_hours: Math.round(hours),
        revenue: r2(revenue),
        cost: r2(cost),
        expense: r2(cost),
        gross_margin: r2(gm),
        margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
        match_rate_pct: r2(matchRate),
      };
    })
    .sort((a, b) => b.revenue - a.revenue);
}
export function vendors(key: CompanyKey, year: number, limit = 500) {
  return vendorsInternal(key, year).slice(0, limit);
}

// ── Channels / customers / waterfall ───────────────────────────────────────
export function channels(key: CompanyKey, year: number) {
  const hl = headline(key, year);
  const weights = [0.46, 0.22, 0.16, 0.1, 0.06];
  return CHANNELS.map((name, i) => ({
    name,
    revenue: r2(hl.revenue * weights[i] * jitter(0.05, key, year, "ch", i)),
  }));
}
export function customers(key: CompanyKey, year: number, month?: number | null) {
  const hl = headline(key, year);
  const scale = month ? 1 / Math.max(1, monthsInYear(year)) : 1;
  const weights = [0.46, 0.22, 0.16, 0.1, 0.06];
  return CHANNELS.map((msp_channel, i) => {
    const revenue = hl.revenue * weights[i] * scale * jitter(0.05, key, year, month ?? 0, "cust", i);
    const marginPct = BASE[key].margin + (jitter(1, key, year, "custM", i) - 1) * 200;
    const margin = revenue * (marginPct / 100);
    const cost = revenue - margin;
    const mspFee = revenue * (i === 0 ? 0 : 0.02 + i * 0.004);
    const reconMargin = margin - mspFee;
    return {
      msp_channel,
      consultant_count: Math.max(1, Math.round((key === "itech" ? 60 : 22) * weights[i])),
      revenue: r2(revenue),
      cost: r2(cost),
      margin: r2(margin),
      recon_margin: r2(reconMargin),
      msp_fee: r2(mspFee),
      margin_pct: revenue ? r2((margin / revenue) * 100) : 0,
      recon_margin_pct: revenue ? r2((reconMargin / revenue) * 100) : 0,
    };
  });
}
export function waterfall(key: CompanyKey, year: number, channel: string) {
  const chs = channels(key, year);
  const ch = channel ? chs.find((c) => c.name === channel) : null;
  const bill = ch ? ch.revenue : chs.reduce((s, c) => s + c.revenue, 0);
  const payCost = bill * 0.74;
  const referral = bill * 0.035;
  const discount = bill * 0.018;
  const benefits = bill * 0.012;
  const tax = bill * 0.041;
  const margin = bill - payCost - referral - discount - benefits - tax;
  return {
    year,
    channel: channel || null,
    bill: r2(bill),
    margin: r2(margin),
    margin_pct: bill ? r2((margin / bill) * 100) : 0,
    steps: [
      { key: "bill", label: "Client bill", amount: r2(bill) },
      { key: "pay", label: "Consultant pay", amount: r2(-payCost) },
      { key: "referral", label: "Referral", amount: r2(-referral) },
      { key: "discount", label: "Volume discount", amount: r2(-discount) },
      { key: "benefits", label: "Benefits", amount: r2(-benefits) },
      { key: "tax", label: "Employer tax", amount: r2(-tax) },
      { key: "margin", label: "Gross margin", amount: r2(margin) },
    ],
  };
}

// ── AR ──────────────────────────────────────────────────────────────────────
export function arTermAging(key: CompanyKey) {
  const names = (key === "itech" ? CLIENT_NAMES_A : CLIENT_NAMES_B).slice(0, key === "itech" ? 26 : 16);
  const accounts = names.map((billto_name, i) => {
    const base = (key === "itech" ? 620000 : 240000) / Math.pow(i + 1.3, 0.7);
    const txn = base * jitter(0.2, key, "arT", i);
    const cash = -txn * (rngFor(key, "arC", i)() * 0.18);
    const arBal = txn + cash;
    const cur = arBal * (0.55 + rngFor(key, "arCur", i)() * 0.2);
    const d30 = arBal * (0.15 + rngFor(key, "ar30", i)() * 0.12);
    const d60 = arBal * (0.06 + rngFor(key, "ar60", i)() * 0.08);
    const d60p = Math.max(0, arBal - cur - d30 - d60);
    const lastPayDays = Math.round(rngFor(key, "arLp", i)() * 70) + 3;
    const d = new Date(NOW);
    d.setDate(d.getDate() - lastPayDays);
    return {
      billto_number: 5000 + i + (key === "itech" ? 0 : 400),
      billto_name,
      ar_balance: r2(arBal),
      cash_on_acct: r2(cash),
      transaction_balance: r2(txn),
      current: r2(cur),
      overdue_0_30: r2(d30),
      overdue_31_60: r2(d60),
      overdue_60_plus: r2(d60p),
      last_payment_date: d.toISOString().slice(0, 10),
    };
  });
  const sum = (f: (a: (typeof accounts)[number]) => number) =>
    r2(accounts.reduce((s, a) => s + f(a), 0));
  const arBalance = sum((a) => a.ar_balance);
  const txnBalance = sum((a) => a.transaction_balance);
  return {
    totals: {
      ar_balance: arBalance,
      cash_on_acct: sum((a) => a.cash_on_acct),
      transaction_balance: txnBalance,
      current_amt: sum((a) => a.current),
      overdue_0_30: sum((a) => a.overdue_0_30),
      overdue_31_60: sum((a) => a.overdue_31_60),
      overdue_60_plus: sum((a) => a.overdue_60_plus),
      dso_days: r2(42 + (key === "itech" ? 0 : 6)),
    },
    accounts: accounts.sort((a, b) => b.ar_balance - a.ar_balance),
  };
}
export function arMonthly(key: CompanyKey, year: number) {
  return monthly(key, year).map((m) => {
    const billed = m.revenue * jitter(0.03, key, "armB", m.month);
    const received = billed * (0.74 + rngFor(key, "armR", m.month)() * 0.2);
    const outstanding = Math.max(0, billed - received);
    return {
      month: m.month,
      period_month: m.period_month,
      billed: r2(billed),
      received: r2(received),
      outstanding: r2(outstanding),
      billing_days: m.billing_days,
      billed_per_day: r2(billed / m.billing_days),
    };
  });
}
export function arSummary(year: number) {
  return {
    year,
    companies: (["itech", "smartworks"] as CompanyKey[]).map((key) => {
      const am = arMonthly(key, year);
      const billed = r2(am.reduce((s, m) => s + m.billed, 0));
      const received = r2(am.reduce((s, m) => s + m.received, 0));
      const outstanding = r2(Math.max(0, billed - received));
      const inv = key === "itech" ? 1480 : 460;
      return {
        source_company: keyToCode(key),
        invoice_count: inv,
        paid_count: Math.round(inv * 0.82),
        unpaid_count: Math.round(inv * 0.18),
        billed_total: billed,
        received_total: received,
        outstanding_total: outstanding,
        outstanding_0_30: r2(outstanding * 0.58),
        outstanding_31_60: r2(outstanding * 0.24),
        outstanding_61_90: r2(outstanding * 0.11),
        outstanding_90_plus: r2(outstanding * 0.07),
        dso_weighted_paid: r2(42 + (key === "itech" ? 0 : 6)),
        collected_pct: billed ? r2((received / billed) * 100) : 0,
        billed_l12m: billed,
        received_l12m: received,
        outstanding_l12m: outstanding,
        collected_pct_l12m: billed ? r2((received / billed) * 100) : 0,
      };
    }),
  };
}
export function arByClient(key: CompanyKey, year: number, limit = 500) {
  const rows = clientsInternal(key, year).map((c) => {
    const billed = c.ar_billed;
    const received = c.ar_received;
    const outstanding = c.ar_outstanding;
    return {
      source_company: keyToCode(key),
      client_id: c.client_id,
      client_master_id: c.client_master_id,
      client_name: c.client_name,
      invoice_count: c.ar_invoices,
      paid_count: Math.round(c.ar_invoices * 0.8),
      unpaid_count: Math.round(c.ar_invoices * 0.2),
      billed_total: billed,
      received_total: received,
      outstanding_total: outstanding,
      outstanding_0_30: r2(outstanding * 0.58),
      outstanding_31_60: r2(outstanding * 0.24),
      outstanding_61_90: r2(outstanding * 0.11),
      outstanding_90_plus: r2(outstanding * 0.07),
      dso_avg: r2(38 + rngFor(key, "dso", c.client_id)() * 20),
      collected_pct: billed ? r2((received / billed) * 100) : 0,
    };
  });
  return { year, total: rows.length, rows: rows.slice(0, limit) };
}

// ── Combined headline / trend / briefing ───────────────────────────────────
export function combinedHeadline(window: string) {
  const mk = (key: CompanyKey, frac: number) => {
    const hl = headline(key, NOW_YEAR - 1);
    const revenue = r2(hl.revenue * frac);
    const gm = r2(revenue * (BASE[key].margin / 100));
    const expense = r2(revenue - gm);
    const tax = r2(revenue * 0.041);
    return {
      consultants: hl.consultant_count_sum,
      revenue,
      expense,
      employer_tax: tax,
      profit: gm,
      margin_pct: revenue ? r2((gm / revenue) * 100) : 0,
      gap_rows: 0,
      rows: hl.consultant_count_sum,
    };
  };
  const frac = window === "ytd" ? monthsInYear(NOW_YEAR) / 12 : window === "l12m" ? 1 : 2.1;
  const w2A = mk("itech", frac * 0.58);
  const subA = mk("itech", frac * 0.42);
  const sum = (a: typeof w2A, b: typeof w2A) => ({
    consultants: a.consultants + b.consultants,
    revenue: r2(a.revenue + b.revenue),
    expense: r2(a.expense + b.expense),
    employer_tax: r2(a.employer_tax + b.employer_tax),
    profit: r2(a.profit + b.profit),
    margin_pct: r2(((a.profit + b.profit) / (a.revenue + b.revenue)) * 100),
  });
  return { window, w2: w2A, subvendor: subA, combined: sum(w2A, subA) };
}
export function v2Trend(months = 12) {
  const out: { period_ending: string; revenue: number; total_expenses: number; profit: number; margin_pct: number }[] = [];
  for (let k = months - 1; k >= 0; k--) {
    const d = new Date(NOW_YEAR, NOW.getMonth() - k, 1);
    const key: CompanyKey = "itech";
    const mb = (BASE[key].rev / 12) * yearScale(d.getFullYear());
    const revenue = r2(mb * SEASON[d.getMonth()] * 1.6 * jitter(0.05, "trend", d.getFullYear(), d.getMonth()));
    const profit = r2(revenue * (BASE[key].margin / 100));
    out.push({
      period_ending: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`,
      revenue,
      total_expenses: r2(revenue - profit),
      profit,
      margin_pct: r2((profit / revenue) * 100),
    });
  }
  return { rows: out, since: out[0]?.period_ending ?? "" };
}
export function briefing() {
  const a = headline("itech", NOW_YEAR);
  const b = headline("smartworks", NOW_YEAR);
  const rev = a.revenue + b.revenue;
  const profit = a.gross_margin + b.gross_margin;
  return {
    as_of: NOW.toISOString().slice(0, 10),
    combined_mtd_revenue: money(rev / Math.max(1, monthsInYear(NOW_YEAR))),
    combined_mtd_profit: money(profit / Math.max(1, monthsInYear(NOW_YEAR))),
    combined_mtd_margin_pct: r2((profit / rev) * 100).toFixed(1),
    lines: [
      { kind: "headline" as const, text: `${DEMO_COMPANY.itech.name} revenue is tracking ${formatPctG((a.margin_pct))} gross margin year-to-date.` },
      { kind: "alert" as const, text: `Over-60-day AR rose at 3 accounts; collections focus recommended.` },
      { kind: "note" as const, text: `Subvendor margin remains thin (~7%); watch pass-through mix.` },
      { kind: "note" as const, text: `${DEMO_COMPANY.smartworks.name} margin ${formatPctG(b.margin_pct)} — above plan.` },
    ],
    gaps: {
      state_tax: false,
      wc: false,
      sick_leave: false,
      four_subs_cost: false,
      overhead: true,
      intercompany: true,
    },
  };
}
const formatPctG = (n: number) => `${n.toFixed(1)}%`;

// ── Legacy string-money detail shapes (consultant/vendor/company) ──────────
export function consultantDetailV3(id: number) {
  const found = consultantById(id);
  const key: CompanyKey = id >= 200000 ? "smartworks" : "itech";
  if (!found) {
    return {
      consultant_id: id, first_name: null, last_name: null,
      employment_type: null, job_wc_code: null, source_company: keyToCode(key),
      is_active: null, status: null,
      totals: { gross_revenue: 0, discounts: 0, adjustments: 0, revenue: 0, expense: 0, employer_tax: 0, profit: 0, margin_pct: 0 },
      coverage: { payment_summary_periods: 0, archive_periods: 0, gap_periods: 0, total_periods: 0 },
      periods: [],
    };
  }
  const { row } = found;
  const ms = monthly(key, NOW_YEAR - 1);
  const share = row.revenue / Math.max(1, headline(key, NOW_YEAR - 1).revenue);
  const periods = ms.map((m, idx) => {
    const gross = r2(m.revenue * share * jitter(0.1, id, m.month));
    const discounts = r2(gross * 0.02);
    const adjustments = r2(gross * 0.005 * (idx % 2 ? -1 : 1));
    const revenue = r2(gross - discounts + adjustments);
    const expense = r2(revenue * (1 - row.margin_pct / 100));
    const tax = r2(revenue * 0.04);
    const profit = r2(revenue - expense - tax);
    return {
      period_month: m.period_month,
      gross_revenue: gross, discounts, adjustments, revenue, expense,
      employer_tax: tax, profit,
      margin_pct: revenue ? r2((profit / revenue) * 100) : 0,
      bill_hours: Math.round(m.total_hours * share),
      pay_hours: Math.round(m.total_hours * share),
      invoice_count: 1 + (idx % 3),
      assignment_count: row.assignments_count,
      _revenue_source: "demo_synthetic",
      _expense_source: row.cohort === "w2" ? "payment_summary" : "archive",
    };
  });
  const t = (f: (p: (typeof periods)[number]) => number) => r2(periods.reduce((s, p) => s + f(p), 0));
  const revenue = t((p) => p.revenue);
  const expense = t((p) => p.expense);
  const tax = t((p) => p.employer_tax);
  const profit = r2(revenue - expense - tax);
  return {
    consultant_id: id,
    first_name: row.first_name, last_name: row.last_name,
    employment_type: row.cohort, job_wc_code: row.job_wc_code,
    source_company: keyToCode(key), is_active: row.is_active, status: row.is_active ? "Active" : "Inactive",
    totals: {
      gross_revenue: t((p) => p.gross_revenue), discounts: t((p) => p.discounts),
      adjustments: t((p) => p.adjustments), revenue, expense, employer_tax: tax,
      profit, margin_pct: revenue ? r2((profit / revenue) * 100) : 0,
    },
    coverage: {
      payment_summary_periods: row.cohort === "w2" ? periods.length : 0,
      archive_periods: row.cohort === "w2" ? 0 : periods.length,
      gap_periods: 0, total_periods: periods.length,
    },
    periods,
  };
}
export function consultantDetailV2(id: number) {
  const found = consultantById(id);
  const key: CompanyKey = id >= 200000 ? "smartworks" : "itech";
  if (!found) {
    return {
      consultant_id: id, first_name: null, last_name: null, client_name: null,
      position_title: null, employment_type: null, source_company: keyToCode(key),
      total_revenue: 0, total_expenses: 0, total_profit: 0, total_margin_pct: 0,
      iprise_periods: 0, fallback_periods: 0, rates: [], periods: [],
    };
  }
  const { row } = found;
  const v3 = consultantDetailV3(id);
  const billRate = BASE[key].bill * jitter(0.15, id, "br");
  const payRate = billRate * (1 - (row.margin_pct + 4) / 100);
  return {
    consultant_id: id, first_name: row.first_name, last_name: row.last_name,
    client_name: row.client_name, position_title: row.position_title,
    employment_type: row.cohort, source_company: keyToCode(key),
    total_revenue: v3.totals.revenue, total_expenses: v3.totals.expense,
    total_profit: v3.totals.profit, total_margin_pct: v3.totals.margin_pct,
    iprise_periods: v3.coverage.payment_summary_periods,
    fallback_periods: v3.coverage.archive_periods,
    rates: [{
      assignment_id: `${keyToCode(key)}-A-${row.consultant_id}`,
      job_wc_code: row.job_wc_code, pay_type: "Hourly",
      bill_rate: r2(billRate), pay_rate: r2(payRate),
      volume_discount_rate: 0.02, referral_rate: 0.035, admin_rate: 0.01,
      net_bill_rate: r2(billRate * 0.98), spread: r2(billRate - payRate),
      spread_pct: r2(((billRate - payRate) / billRate) * 100),
      total_billed_hours: row.total_hours, actual_billed_amounts: v3.totals.gross_revenue,
      is_active: row.is_active,
    }],
    periods: v3.periods.map((p) => ({
      period_month: p.period_month, revenue: p.revenue, total_expenses: p.expense,
      profit: p.profit, margin_pct: p.margin_pct,
      expense_source: (row.cohort === "w2" ? "iprise_payment_summary" : "ultrastaff_v1") as
        "iprise_payment_summary" | "ultrastaff_v1",
      expense_ultrastaff_v1: p.expense,
      expense_iprise_gross: row.cohort === "w2" ? p.expense : null,
      iprise_payment_rows: row.cohort === "w2" ? 2 : 0,
      gap_iprise_fallback_pi: false,
    })),
  };
}
export function consultantDetailLegacy(id: number) {
  const found = consultantById(id);
  const key: CompanyKey = id >= 200000 ? "smartworks" : "itech";
  if (!found) {
    return {
      consultant_id: id, source_company: keyToCode(key), first_name: null, last_name: null,
      employment_type: null, is_active: false, status: null, city: null, state: null, zip: null,
      hire_date: null, termination_date: null, pay_type: null, pay_period: null,
      client_name: null, position_title: null, branch: null, line_of_business: null,
      revenue: "0", total_expenses: "0", profit: "0", margin_pct: "0",
      total_bill_hours: "0", total_pay_hours: "0", history: [],
    };
  }
  const { row } = found;
  const v3 = consultantDetailV3(id);
  const history = v3.periods.map((p) => ({
    consultant_id: id, source_company: keyToCode(key), assignment_id: row.consultant_id,
    client_id: 4000, period_ending: p.period_month, employment_type: row.employment_type,
    consultant_first_name: row.first_name, consultant_last_name: row.last_name,
    client_name: row.client_name, position_title: row.position_title,
    line_of_business: null, branch: null,
    revenue: money(p.revenue), total_bill_hours: String(p.bill_hours),
    pay_cost: money(p.expense), total_pay_hours: String(p.pay_hours),
    total_expenses: money(p.expense + p.employer_tax), profit: money(p.profit),
    margin_pct: money(p.margin_pct),
  }));
  return {
    consultant_id: id, source_company: keyToCode(key),
    first_name: row.first_name, last_name: row.last_name,
    employment_type: row.employment_type, is_active: row.is_active,
    status: row.is_active ? "Active" : "Inactive", city: row.city, state: row.state, zip: "00000",
    hire_date: `${NOW_YEAR - 2}-03-15`, termination_date: row.is_active ? null : `${NOW_YEAR}-01-31`,
    pay_type: "Hourly", pay_period: "Weekly",
    client_name: row.client_name, position_title: row.position_title,
    branch: row.city, line_of_business: "Professional Services",
    revenue: money(v3.totals.revenue), total_expenses: money(v3.totals.expense),
    profit: money(v3.totals.profit), margin_pct: money(v3.totals.margin_pct),
    total_bill_hours: String(row.total_hours), total_pay_hours: String(row.total_hours),
    history,
  };
}
export function vendorMonthly(key: CompanyKey, vendorName: string) {
  const v = vendorsInternal(key, NOW_YEAR - 1).find((x) => x.vendor_name === vendorName)
    ?? vendorsInternal(key, NOW_YEAR - 1)[0];
  const ms = monthly(key, NOW_YEAR - 1);
  const tot = headline(key, NOW_YEAR - 1).revenue;
  const share = v.revenue / Math.max(1, tot);
  const rows = ms.map((m) => {
    const revenue = m.revenue * share * jitter(0.08, vendorName, m.month);
    const cost = revenue * (1 - v.margin_pct / 100);
    const lines = Math.round(v.billable_consultants * 1.1);
    const matched = Math.round(lines * (v.match_rate_pct / 100));
    return {
      period_month: m.period_month, vendor_name: v.vendor_name,
      billable_consultants: v.billable_consultants, bills_count: Math.round(lines / 4),
      bill_lines_count: lines, matched_lines: matched, unmatched_lines: lines - matched,
      revenue: money(revenue), cost: money(cost), cost_matched: money(cost * (v.match_rate_pct / 100)),
      cost_unmatched: money(cost * (1 - v.match_rate_pct / 100)),
      gross_margin: money(revenue - cost), margin_pct: money(((revenue - cost) / revenue) * 100),
      match_rate_pct: money(v.match_rate_pct), gap_unmatched_consultants: v.match_rate_pct < 92,
    };
  });
  return { rows, source_system: "demo_synthetic", transform_version: "demo" };
}
export function vendorsSummary(key: CompanyKey = "itech") {
  const rows = vendorsInternal(key, NOW_YEAR - 1).map((v) => ({
    vendor_name: v.vendor_name, billable_consultants: v.billable_consultants,
    bills_count: v.bills_count, revenue: money(v.revenue), cost: money(v.cost),
    gross_margin: money(v.gross_margin), margin_pct: money(v.margin_pct),
    match_rate_pct: money(v.match_rate_pct),
  }));
  return { rows, since: null, until: null, transform_version: "demo" };
}
export function vendorsMonthlyAll(key: CompanyKey = "itech") {
  const rows = monthly(key, NOW_YEAR - 1).map((m) => ({
    period_month: m.period_month, spend: r2(m.expense * 0.42), revenue: r2(m.revenue * 0.42),
  }));
  return { rows };
}
export function companyConsolidated(key: CompanyKey) {
  const rows = monthly(key, NOW_YEAR - 1).map((m) => ({
    entity: DEMO_COMPANY[key].name, period_month: m.period_month,
    year: NOW_YEAR - 1, month: m.month,
    active_assignments: m.client_count * 3, active_consultants: m.client_count * 2,
    revenue: money(m.revenue), pay_cost: money(m.expense * 0.84),
    employer_fed_tax: money(m.expense * 0.04), employer_local_tax: money(m.expense * 0.01),
    benefits_cost: money(m.total_hours * 0.01), expense_reimbursements: "0.00",
    total_expenses: money(m.expense), profit: money(m.gross_margin),
    margin_pct: money(m.margin_pct), total_bill_hours: String(m.total_hours),
    total_pay_hours: String(m.total_hours), rate_capped_rows: 0,
    gaps: { state_tax: false, wc: false, sick_leave: false, four_subs_cost: false, overhead: true, intercompany: true },
  }));
  return { rows, source_system: "demo_synthetic", transform_version: "demo" };
}
export function askSqlDemo() {
  return {
    sql: null,
    rationale: "This is a static showcase build with no database connected. The text-to-SQL assistant is disabled in the public demo; in the live system it generates read-only SELECT queries against the warehouse marts and returns explained results.",
    rows: [],
    column_names: [],
    error: null,
    model_id: "demo",
    took_ms: 0,
    rows_returned: 0,
  };
}
