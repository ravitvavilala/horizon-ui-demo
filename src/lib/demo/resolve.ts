/**
 * Demo path resolver — PUBLIC SHOWCASE BUILD.
 *
 * Maps every backend path the UI calls to a fabricated payload from
 * dataset.ts. Active only when NEXT_PUBLIC_DEMO_MODE=1. No network, no DB.
 *
 * Return types are intentionally `unknown`-cast at the call site in api.ts;
 * the shapes here mirror the Pydantic responses the real backend would send.
 */
import * as D from "./dataset";

const num = (v: string | null, dflt: number): number => {
  const n = v == null ? NaN : Number(v);
  return Number.isFinite(n) ? n : dflt;
};

function companyFromSeg(seg: string): D.CompanyKey {
  return seg === "smartworks" ? "smartworks" : "itech";
}

export function demoResolve(rawPath: string): unknown {
  const [pathname, query = ""] = rawPath.split("?");
  const p = new URLSearchParams(query);
  const seg = pathname.split("/").filter(Boolean); // e.g. ["read","itech","headline"]
  const year = num(p.get("year"), D.NOW_YEAR);
  const limit = num(p.get("limit"), 500);

  const scope = seg[1]; // after "read"

  // ── Per-company routes: /read/{itech|smartworks}/... ─────────────────────
  if (scope === "itech" || scope === "smartworks") {
    const key = companyFromSeg(scope);
    const res = seg[2];

    if (res === "years") return { years: D.DEMO_YEARS };
    if (res === "headline") return D.headline(key, year);
    if (res === "monthly") return { year, months: D.monthly(key, year) };
    if (res === "lifetime") return lifetime(key);
    if (res === "channels") return { year, channels: D.channels(key, year) };
    if (res === "waterfall")
      return D.waterfall(key, year, p.get("channel") ?? "");
    if (res === "customers") {
      const month = p.get("month") ? num(p.get("month"), 0) : null;
      return { year, month, rows: D.customers(key, year, month) };
    }
    if (res === "vendors")
      return { year, total: D.vendors(key, year).length, rows: D.vendors(key, year, limit) };
    if (res === "consultants") {
      const cohort = (p.get("cohort") as "all" | "w2" | "subvendor") ?? "all";
      const rows = D.consultants(key, year, cohort, limit);
      return { year, cohort, total: rows.length, rows };
    }
    if (res === "clients") {
      const masterId = seg[3] ? decodeURIComponent(seg[3]) : null;
      if (masterId && seg[4] === "lifetime") return clientLifetime(key, masterId);
      if (masterId) return D.clientDetail(key, masterId, year);
      const rows = D.clients(key, year, limit);
      return { year, total: rows.length, rows };
    }
    if (res === "ar") {
      const sub = seg[3];
      if (sub === "term-aging") return D.arTermAging(key);
      if (sub === "monthly") return { year, rows: D.arMonthly(key, year) };
      if (sub === "aging") return arAging(key);
    }
  }

  // ── /read/combined/headline ──────────────────────────────────────────────
  if (scope === "combined" && seg[2] === "headline")
    return D.combinedHeadline(p.get("window") ?? "ytd");

  // ── /read/companies/... ──────────────────────────────────────────────────
  if (scope === "companies") {
    if (seg[2] === "breakdown") return companiesBreakdown(p.get("window") ?? "ytd");
    if (seg[3] === "top-clients") {
      const key = seg[2] === "b" ? "smartworks" : "itech";
      return topClients(key as D.CompanyKey, limit);
    }
  }

  // ── /read/profit/... ─────────────────────────────────────────────────────
  if (scope === "profit") {
    const res = seg[2];
    if (res === "company") {
      const sc = p.get("source_company") ?? "a";
      return D.companyConsolidated(D.codeToKey(sc));
    }
    if (res === "consolidated") return D.companyConsolidated("itech");
    if (res === "vendors") return D.vendorsSummary("itech");
    if (res === "vendors-monthly") return D.vendorsMonthlyAll("itech");
    if (res === "vendor") return D.vendorMonthly("itech", decodeURIComponent(seg[3] ?? ""));
    if (res === "consultant-detail") return D.consultantDetailLegacy(num(seg[3], 0));
    if (res === "v3" && seg[3] === "consultant") return D.consultantDetailV3(num(seg[4], 0));
    if (res === "v2" && seg[3] === "consultant") return D.consultantDetailV2(num(seg[4], 0));
    if (res === "v2" && seg[3] === "trend") return D.v2Trend(num(p.get("months"), 12));
  }

  // ── /read/ar/... ─────────────────────────────────────────────────────────
  if (scope === "ar") {
    if (seg[2] === "summary") return D.arSummary(year);
    if (seg[2] === "by-client") {
      const key = D.codeToKey(p.get("source_company") ?? "a");
      return D.arByClient(key, year, limit);
    }
  }

  // ── /read/briefing/morning ───────────────────────────────────────────────
  if (scope === "briefing") return D.briefing();

  // Unknown path → permissive empty shape so nothing in the UI throws.
  return {
    rows: [], months: [], accounts: [], channels: [], companies: [],
    clients: [], steps: [], lines: [], years: D.DEMO_YEARS, total: 0,
    totals: {}, found: false,
  };
}

