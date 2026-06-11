/**
 * Horizon API client - typed wrappers around backend/api/routes/*.
 *
 * Every response shape mirrors the Pydantic schemas in
 * backend/api/schemas.py. Keep in sync by hand until we wire an
 * OpenAPI codegen step (next iteration).
 */

export const API_BASE = "";

// PUBLIC SHOWCASE BUILD — always on in this repo. The client never makes a
// network request; every call is served from a fabricated, self-contained
// dataset (src/lib/demo). There is no backend and no database in this build.
export const DEMO = true;

// Dev stub - real JWT lands when backend auth ships. Header matches
// backend.api.deps.require_reader.
const DEFAULT_HEADERS: HeadersInit = {
  "x-horizon-role": "reader",
};

export type GapFlags = {
  state_tax: boolean;
  wc: boolean;
  sick_leave: boolean;
  four_subs_cost: boolean;
  overhead: boolean;
  intercompany: boolean;
};

export type BriefingLine = {
  kind: "headline" | "alert" | "note";
  text: string;
};

export type BriefingResponse = {
  as_of: string;
  combined_mtd_revenue: string;
  combined_mtd_profit: string;
  combined_mtd_margin_pct: string;
  lines: BriefingLine[];
  gaps: GapFlags;
};

export type ProfitRow = {
  entity: string;
  period_month: string;
  year: number;
  month: number;
  active_assignments: number;
  active_consultants: number;
  revenue: string;
  pay_cost: string;
  employer_fed_tax: string;
  employer_local_tax: string;
  benefits_cost: string;
  expense_reimbursements: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
  total_bill_hours: string;
  total_pay_hours: string;
  rate_capped_rows: number;
  gaps: GapFlags;
};

export type ConsolidatedResponse = {
  rows: ProfitRow[];
  source_system: string;
  transform_version: string;
};

async function apiGet<T>(path: string): Promise<T> {
  if (DEMO) {
    const { demoResolve } = await import("./demo/resolve");
    return demoResolve(path) as T;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    headers: DEFAULT_HEADERS,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`GET ${path} -> ${res.status}: ${body}`);
  }
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  if (DEMO) {
    const { demoResolvePost } = await import("./demo/resolve");
    return demoResolvePost(path, body) as T;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...DEFAULT_HEADERS,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`POST ${path} -> ${res.status}: ${text}`);
  }
  return (await res.json()) as T;
}

export type AskSqlMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AskSqlRequest = {
  question: string;
  history?: AskSqlMessage[];
  max_rows?: number;
};

export type AskSqlResponse = {
  sql: string | null;
  rationale: string;
  rows: Array<Record<string, unknown>>;
  column_names: string[];
  error: string | null;
  model_id: string;
  took_ms: number;
  rows_returned: number;
};

export type ConsultantSummaryRow = {
  consultant_id: number;
  source_company: string;
  first_name: string | null;
  last_name: string | null;
  employment_type: string | null;
  is_active: boolean;
  status: string | null;
  city: string | null;
  state: string | null;
  hire_date: string | null;
  termination_date: string | null;
  client_name: string | null;
  position_title: string | null;
  branch: string | null;
  line_of_business: string | null;
  revenue: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
  total_bill_hours: string;
  last_period: string | null;
};

export type ConsultantSummaryResponse = {
  rows: ConsultantSummaryRow[];
  since: string | null;
  until: string | null;
  total: number;
  transform_version: string;
};

export type ConsultantProfitRow = {
  consultant_id: number;
  source_company: string;
  assignment_id: number | null;
  client_id: number | null;
  period_ending: string;
  employment_type: string;
  consultant_first_name: string | null;
  consultant_last_name: string | null;
  client_name: string | null;
  position_title: string | null;
  line_of_business: string | null;
  branch: string | null;
  revenue: string;
  total_bill_hours: string;
  pay_cost: string;
  total_pay_hours: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
};

export type ConsultantDetailResponse = {
  consultant_id: number;
  source_company: string;
  first_name: string | null;
  last_name: string | null;
  employment_type: string | null;
  is_active: boolean;
  status: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  hire_date: string | null;
  termination_date: string | null;
  pay_type: string | null;
  pay_period: string | null;
  client_name: string | null;
  position_title: string | null;
  branch: string | null;
  line_of_business: string | null;
  revenue: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
  total_bill_hours: string;
  total_pay_hours: string;
  history: ConsultantProfitRow[];
};

export type ClientSummaryRow = {
  source_company: string;
  client_id: number;
  client_name: string;
  active_consultants: number;
  active_assignments: number;
  revenue: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
  total_bill_hours: string;
  last_period: string | null;
};

export type ClientSummaryResponse = {
  rows: ClientSummaryRow[];
  since: string | null;
  until: string | null;
  total: number;
  transform_version: string;
};

export type ClientMonthlyRow = {
  source_company: string;
  client_id: number;
  client_name: string;
  period_month: string;
  year: number;
  month: number;
  active_consultants: number;
  active_assignments: number;
  revenue: string;
  total_expenses: string;
  profit: string;
  margin_pct: string;
  total_bill_hours: string;
};

export type ClientMonthlyResponse = {
  rows: ClientMonthlyRow[];
  source_system: string;
  transform_version: string;
};

export type V2Headline = {
  rows: number;
  consultants: number;
  revenue: number;
  total_expenses: number;
  profit: number;
  margin_pct: number;
  iprise_rows: number;
  fallback_rows: number;
  since: string | null;
};

export type V2ConsultantRow = {
  source_company: string;
  consultant_id: number;
  first_name: string | null;
  last_name: string | null;
  employment_type: string | null;
  client_name: string | null;
  revenue: number;
  total_expenses: number;
  profit: number;
  margin_pct: number;
  expense_source: "iprise_payment_summary" | "ultrastaff_v1" | "mixed";
  iprise_periods: number;
  fallback_periods: number;
};

export type V2ConsultantsResponse = {
  rows: V2ConsultantRow[];
  transform_version: string;
};

export type EmploymentTypeRow = {
  employment_type: string;
  consultants: number;
  revenue: string;
  cost: string;
  profit: string;
  margin_pct: string;
  notes: string;
};

export type EmploymentTypeBreakdown = {
  rows: EmploymentTypeRow[];
  since: string | null;
  until: string | null;
  transform_version: string;
};

export type VendorSummaryRow = {
  vendor_name: string;
  billable_consultants: number;
  bills_count: number;
  revenue: string;
  cost: string;
  gross_margin: string;
  margin_pct: string;
  match_rate_pct: string;
};

export type VendorSummaryResponse = {
  rows: VendorSummaryRow[];
  since: string | null;
  until: string | null;
  transform_version: string;
};

export type VendorProfitRow = {
  period_month: string;
  vendor_name: string;
  billable_consultants: number;
  bills_count: number;
  bill_lines_count: number;
  matched_lines: number;
  unmatched_lines: number;
  revenue: string;
  cost: string;
  cost_matched: string;
  cost_unmatched: string;
  gross_margin: string;
  margin_pct: string;
  match_rate_pct: string;
  gap_unmatched_consultants: boolean;
};

export type VendorProfitResponse = {
  rows: VendorProfitRow[];
  source_system: string;
  transform_version: string;
};