export function demoResolvePost(rawPath: string, _body?: unknown): unknown {
  void _body;
  if (rawPath.startsWith("/read/chat/sql")) return D.askSqlDemo();
  return { rows: [], error: null };
}

// ── Derived helpers ──────────────────────────────────────────────────────
function lifetime(key: D.CompanyKey) {
  const months = [...D.DEMO_YEARS]
    .sort((a, b) => a - b)
    .flatMap((y) =>
      D.monthly(key, y).map((m) => ({
        period_month: m.period_month, year: y, total_hours: m.total_hours,
        revenue: m.revenue, expense: m.expense, gross_margin: m.gross_margin,
        margin_pct: m.margin_pct,
      })),
    );
  return { row_count: months.length, months };
}
function clientLifetime(key: D.CompanyKey, masterId: string) {
  const months = [...D.DEMO_YEARS]
    .sort((a, b) => a - b)
    .flatMap((y) => {
      const d = D.clientDetail(key, masterId, y);
      if (!d.found || !d.monthly) return [];
      return d.monthly.map((m) => ({
        period_month: m.period_month, year: y, total_hours: m.total_hours,
        revenue: m.revenue, expense: m.expense, gross_margin: m.gross_margin,
        margin_pct: m.margin_pct,
      }));
    });
  return { client_master_id: masterId, row_count: months.length, months };
}
function arAging(key: D.CompanyKey) {
  const t = D.arTermAging(key);
  return {
    totals: {
      outstanding: t.totals.ar_balance, current: t.totals.current_amt,
      d31_60: t.totals.overdue_31_60, d61_90: t.totals.overdue_60_plus,
      d90_plus: 0, dso_days: t.totals.dso_days,
    },
    clients: t.accounts.map((a) => ({
      client_name: a.billto_name, outstanding: a.ar_balance, current: a.current,
      d31_60: a.overdue_31_60, d61_90: a.overdue_60_plus, d90_plus: 0,
    })),
  };
}
type Seg = { consultants: number; revenue: number; expense: number; employer_tax: number; profit: number; margin_pct: number };
function companiesBreakdown(window: string) {
  const c = D.combinedHeadline(window);
  const scaleBy = (frac: number) => (o: Seg): Seg => ({
    consultants: Math.round(o.consultants * frac),
    revenue: +(o.revenue * frac).toFixed(2),
    expense: +(o.expense * frac).toFixed(2),
    employer_tax: +(o.employer_tax * frac).toFixed(2),
    profit: +(o.profit * frac).toFixed(2),
    margin_pct: o.margin_pct,
  });
  return {
    window,
    companies: (["itech", "smartworks"] as D.CompanyKey[]).map((key) => {
      const s = scaleBy(key === "itech" ? 1 : 0.33);
      return {
        source_company: D.keyToCode(key),
        w2: s(c.w2), subvendor: s(c.subvendor), total: s(c.combined),
      };
    }),
  };
}
function topClients(key: D.CompanyKey, limit: number) {
  const rows = D.clients(key, D.NOW_YEAR - 1, limit).map((c) => ({
    client_name: c.client_name, drill_client_id: c.client_id,
    engagement_count: c.consultant_count, w2_consultants: Math.round(c.consultant_count * 0.6),
    w2_revenue: +(c.revenue * 0.58).toFixed(2), sub_consultants: Math.round(c.consultant_count * 0.4),
    sub_revenue: +(c.revenue * 0.42).toFixed(2), total_revenue: c.revenue,
    total_expense: c.expense, total_profit: c.gross_margin, total_margin_pct: c.margin_pct,
  }));
  return { source_company: D.keyToCode(key), window: "ytd", total: rows.length, rows };
}