export const api = {
  getMorningBriefing: () =>
    apiGet<BriefingResponse>("/read/briefing/morning"),
  getConsolidated: (params?: {
    entity?: "a" | "b" | "combined";
    since?: string;
    until?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.entity) qs.set("entity", params.entity);
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    const q = qs.toString();
    return apiGet<ConsolidatedResponse>(
      `/read/profit/consolidated${q ? `?${q}` : ""}`,
    );
  },
  getCompany: (params: {
    source_company: "a" | "b";
    since?: string;
    until?: string;
  }) => {
    const qs = new URLSearchParams();
    qs.set("source_company", params.source_company);
    if (params.since) qs.set("since", params.since);
    if (params.until) qs.set("until", params.until);
    return apiGet<ConsolidatedResponse>(
      `/read/profit/company?${qs.toString()}`,
    );
  },
  getVendorsSummary: (params?: {
    since?: string;
    until?: string;
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiGet<VendorSummaryResponse>(
      `/read/profit/vendors${q ? `?${q}` : ""}`,
    );
  },

  getVendorsMonthly: (params?: { since?: string; until?: string }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    const q = qs.toString();
    return apiGet<{
      rows: { period_month: string; spend: number; revenue: number }[];
    }>(`/read/profit/vendors-monthly${q ? `?${q}` : ""}`);
  },
  getConsultants: (params?: {
    since?: string;
    until?: string;
    q?: string;
    employment_type?: "3P/I" | "2HOURLY" | "4Subs" | "1SALARY" | "3P/S";
    source_company?: "a" | "b";
    sort?: "revenue" | "profit" | "margin" | "name" | "hire_date" | "last_period";
    direction?: "asc" | "desc";
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    if (params?.q) qs.set("q", params.q);
    if (params?.employment_type) qs.set("employment_type", params.employment_type);
    if (params?.source_company) qs.set("source_company", params.source_company);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.direction) qs.set("direction", params.direction);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiGet<ConsultantSummaryResponse>(
      `/read/profit/consultants${q ? `?${q}` : ""}`,
    );
  },
  getConsultantDetail: (consultantId: number) =>
    apiGet<ConsultantDetailResponse>(
      `/read/profit/consultant-detail/${consultantId}`,
    ),
  getClients: (params?: {
    since?: string;
    until?: string;
    q?: string;
    source_company?: "a" | "b";
    sort?: "revenue" | "profit" | "margin" | "consultants" | "last_period";
    direction?: "asc" | "desc";
    limit?: number;
  }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    if (params?.q) qs.set("q", params.q);
    if (params?.source_company) qs.set("source_company", params.source_company);
    if (params?.sort) qs.set("sort", params.sort);
    if (params?.direction) qs.set("direction", params.direction);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiGet<ClientSummaryResponse>(
      `/read/profit/clients${q ? `?${q}` : ""}`,
    );
  },
  getClientMonthly: (
    sourceCompany: "a" | "b",
    clientId: number,
    params?: { since?: string; until?: string },
  ) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    const q = qs.toString();
    return apiGet<ClientMonthlyResponse>(
      `/read/profit/client/${sourceCompany}/${clientId}${q ? `?${q}` : ""}`,
    );
  },
  getV2Headline: (since?: string) => {
    const qs = new URLSearchParams();
    if (since) qs.set("since", since);
    const q = qs.toString();
    return apiGet<V2Headline>(`/read/profit/v2/headline${q ? `?${q}` : ""}`);
  },
  getV2Trend: (params?: { months?: number; since?: string }) => {
    const qs = new URLSearchParams();
    if (params?.months) qs.set("months", String(params.months));
    if (params?.since) qs.set("since", params.since);
    const q = qs.toString();
    return apiGet<{
      rows: Array<{
        period_ending: string;
        revenue: number;
        total_expenses: number;
        profit: number;
        margin_pct: number;
      }>;
      since: string;
    }>(`/read/profit/v2/trend${q ? `?${q}` : ""}`);
  },
  getV2ConsultantDetail: (consultantId: number) =>
    apiGet<{
      consultant_id: number;
      first_name: string | null;
      last_name: string | null;
      client_name: string | null;
      position_title: string | null;
      employment_type: string | null;
      source_company: string;
      total_revenue: number;
      total_expenses: number;
      total_profit: number;
      total_margin_pct: number;
      iprise_periods: number;
      fallback_periods: number;
      rates: Array<{
        assignment_id: string;
        job_wc_code: string;
        pay_type: string;
        bill_rate: number;
        pay_rate: number;
        volume_discount_rate: number;
        referral_rate: number;
        admin_rate: number;
        net_bill_rate: number;
        spread: number;
        spread_pct: number;
        total_billed_hours: number;
        actual_billed_amounts: number;
        is_active: boolean;
      }>;
      periods: Array<{
        period_month: string;
        revenue: number;
        total_expenses: number;
        profit: number;
        margin_pct: number;
        expense_source: "iprise_payment_summary" | "ultrastaff_v1";
        expense_ultrastaff_v1: number;
        expense_iprise_gross: number | null;
        iprise_payment_rows: number;
        gap_iprise_fallback_pi: boolean;
      }>;
    }>(`/read/profit/v2/consultant/${consultantId}`),
  getV3ConsultantDetail: (consultantId: number) =>
    apiGet<{
      consultant_id: number;
      first_name: string | null;
      last_name: string | null;
      employment_type: string | null;
      job_wc_code: string | null;
      source_company: string;
      is_active: boolean | null;
      status: string | null;
      totals: {
        gross_revenue: number;
        discounts: number;
        adjustments: number;
        revenue: number;
        expense: number;
        employer_tax: number;
        profit: number;
        margin_pct: number;
      };
      coverage: {
        payment_summary_periods: number;
        archive_periods: number;
        gap_periods: number;
        total_periods: number;
      };
      periods: Array<{
        period_month: string;
        gross_revenue: number;
        discounts: number;
        adjustments: number;
        revenue: number;
        expense: number;
        employer_tax: number;
        profit: number;
        margin_pct: number;
        bill_hours: number;
        pay_hours: number;
        invoice_count: number;
        assignment_count: number;
        _revenue_source: string;
        _expense_source: string;
      }>;
    }>(`/read/profit/v3/consultant/${consultantId}`),
  getV3Headline: () =>
    apiGet<{
      rows: number;
      consultants: number;
      revenue: number;
      expense: number;
      profit: number;
      margin_pct: number;
      payment_summary_rows: number;
      archive_rows: number;
      gap_rows: number;
    }>(`/read/profit/v3/headline`),

  // ── Phase 4: split routes ────────────────────────────────────────
  getSplitHeadline: (
    business: "w2" | "subvendor",
    window: "lifetime" | "ytd" | "l12m" = "lifetime",
  ) =>
    apiGet<{
      business_line: string;
      window: string;
      consultants: number;
      revenue: number;
      expense: number;
      employer_tax: number;
      profit: number;
      margin_pct: number;
      gap_rows: number;
      rows: number;
    }>(`/read/${business}/headline?window=${window}`),

  getCombinedHeadline: (
    window: "lifetime" | "ytd" | "l12m" = "lifetime",
  ) =>
    apiGet<{
      window: string;
      w2: {
        consultants: number; revenue: number; expense: number;
        employer_tax: number; profit: number; margin_pct: number;
        gap_rows: number; rows: number;
      };
      subvendor: {
        consultants: number; revenue: number; expense: number;
        employer_tax: number; profit: number; margin_pct: number;
        gap_rows: number; rows: number;
      };
      combined: {
        consultants: number; revenue: number; expense: number;
        employer_tax: number; profit: number; margin_pct: number;
      };
    }>(`/read/combined/headline?window=${window}`),

  getSplitConsultants: (
    business: "w2" | "subvendor",
    params?: { since?: string; isActive?: boolean; sourceCompany?: "a" | "b"; limit?: number },
  ) => {
    const q = new URLSearchParams();
    if (params?.since) q.set("since", params.since);
    if (params?.isActive !== undefined) q.set("is_active", String(params.isActive));
    if (params?.sourceCompany) q.set("source_company", params.sourceCompany);
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{
      business_line: string;
      total: number;
      rows: Array<{
        consultant_id: number;
        source_company: string;
        first_name: string | null;
        last_name: string | null;
        job_wc_code: string | null;
        is_active: boolean;
        revenue: number;
        expense: number;
        profit: number;
        margin_pct: number;
      }>;
    }>(`/read/${business}/consultants?${q.toString()}`);
  },

  getSplitClients: (
    business: "w2" | "subvendor",
    params?: { since?: string; limit?: number },
  ) => {
    const q = new URLSearchParams();
    if (params?.since) q.set("since", params.since);
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{
      business_line: string;
      total: number;
      rows: Array<{
        client_id: number;
        source_company: string;
        client_name: string;
        active_consultants: number;
        revenue: number;
        expense: number;
        profit: number;
        margin_pct: number;
      }>;
    }>(`/read/${business}/clients?${q.toString()}`);
  },

  getSubvendorVendors: (params?: { since?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.since) q.set("since", params.since);
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{
      total: number;
      rows: Array<{
        vendor_name: string;
        billable_consultants: number;
        revenue: number;
        cost_archive_header: number;
        cost_qb_crosscheck: number;
        gross_margin: number;
        margin_pct: number;
      }>;
    }>(`/read/subvendor/vendors?${q.toString()}`);
  },

  // ── AR ───────────────────────────────────────────────────────────
  // 2026-05-20: AR endpoints now year-scoped (>= 2024). `year` defaults
  // server-side to current year; caller may override.
  getArSummary: (year?: number) =>
    apiGet<{
      year?: number;
      companies: Array<{
        source_company: string;
        invoice_count: number;
        paid_count: number;
        unpaid_count: number;
        billed_total: number;
        received_total: number;
        outstanding_total: number;
        outstanding_0_30: number;
        outstanding_31_60: number;
        outstanding_61_90: number;
        outstanding_90_plus: number;
        dso_weighted_paid: number;
        collected_pct: number;
        billed_l12m: number;
        received_l12m: number;
        outstanding_l12m: number;
        collected_pct_l12m: number;
      }>;
    }>(`/read/ar/summary${year ? `?year=${year}` : ""}`),

  getArByClient: (params?: { sourceCompany?: "a" | "b"; year?: number; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.sourceCompany) q.set("source_company", params.sourceCompany);
    if (params?.year) q.set("year", String(params.year));
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{
      year?: number;
      total: number;
      rows: Array<{
        source_company: string;
        client_id: number;
        client_master_id?: string;
        client_name: string;
        invoice_count: number;
        paid_count: number;
        unpaid_count: number;
        billed_total: number;
        received_total: number;
        outstanding_total: number;
        outstanding_0_30: number;
        outstanding_31_60: number;
        outstanding_61_90: number;
        outstanding_90_plus: number;
        dso_avg: number;
        collected_pct: number;
      }>;
    }>(`/read/ar/by-client?${q.toString()}`);
  },

  // ── Phase 6: per-company endpoints ─────────────────────────────
  getCompanyYears: (company: "itech" | "smartworks") =>
    apiGet<{ years: number[] }>(`/read/${company}/years`),

  getCompanyHeadline: (company: "itech" | "smartworks", year: number) =>
    apiGet<{
      year: number;
      company_code: string;
      company_name: string;
      client_count: number;
      consultant_count_sum: number;
      total_hours: number;
      revenue: number;
      expense: number;
      gross_margin: number;
      margin_pct: number;
      _pnl_source?: string | null;
      closed_through_year?: number | null;
      closed_through_month?: number | null;
    }>(`/read/${company}/headline?year=${year}`),

  getCompanyMonthly: (company: "itech" | "smartworks", year: number) =>
    apiGet<{
      year: number;
      months: Array<{
        period_month: string;
        total_hours: number;
        revenue: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
        client_count: number;
        billing_days: number | null;
        revenue_per_billing_day: number | null;
      }>;
    }>(`/read/${company}/monthly?year=${year}`),

  getCompanyArMonthly: (company: "itech" | "smartworks", year: number) =>
    apiGet<{
      year: number;
      rows: Array<{
        month: number;
        period_month: string;
        billed: number;
        received: number;
        outstanding: number;
        billing_days: number | null;
        billed_per_day: number | null;
      }>;
    }>(`/read/${company}/ar/monthly?year=${year}`),

  getCompanyArAging: (company: "itech" | "smartworks", limit: number = 200) =>
    apiGet<{
      totals: {
        outstanding: number;
        current: number;
        d31_60: number;
        d61_90: number;
        d90_plus: number;
        dso_days: number | null;
      };
      clients: Array<{
        client_name: string;
        outstanding: number;
        current: number;
        d31_60: number;
        d61_90: number;
        d90_plus: number;
      }>;
    }>(`/read/${company}/ar/aging?limit=${limit}`),

  // Finance's the staffing system "Summary Term Aging" report, replicated.
  // Cash-application basis (partial payments visible), aged by terms
  // due date. ar_balance = transaction_balance + cash_on_acct.
  getCompanyArTermAging: (
    company: "itech" | "smartworks",
    limit: number = 500,
  ) =>
    apiGet<{
      totals: {
        ar_balance: number;
        cash_on_acct: number;
        transaction_balance: number;
        current_amt: number;
        overdue_0_30: number;
        overdue_31_60: number;
        overdue_60_plus: number;
        dso_days: number | null;
      };
      accounts: Array<{
        billto_number: number;
        billto_name: string;
        ar_balance: number;
        cash_on_acct: number;
        transaction_balance: number;
        current: number;
        overdue_0_30: number;
        overdue_31_60: number;
        overdue_60_plus: number;
        last_payment_date: string | null;
      }>;
    }>(`/read/${company}/ar/term-aging?limit=${limit}`),

  getCompanyClients: (
    company: "itech" | "smartworks",
    year: number,
    limit: number = 500,
  ) =>
    apiGet<{
      year: number;
      total: number;
      rows: Array<{
        client_master_id: string;
        client_name: string;
        consultant_count: number;
        total_hours: number;
        revenue: number;
        us_pay_expense: number;
        referral_expense: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
        cost_pending_qb: boolean;
        ar_invoices: number;
        ar_billed: number;
        ar_received: number;
        ar_outstanding: number;
      }>;
    }>(`/read/${company}/clients?year=${year}&limit=${limit}`),

  getCompanyClientDetail: (
    company: "itech" | "smartworks",
    masterId: string,
    year: number,
  ) =>
    apiGet<{
      found: boolean;
      year?: number;
      client_master_id?: string;
      client_name?: string;
      consultant_count?: number;
      total_hours?: number;
      revenue?: number;
      us_pay_expense?: number;
      referral_expense?: number;
      expense?: number;
      gross_margin?: number;
      margin_pct?: number;
      cost_pending_qb?: boolean;
      ar_invoices?: number;
      ar_billed?: number;
      ar_received?: number;
      ar_outstanding?: number;
      monthly?: Array<{
        period_month: string;
        total_hours: number;
        revenue: number;
        us_pay_expense?: number;
        referral_expense?: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
      }>;
    }>(`/read/${company}/clients/${encodeURIComponent(masterId)}?year=${year}`),

  getCompanyClientLifetime: (
    company: "itech" | "smartworks",
    masterId: string,
  ) =>
    apiGet<{
      client_master_id: string;
      row_count: number;
      months: Array<{
        period_month: string;
        year: number;
        total_hours: number;
        revenue: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
      }>;
    }>(
      `/read/${company}/clients/${encodeURIComponent(masterId)}/lifetime`,
    ),

  getCompanyLifetime: (company: "itech" | "smartworks") =>
    apiGet<{
      row_count: number;
      months: Array<{
        period_month: string;
        year: number;
        total_hours: number;
        revenue: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
      }>;
    }>(`/read/${company}/lifetime`),

  getCompanyConsultants: (
    company: "itech" | "smartworks",
    year: number,
    cohort: "all" | "w2" | "subvendor" = "all",
    limit: number = 500,
  ) =>
    apiGet<{
      year: number;
      cohort: string;
      total: number;
      rows: Array<{
        consultant_master_id: string;
        consultant_id: number | null;
        first_name: string | null;
        last_name: string | null;
        employment_type: string;
        job_wc_code: string | null;
        is_active: boolean;
        total_hours: number;
        revenue: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
        cost_pending_qb: boolean;
        assignments_count: number;
      }>;
    }>(`/read/${company}/consultants?year=${year}&cohort=${cohort}&limit=${limit}`),

  getCompanyCustomers: (
    company: "itech" | "smartworks",
    year: number,
    month?: number | null,
  ) =>
    apiGet<{
      year: number;
      month: number | null;
      rows: Array<{
        msp_channel: string;
        consultant_count: number;
        revenue: number;
        cost: number;
        margin: number;
        recon_margin: number;
        msp_fee: number;
        margin_pct: number;
        recon_margin_pct: number;
      }>;
    }>(
      `/read/${company}/customers?year=${year}${month ? `&month=${month}` : ""}`,
    ),

  getCompanyWaterfall: (
    company: "itech" | "smartworks",
    year: number,
    channel: string = "",
  ) =>
    apiGet<{
      year: number;
      channel: string | null;
      bill: number;
      margin: number;
      margin_pct: number;
      steps: Array<{ key: string; label: string; amount: number }>;
    }>(
      `/read/${company}/waterfall?year=${year}&channel=${encodeURIComponent(channel)}`,
    ),

  getCompanyChannels: (company: "itech" | "smartworks", year: number) =>
    apiGet<{
      year: number;
      channels: Array<{ name: string; revenue: number }>;
    }>(`/read/${company}/channels?year=${year}`),

  getCompanyVendors: (
    company: "itech" | "smartworks",
    year: number,
    limit: number = 500,
  ) =>
    apiGet<{
      year: number;
      total: number;
      rows: Array<{
        vendor_name: string;
        consultant_count: number;
        total_hours: number;
        revenue: number;
        expense: number;
        gross_margin: number;
        margin_pct: number;
      }>;
    }>(`/read/${company}/vendors?year=${year}&limit=${limit}`),

  getCompaniesBreakdown: (window: "lifetime" | "ytd" | "l12m" = "ytd") =>
    apiGet<{
      window: string;
      companies: Array<{
        source_company: string;
        w2: {
          consultants: number; revenue: number; expense: number;
          employer_tax: number; profit: number; margin_pct: number;
        };
        subvendor: {
          consultants: number; revenue: number; expense: number;
          employer_tax: number; profit: number; margin_pct: number;
        };
        total: {
          consultants: number; revenue: number; expense: number;
          employer_tax: number; profit: number; margin_pct: number;
        };
      }>;
    }>(`/read/companies/breakdown?window=${window}`),

  getCompanyTopClients: (
    sourceCompany: "a" | "b",
    params?: { window?: "lifetime" | "ytd" | "l12m"; limit?: number },
  ) => {
    const q = new URLSearchParams();
    if (params?.window) q.set("window", params.window);
    if (params?.limit) q.set("limit", String(params.limit));
    return apiGet<{
      source_company: string;
      window: string;
      total: number;
      rows: Array<{
        client_name: string;
        drill_client_id: number;
        engagement_count: number;
        w2_consultants: number;
        w2_revenue: number;
        sub_consultants: number;
        sub_revenue: number;
        total_revenue: number;
        total_expense: number;
        total_profit: number;
        total_margin_pct: number;
      }>;
    }>(`/read/companies/${sourceCompany}/top-clients?${q.toString()}`);
  },

  getArOneClient: (sourceCompany: "a" | "b", clientId: number) =>
    apiGet<{
      found: boolean;
      source_company?: string;
      client_id?: number;
      client_name?: string;
      invoice_count?: number;
      paid_count?: number;
      unpaid_count?: number;
      billed_total?: number;
      received_total?: number;
      outstanding_total?: number;
      outstanding_0_30?: number;
      outstanding_31_60?: number;
      outstanding_61_90?: number;
      outstanding_90_plus?: number;
      dso_avg?: number;
      collected_pct?: number;
    }>(`/read/ar/client/${sourceCompany}/${clientId}`),
  getV2Consultants: (params?: { since?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.limit) qs.set("limit", String(params.limit));
    const q = qs.toString();
    return apiGet<V2ConsultantsResponse>(
      `/read/profit/v2/consultants-summary${q ? `?${q}` : ""}`,
    );
  },
  getEmploymentBreakdown: (params?: { since?: string; until?: string }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    const q = qs.toString();
    return apiGet<EmploymentTypeBreakdown>(
      `/read/profit/breakdown/employment-type${q ? `?${q}` : ""}`,
    );
  },
  askSql: (body: AskSqlRequest) =>
    apiPost<AskSqlResponse>("/read/chat/sql", body),
  getVendorMonthly: (vendorName: string, params?: {
    since?: string;
    until?: string;
  }) => {
    const qs = new URLSearchParams();
    if (params?.since) qs.set("since", params.since);
    if (params?.until) qs.set("until", params.until);
    const q = qs.toString();
    return apiGet<VendorProfitResponse>(
      `/read/profit/vendor/${encodeURIComponent(vendorName)}${q ? `?${q}` : ""}`,
    );
  },
};
